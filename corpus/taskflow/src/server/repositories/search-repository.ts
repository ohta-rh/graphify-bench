/**
 * Denormalised search index kept in step by `SearchService`.
 */
import { and, count, desc, eq, inArray, like } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, searchIndex } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import type { SearchQueryInput } from "@/schemas/search";
import type { SearchIndexRow } from "@/server/db/schema/webhooks";
import type { OrgId, Page, ProjectId } from "@/types/common";

/**
 * Upsert by (org, kind, subject) rather than by row id: the indexer is called
 * on every write and must be idempotent.
 */
export async function upsertSearchDocument(
  orgId: OrgId,
  subjectKind: SearchSubjectKind,
  subjectId: string,
  content: string,
  projectId: ProjectId | null,
): Promise<void> {
  const db = getDb();
  const indexedAt = toIsoTimestamp(new Date());

  const existing = db
    .select({ id: searchIndex.id })
    .from(searchIndex)
    .where(
      and(
        orgPredicate(searchIndex.orgId, orgId),
        eq(searchIndex.subjectKind, subjectKind),
        eq(searchIndex.subjectId, subjectId),
      ),
    )
    .get();

  if (existing) {
    db.update(searchIndex)
      .set({ content, projectId, indexedAt })
      .where(eq(searchIndex.id, existing.id))
      .run();
    return;
  }

  db.insert(searchIndex)
    .values({
      id: newId(),
      orgId,
      subjectKind,
      subjectId,
      projectId,
      content,
      indexedAt,
    })
    .run();
}

export async function deleteSearchDocument(
  orgId: OrgId,
  subjectKind: SearchSubjectKind,
  subjectId: string,
): Promise<void> {
  getDb()
    .delete(searchIndex)
    .where(
      and(
        orgPredicate(searchIndex.orgId, orgId),
        eq(searchIndex.subjectKind, subjectKind),
        eq(searchIndex.subjectId, subjectId),
      ),
    )
    .run();
}

/**
 * Substring match over the denormalised content column. Deliberately simple —
 * the index is a convenience layer, not a search engine, and the tenant filter
 * is what actually matters here.
 */
export async function searchDocuments(
  input: SearchQueryInput,
): Promise<Page<SearchIndexRow>> {
  const db = getDb();
  const sort = { sortColumn: searchIndex.indexedAt, idColumn: searchIndex.id };

  const filters = compact(
    orgPredicate(searchIndex.orgId, input.orgId),
    like(searchIndex.content, `%${input.q}%`),
    input.kinds.length === 0
      ? undefined
      : inArray(searchIndex.subjectKind, [...input.kinds]),
    input.projectId === undefined
      ? undefined
      : eq(searchIndex.projectId, input.projectId),
  );

  const total = db
    .select({ value: count() })
    .from(searchIndex)
    .where(and(...filters))
    .get();

  const rows = db
    .select()
    .from(searchIndex)
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(searchIndex.indexedAt), desc(searchIndex.id))
    .limit(probeLimit(input.limit))
    .all();

  return toPage(
    rows,
    input.limit,
    total?.value ?? 0,
    (row) => row,
    (row) => ({ id: row.id, sortValue: row.indexedAt }),
  );
}

/** Drift alarm input: how many documents this org currently has indexed. */
export async function countIndexed(orgId: OrgId): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(searchIndex)
    .where(orgPredicate(searchIndex.orgId, orgId))
    .get();
  return row?.value ?? 0;
}

export type SearchSubjectKind = 'issue' | 'comment' | 'project';
