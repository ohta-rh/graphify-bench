/**
 * Issue rows: the widest query surface in the app. Every method takes `orgId` first and honours `IssueFilter.includeArchived`.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archivePatch, restorePatch, shouldFilterArchived
 */
import type { CreateIssueInput, IssueFilterInput, UpdateIssueInput } from "@/schemas/issue";
import type { ArchiveScope, IsoTimestamp, IssueId, OrgId, Page, ProjectId, UserId } from "@/types/common";
import type { Issue, IssueBoardColumn, IssueStatus, IssueWithRelations } from "@/types/issue";
export async function findIssueById(orgId: OrgId, issueId: IssueId): Promise<Issue | null> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function findIssueByNumber(orgId: OrgId, projectId: ProjectId, issueNumber: number): Promise<Issue | null> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function listIssues(input: IssueFilterInput): Promise<Page<Issue>> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function listIssuesWithRelations(input: IssueFilterInput): Promise<Page<IssueWithRelations>> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function listBoardColumns(orgId: OrgId, projectId: ProjectId): Promise<readonly IssueBoardColumn[]> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function countIssues(orgId: OrgId, projectId: ProjectId, scope?: ArchiveScope): Promise<number> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function nextIssueNumber(orgId: OrgId, projectId: ProjectId): Promise<number> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function insertIssue(input: CreateIssueInput, authorId: UserId, issueNumber: number): Promise<Issue> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function updateIssue(input: UpdateIssueInput): Promise<Issue> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function setIssueStatus(orgId: OrgId, issueId: IssueId, status: IssueStatus): Promise<Issue> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function setIssueAssignee(orgId: OrgId, issueId: IssueId, assigneeId: UserId | null): Promise<Issue> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function archiveIssue(orgId: OrgId, issueId: IssueId): Promise<Issue> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function restoreIssue(orgId: OrgId, issueId: IssueId): Promise<Issue> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function archiveIssuesForProject(orgId: OrgId, projectId: ProjectId): Promise<number> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}

export async function listOverdueIssues(orgId: OrgId, now: IsoTimestamp): Promise<readonly Issue[]> {
  throw new Error("stub: src/server/repositories/issue-repository.ts");
}
