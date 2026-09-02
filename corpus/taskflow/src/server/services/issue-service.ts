/**
 * Issue business rules: authorization, per-project issue quota, numbering, status transitions and the events every other concern reacts to.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, wouldExceedLimit, assertNotArchived
 */
import { wouldExceedLimit } from "@/config/plan-limits";
import { emit } from "@/lib/event-bus";
import { assertCan } from "@/lib/permissions";
import { assertNotArchived } from "@/lib/soft-delete";
import { assertOrgScope } from "@/lib/tenant";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as labelRepo from "@/server/repositories/label-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as attachmentRepo from "@/server/repositories/attachment-repository";
import {
  actorEnvelope,
  issueResource,
  orgResource,
  projectResource,
  requireFound,
} from "./_support";
import type {
  AssignIssueInput,
  ChangeIssueStatusInput,
  CreateIssueInput,
  IssueFilterInput,
  MoveIssueInput,
  UpdateIssueInput,
} from "@/schemas/issue";
import type { IssueId, OrgId, Page, ProjectId } from "@/types/common";
import type { Issue, IssueBoardColumn, IssueWithRelations } from "@/types/issue";
import type { Actor } from "@/types/member";

/**
 * Creates an issue after four gates: tenant scope, the `issue:create`
 * permission, a live parent project and the plan's per-project issue quota.
 * Only then is a number allocated and `issue.created` published — everything
 * reactive (notifications, search, webhooks, the audit log) hangs off that.
 */
export async function createIssue(
  actor: Actor,
  input: CreateIssueInput,
): Promise<Issue> {
  assertOrgScope(actor, input.orgId);

  const project = requireFound(
    await projectRepo.findProjectById(input.orgId, input.projectId),
    "Project",
    input.projectId,
  );
  assertNotArchived("Project", project.id, project);
  assertCan(actor, "issue:create", projectResource(project));

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );
  const used = await issueRepo.countIssues(input.orgId, input.projectId);
  if (wouldExceedLimit(org.plan, "issuesPerProject", used)) {
    throw new Error(
      `Plan ${org.plan} allows no more issues in project ${project.key}`,
    );
  }

  const number = await issueRepo.nextIssueNumber(input.orgId, input.projectId);
  const issue = await issueRepo.insertIssue(input, actor.userId, number);

  await emit("issue.created", {
    ...actorEnvelope(actor),
    issueId: issue.id,
    projectId: issue.projectId,
    title: issue.title,
    assigneeId: issue.assigneeId,
    priority: issue.priority,
  });

  return issue;
}

export async function updateIssue(
  actor: Actor,
  input: UpdateIssueInput,
): Promise<Issue> {
  assertOrgScope(actor, input.orgId);

  const before = requireFound(
    await issueRepo.findIssueById(input.orgId, input.issueId),
    "Issue",
    input.issueId,
  );
  assertCan(actor, "issue:update", issueResource(before));
  assertNotArchived("Issue", before.id, before);

  const after = await issueRepo.updateIssue(input);

  await emit("issue.updated", {
    ...actorEnvelope(actor),
    issueId: after.id,
    projectId: after.projectId,
    changedFields: Object.keys(input).filter(
      (key) => key !== "orgId" && key !== "issueId",
    ),
  });

  return after;
}

/** Status transitions are an `issue:update`, not a separate permission. */
export async function changeIssueStatus(
  actor: Actor,
  input: ChangeIssueStatusInput,
): Promise<Issue> {
  assertOrgScope(actor, input.orgId);

  const before = requireFound(
    await issueRepo.findIssueById(input.orgId, input.issueId),
    "Issue",
    input.issueId,
  );
  assertCan(actor, "issue:update", issueResource(before));
  assertNotArchived("Issue", before.id, before);

  if (before.status === input.status) return before;

  const after = await issueRepo.setIssueStatus(
    input.orgId,
    input.issueId,
    input.status,
  );

  await emit("issue.status_changed", {
    ...actorEnvelope(actor),
    issueId: after.id,
    projectId: after.projectId,
    from: before.status,
    to: after.status,
  });

  return after;
}

/**
 * Assignment has its own permission because a member may reassign work they
 * do not otherwise own. Un-assigning publishes `issue.updated` instead, since
 * `issue.assigned` carries a non-null assignee by contract.
 */
export async function assignIssue(
  actor: Actor,
  input: AssignIssueInput,
): Promise<Issue> {
  assertOrgScope(actor, input.orgId);

  const before = requireFound(
    await issueRepo.findIssueById(input.orgId, input.issueId),
    "Issue",
    input.issueId,
  );
  assertCan(actor, "issue:assign", issueResource(before));
  assertNotArchived("Issue", before.id, before);

  const after = await issueRepo.setIssueAssignee(
    input.orgId,
    input.issueId,
    input.assigneeId,
  );

  if (input.assigneeId === null) {
    await emit("issue.updated", {
      ...actorEnvelope(actor),
      issueId: after.id,
      projectId: after.projectId,
      changedFields: ["assigneeId"],
    });
    return after;
  }

  await emit("issue.assigned", {
    ...actorEnvelope(actor),
    issueId: after.id,
    projectId: after.projectId,
    previousAssigneeId: before.assigneeId,
    assigneeId: input.assigneeId,
  });

  return after;
}

export async function archiveIssue(
  actor: Actor,
  orgId: OrgId,
  issueId: IssueId,
): Promise<Issue> {
  assertOrgScope(actor, orgId);

  const issue = requireFound(
    await issueRepo.findIssueById(orgId, issueId),
    "Issue",
    issueId,
  );
  assertCan(actor, "issue:archive", issueResource(issue));
  assertNotArchived("Issue", issue.id, issue);

  const archived = await issueRepo.archiveIssue(orgId, issueId);

  await emit("issue.archived", {
    ...actorEnvelope(actor),
    issueId: archived.id,
    projectId: archived.projectId,
  });

  return archived;
}

/**
 * Board drag-and-drop. The index is presentation-only — the board renders by
 * `updated_at` — so a move is a status change plus a touch.
 */
export async function moveIssue(
  actor: Actor,
  input: MoveIssueInput,
): Promise<Issue> {
  return changeIssueStatus(actor, {
    orgId: input.orgId,
    issueId: input.issueId,
    status: input.toStatus,
  });
}

export async function getIssue(
  actor: Actor,
  orgId: OrgId,
  issueId: IssueId,
): Promise<IssueWithRelations> {
  assertOrgScope(actor, orgId);

  const issue = requireFound(
    await issueRepo.findIssueById(orgId, issueId),
    "Issue",
    issueId,
  );
  assertCan(actor, "issue:read", issueResource(issue));

  const labels = await labelRepo.listLabelsForIssues(orgId, [issue.id]);

  return {
    issue,
    labels: labels[issue.id] ?? [],
    commentCount: await commentRepo.countComments(orgId, issue.id),
    attachmentCount: (await attachmentRepo.listAttachments(orgId, issue.id))
      .length,
  };
}

export async function listIssues(
  actor: Actor,
  input: IssueFilterInput,
): Promise<Page<Issue>> {
  assertOrgScope(actor, input.orgId);
  // A cross-project list is an org-wide read; per-project visibility is
  // enforced when the caller opens an individual issue.
  assertCan(actor, "issue:read", orgResource(input.orgId));
  return issueRepo.listIssues(input);
}

export async function getBoard(
  actor: Actor,
  orgId: OrgId,
  projectId: ProjectId,
): Promise<readonly IssueBoardColumn[]> {
  assertOrgScope(actor, orgId);

  const project = requireFound(
    await projectRepo.findProjectById(orgId, projectId),
    "Project",
    projectId,
  );
  assertCan(actor, "issue:read", projectResource(project));

  return issueRepo.listBoardColumns(orgId, projectId);
}
