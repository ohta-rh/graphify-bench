/**
 * Role changes and the last-owner invariant.
 *
 * Owner C implements `@/server/services/member-service`.
 */
import { describe, it } from "vitest";

describe("services/member-service", () => {
  // can(actor, "member:update_role", …) gates the change; a member cannot self-promote.
  it.todo("refuses a role change to an actor without member:update_role");

  // The org must always retain at least one owner.
  it.todo("refuses to demote the last remaining owner");

  // Demoting an owner is fine while another owner exists.
  it.todo("allows demoting an owner when another owner remains");

  // member.role_changed carries both the previous and the new role.
  it.todo("emits member.role_changed with from and to");

  // Removing the last owner is refused for the same invariant.
  it.todo("refuses to remove the last remaining owner");

  // member.removed carries the memberId and userId that left.
  it.todo("emits member.removed when a member is removed");
});
