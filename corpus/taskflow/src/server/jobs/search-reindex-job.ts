/**
 * Rebuilds the search index for one organization; used after a bulk import or an index drift alarm.
 *
 * Must call (do not reimplement): indexIssue, indexComment, indexProject
 */
import { createLogger } from "@/lib/logger";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import {
  indexComment,
  indexIssue,
  indexProject,
} from "@/server/services/search-service";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";
import type { OrgId } from "@/types/common";

/** Rows read per page while walking the org's content. */
const PAGE_SIZE = 100;

const logger = createLogger("search-reindex-job");

/**
 * Walks one tenant's live projects, issues and comments and re-upserts every
 * document. Scoped to a single org on purpose: a full-fleet reindex is a
 * sequence of these, so one slow tenant cannot stall the rest.
 */
export async function runSearchReindexJob(orgId: OrgId): Promise<JobResult> {
  return runJob("search-reindex", async (result) => {
    const projects = await projectRepo.listProjects({
      orgId,
      limit: PAGE_SIZE,
      cursor: null,
    });

    for (const project of projects.items) {
      try {
        await indexProject(orgId, project);
        result.processed += 1;
      } catch (error) {
        result.failed += 1;
        logger.error("failed to index project", {
          projectId: project.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const issues = await issueRepo.listIssues({
      orgId,
      limit: PAGE_SIZE,
      cursor: null,
    });

    for (const issue of issues.items) {
      try {
        await indexIssue(orgId, issue);
        result.processed += 1;

        const comments = await commentRepo.listComments({
          orgId,
          issueId: issue.id,
          includeArchived: false,
          limit: PAGE_SIZE,
          cursor: null,
        });

        for (const comment of comments.items) {
          await indexComment(orgId, comment);
          result.processed += 1;
        }
      } catch (error) {
        result.failed += 1;
        logger.error("failed to index issue", {
          issueId: issue.id,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}
