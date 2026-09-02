/**
 * Renders children only when `can()` allows the action.
 *
 * Owner B implements `@/components/domain/permission/permission-gate`.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PermissionGate } from "@/components/domain/permission/permission-gate";
import { organizationResource } from "@/components/domain/permission/resources";
import type { CommentId } from "@/types/common";
import { ORG_A, ORG_B, makeActor } from "../helpers/factories";

afterEach(cleanup);

describe("components/permission-gate", () => {
  // Children render when can(actor, action, resource) is true.
  it("renders its children when the action is allowed", () => {
    const actor = makeActor({ role: "admin" });

    render(
      <PermissionGate actor={actor} action="org:update" resource={organizationResource(ORG_A)}>
        <p>Secret settings</p>
      </PermissionGate>,
    );

    expect(screen.getByText("Secret settings")).toBeInTheDocument();
  });

  // Nothing renders when the action is denied and no fallback was given.
  it("renders nothing when the action is denied", () => {
    const actor = makeActor({ role: "viewer" });

    const { container } = render(
      <PermissionGate actor={actor} action="org:update" resource={organizationResource(ORG_A)}>
        <p>Secret settings</p>
      </PermissionGate>,
    );

    expect(screen.queryByText("Secret settings")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  // A supplied fallback renders in place of the children on denial.
  it("renders the fallback when the action is denied", () => {
    const actor = makeActor({ role: "viewer" });

    render(
      <PermissionGate
        actor={actor}
        action="org:update"
        resource={organizationResource(ORG_A)}
        fallback={<p>Ask an admin</p>}
      >
        <p>Secret settings</p>
      </PermissionGate>,
    );

    expect(screen.queryByText("Secret settings")).not.toBeInTheDocument();
    expect(screen.getByText("Ask an admin")).toBeInTheDocument();
  });

  // The gate calls can() rather than comparing actor.role itself.
  it("delegates the decision to can(), not to a role comparison", () => {
    // Ownership escalation: a member cannot delete comments by role rank alone,
    // but `can()` grants it when the actor authored the comment. A component
    // that compared `actor.role` itself would deny this.
    const actor = makeActor({ role: "member" });

    render(
      <PermissionGate
        actor={actor}
        action="comment:delete"
        resource={{ kind: "comment", orgId: ORG_A, commentId: "c1" as CommentId, authorId: actor.userId }}
      >
        <p>Delete comment</p>
      </PermissionGate>,
    );

    expect(screen.getByText("Delete comment")).toBeInTheDocument();
  });

  // A cross-tenant resource is denied, matching the library's own rule.
  it("denies a resource from another organization", () => {
    const actor = makeActor({ role: "owner", orgId: ORG_A });

    render(
      <PermissionGate actor={actor} action="org:read" resource={organizationResource(ORG_B)}>
        <p>Secret settings</p>
      </PermissionGate>,
    );

    expect(screen.queryByText("Secret settings")).not.toBeInTheDocument();
  });
});
