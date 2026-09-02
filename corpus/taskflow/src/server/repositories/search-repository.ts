/**
 * Denormalised search index kept in step by `SearchService`.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { SearchQueryInput } from "@/schemas/search";
import type { SearchIndexRow } from "@/server/db/schema/webhooks";
import type { OrgId, Page, ProjectId } from "@/types/common";
export async function upsertSearchDocument(orgId: OrgId, subjectKind: SearchSubjectKind, subjectId: string, content: string, projectId: ProjectId | null): Promise<void> {
  throw new Error("stub: src/server/repositories/search-repository.ts");
}

export async function deleteSearchDocument(orgId: OrgId, subjectKind: SearchSubjectKind, subjectId: string): Promise<void> {
  throw new Error("stub: src/server/repositories/search-repository.ts");
}

export async function searchDocuments(input: SearchQueryInput): Promise<Page<SearchIndexRow>> {
  throw new Error("stub: src/server/repositories/search-repository.ts");
}

export async function countIndexed(orgId: OrgId): Promise<number> {
  throw new Error("stub: src/server/repositories/search-repository.ts");
}

export type SearchSubjectKind = 'issue' | 'comment' | 'project';
