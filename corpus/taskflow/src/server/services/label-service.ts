/**
 * Label CRUD and the issue↔label assignment used by the picker.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope
 */
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as labelRepo from "@/server/repositories/label-repository";
import { orgResource } from "./_support";
import type { CreateLabelInput, UpdateLabelInput } from "@/schemas/label";
import type { LabelId, OrgId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";
import type { Actor } from "@/types/member";

/** Labels are org-wide metadata, so they follow the project permissions. */
export async function listLabels(
  actor: Actor,
  orgId: OrgId,
): Promise<readonly IssueLabel[]> {
  assertOrgScope(actor, orgId);
  assertCan(actor, "project:read", orgResource(orgId));
  return labelRepo.listLabels(orgId);
}

export async function createLabel(
  actor: Actor,
  input: CreateLabelInput,
): Promise<IssueLabel> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "project:update", orgResource(input.orgId));

  const existing = await labelRepo.listLabels(input.orgId);
  if (existing.some((label) => label.name === input.name)) {
    throw new Error(`A label named "${input.name}" already exists`);
  }

  return labelRepo.insertLabel(input);
}

export async function updateLabel(
  actor: Actor,
  input: UpdateLabelInput,
): Promise<IssueLabel> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "project:update", orgResource(input.orgId));
  return labelRepo.updateLabel(input);
}

/**
 * Deleting a label detaches it from every issue. That is a wider blast radius
 * than the other label writes, so it takes the archive permission.
 */
export async function deleteLabel(
  actor: Actor,
  orgId: OrgId,
  labelId: LabelId,
): Promise<void> {
  assertOrgScope(actor, orgId);
  assertCan(actor, "project:archive", orgResource(orgId));
  await labelRepo.deleteLabel(orgId, labelId);
}
