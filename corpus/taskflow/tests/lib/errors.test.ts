/** Domain-error to `AppErrorShape` mapping for every error class. */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  HTTP_STATUS_BY_CODE,
  fieldErrorsFromZod,
  isDomainError,
  toActionResult,
  toAppError,
} from "@/lib/errors";
import { FeatureDisabledError } from "@/lib/feature-flags";
import { PermissionDeniedError, explain } from "@/lib/permissions";
import { InvalidSlugError } from "@/lib/slug";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import type { OrgId } from "@/types/common";
import { makeActor, ORG_A, ORG_B } from "../helpers/factories";

const schema = z.object({
  title: z.string().min(3),
  estimate: z.number().int(),
});

function permissionError(): PermissionDeniedError {
  const actor = makeActor({ role: "viewer" });
  const resource = { kind: "organization", orgId: ORG_A } as const;
  return new PermissionDeniedError("org:delete", explain(actor, "org:delete", resource));
}

describe("lib/errors", () => {
  it("maps a permission denial to `forbidden` with the decision in meta", () => {
    const shape = toAppError(permissionError());
    expect(shape.code).toBe("forbidden");
    expect(shape.meta?.action).toBe("org:delete");
    expect(shape.meta?.reason).toBe("denied_by_role");
  });

  it("maps a tenant scope violation to `tenant_scope_violation`", () => {
    const shape = toAppError(new TenantScopeError(ORG_A, ORG_B));
    expect(shape.code).toBe("tenant_scope_violation");
    expect(shape.meta?.expectedOrgId).toBe(ORG_A);
    expect(shape.message).not.toContain(ORG_B as string);
  });

  it("maps a disabled feature to `forbidden` and names the flag", () => {
    const shape = toAppError(new FeatureDisabledError("webhooks"));
    expect(shape.code).toBe("forbidden");
    expect(shape.meta?.flag).toBe("webhooks");
  });

  it("maps double archiving to `conflict`", () => {
    const shape = toAppError(new AlreadyArchivedError("Issue", "01ISS"));
    expect(shape.code).toBe("conflict");
    expect(shape.meta?.entity).toBe("Issue");
  });

  it("maps an invalid slug to `validation_failed` with a slug field error", () => {
    const shape = toAppError(new InvalidSlugError("Admin!", "is reserved"));
    expect(shape.code).toBe("validation_failed");
    expect(shape.fieldErrors?.slug?.[0]).toContain("is reserved");
  });

  it("maps a ZodError to field errors keyed by dotted path", () => {
    const parsed = schema.safeParse({ title: "no", estimate: 1.5 });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const fields = fieldErrorsFromZod(parsed.error);
    expect(Object.keys(fields).sort()).toEqual(["estimate", "title"]);
    expect(toAppError(parsed.error).code).toBe("validation_failed");
  });

  it("falls back to `internal_error` for an unknown throw", () => {
    expect(toAppError(new Error("boom")).code).toBe("internal_error");
    expect(toAppError("boom").code).toBe("internal_error");
    expect(toAppError("boom").message).toContain("Something went wrong");
  });

  it("recognises exactly the domain error classes", () => {
    expect(isDomainError(permissionError())).toBe(true);
    expect(isDomainError(new TenantScopeError(ORG_A, ORG_B))).toBe(true);
    expect(isDomainError(new InvalidSlugError("x", "too short"))).toBe(true);
    expect(isDomainError(new Error("boom"))).toBe(false);
    expect(isDomainError(null)).toBe(false);
  });

  it("gives every error code an HTTP status", () => {
    for (const [code, status] of Object.entries(HTTP_STATUS_BY_CODE)) {
      expect(status, code).toBeGreaterThanOrEqual(400);
    }
    expect(HTTP_STATUS_BY_CODE.rate_limited).toBe(429);
    expect(HTTP_STATUS_BY_CODE.plan_limit_exceeded).toBe(402);
  });

  it("wraps a failure as an ActionResult, never throwing", () => {
    const result = toActionResult(new AlreadyArchivedError("Project", "01PRJ"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("conflict");
    expect(typeof result.submittedAt).toBe("string");
  });

  it("keeps a cross-tenant org id out of the user-facing message", () => {
    const other = "01HZZZDDDDDDDDDDDDDDDDDDDD" as OrgId;
    expect(toAppError(new TenantScopeError(ORG_A, other)).message).toBe(
      "That resource belongs to a different organization.",
    );
  });
});
