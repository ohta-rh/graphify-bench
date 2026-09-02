/**
 * Issue business rules: authorization, per-project issue quota, numbering, status transitions and the events every other concern reacts to.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, wouldExceedLimit, assertNotArchived
 */
import type { AssignIssueInput, ChangeIssueStatusInput, CreateIssueInput, IssueFilterInput, MoveIssueInput, UpdateIssueInput } from "@/schemas/issue";
import type { IssueId, OrgId, Page, ProjectId } from "@/types/common";
import type { Issue, IssueBoardColumn, IssueWithRelations } from "@/types/issue";
import type { Actor } from "@/types/member";
export async function createIssue(actor: Actor, input: CreateIssueInput): Promise<Issue> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function updateIssue(actor: Actor, input: UpdateIssueInput): Promise<Issue> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function changeIssueStatus(actor: Actor, input: ChangeIssueStatusInput): Promise<Issue> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function assignIssue(actor: Actor, input: AssignIssueInput): Promise<Issue> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function archiveIssue(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<Issue> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function moveIssue(actor: Actor, input: MoveIssueInput): Promise<Issue> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function getIssue(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<IssueWithRelations> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function listIssues(actor: Actor, input: IssueFilterInput): Promise<Page<Issue>> {
  throw new Error("stub: src/server/services/issue-service.ts");
}

export async function getBoard(actor: Actor, orgId: OrgId, projectId: ProjectId): Promise<readonly IssueBoardColumn[]> {
  throw new Error("stub: src/server/services/issue-service.ts");
}
