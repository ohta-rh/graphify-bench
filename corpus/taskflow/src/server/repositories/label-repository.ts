/**
 * Label rows and the issue↔label join table.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, issueLabels, labels } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { toLabel } from "./_mappers";
import type { CreateLabelInput, UpdateLabelInput } from "@/schemas/label";
import type { IssueId, LabelId, OrgId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";

export async function listLabels(
  orgId: OrgId,
): Promise<readonly IssueLabel[]> {
  const rows = getDb()
    .select()
    .from(labels)
    .where(orgPredicate(labels.orgId, orgId))
    .orderBy(asc(labels.name))
    .all();
  return rows.map(toLabel);
}

export async function insertLabel(
  input: CreateLabelInput,
): Promise<IssueLabel> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(labels)
    .values({
      id: newId(),
      orgId: input.orgId,
      name: input.name,
      color: input.color,
      description: input.description,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toLabel(row);
}

export async function updateLabel(
  input: UpdateLabelInput,
): Promise<IssueLabel> {
  const row = getDb()
    .update(labels)
    .set({
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.color === undefined ? {} : { color: input.color }),
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(
      and(orgPredicate(labels.orgId, input.orgId), eq(labels.id, input.labelId)),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Label ${input.labelId} not found`);
  return toLabel(row);
}

/** Labels are hard deleted; the join rows go with them. */
export async function deleteLabel(
  orgId: OrgId,
  labelId: LabelId,
): Promise<void> {
  const db = getDb();
  db.delete(issueLabels)
    .where(
      and(
        orgPredicate(issueLabels.orgId, orgId),
        eq(issueLabels.labelId, labelId),
      ),
    )
    .run();
  db.delete(labels)
    .where(and(orgPredicate(labels.orgId, orgId), eq(labels.id, labelId)))
    .run();
}

/** Replaces the whole label set of one issue in a single round trip. */
export async function setIssueLabels(
  orgId: OrgId,
  issueId: IssueId,
  labelIds: readonly LabelId[],
): Promise<void> {
  const db = getDb();
  db.delete(issueLabels)
    .where(
      and(
        orgPredicate(issueLabels.orgId, orgId),
        eq(issueLabels.issueId, issueId),
      ),
    )
    .run();

  if (labelIds.length === 0) return;

  db.insert(issueLabels)
    .values(labelIds.map((labelId) => ({ orgId, issueId, labelId })))
    .run();
}

/** Batched lookup keyed by issue id, so list views avoid an N+1. */
export async function listLabelsForIssues(
  orgId: OrgId,
  issueIds: readonly IssueId[],
): Promise<Readonly<Record<string, readonly IssueLabel[]>>> {
  if (issueIds.length === 0) return {};

  const rows = getDb()
    .select({ issueId: issueLabels.issueId, label: labels })
    .from(issueLabels)
    .innerJoin(labels, eq(labels.id, issueLabels.labelId))
    .where(
      and(
        orgPredicate(issueLabels.orgId, orgId),
        inArray(issueLabels.issueId, [...issueIds]),
      ),
    )
    .all();

  const grouped: Record<string, IssueLabel[]> = {};
  for (const row of rows) {
    (grouped[row.issueId] ??= []).push(toLabel(row.label));
  }
  return grouped;
}
