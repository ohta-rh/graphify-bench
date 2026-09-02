/**
 * Query-time search plus the write-time index maintenance driven by `search.reindex_requested`.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, subscribe, isEnabled
 */
import type { SearchQueryInput } from "@/schemas/search";
import type { SearchSubjectKind } from "@/server/repositories/search-repository";
import type { Comment } from "@/types/comment";
import type { OrgId, Page } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";
export async function search(actor: Actor, input: SearchQueryInput): Promise<Page<SearchHit>> {
  throw new Error("stub: src/server/services/search-service.ts");
}

export type SearchHit = { kind: SearchSubjectKind; id: string; title: string; snippet: string; href: string };

export async function indexIssue(orgId: OrgId, issue: Issue): Promise<void> {
  throw new Error("stub: src/server/services/search-service.ts");
}

export async function indexComment(orgId: OrgId, comment: Comment): Promise<void> {
  throw new Error("stub: src/server/services/search-service.ts");
}

export async function indexProject(orgId: OrgId, project: Project): Promise<void> {
  throw new Error("stub: src/server/services/search-service.ts");
}

export async function removeFromIndex(orgId: OrgId, subjectKind: SearchSubjectKind, subjectId: string): Promise<void> {
  throw new Error("stub: src/server/services/search-service.ts");
}

export function registerSearchListeners(): Unsubscribe {
  throw new Error("stub: src/server/services/search-service.ts");
}
