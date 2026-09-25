/**
 * Hidden test for HIM2: merging one label into another.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import { mergeLabelsSchema } from "@/schemas/label";
import * as labelRepo from "@/server/repositories/label-repository";
import { NotFoundError } from "@/server/services/_support";
import * as issueService from "@/server/services/issue-service";
import * as labelService from "@/server/services/label-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { LabelId } from "@/types/common";
import type { Issue, IssueLabel } from "@/types/issue";

let cleanup: () => void;
let a: Tenant;
let b: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  a = await createTenant("him2a", "growth");
  b = await createTenant("him2b", "growth");
});

afterAll(() => {
  cleanup();
});

async function label(t: Tenant, name: string): Promise<IssueLabel> {
  return labelService.createLabel(t.actors.admin, {
    orgId: t.org.id,
    name,
    color: "#94a3b8",
    description: null,
  });
}

async function issueWith(t: Tenant, title: string, labelIds: readonly LabelId[]): Promise<Issue> {
  return issueService.createIssue(t.actors.member, {
    ...issueInput(t.org.id, t.project.id, { title }),
    labelIds: [...labelIds],
  });
}

async function labelIdsOf(t: Tenant, issue: Issue): Promise<string[]> {
  const byIssue = await labelRepo.listLabelsForIssues(t.org.id, [issue.id]);
  return (byIssue[issue.id] ?? []).map((l) => l.id).sort();
}

async function labelNames(t: Tenant): Promise<string[]> {
  return (await labelRepo.listLabels(t.org.id)).map((l) => l.name).sort();
}

describe("HIM2 labelService.mergeLabels", () => {
  it("moves every issue from the source label to the target and removes the source", async () => {
    const bug = await label(a, "bug");
    const defect = await label(a, "defect");
    const ui = await label(a, "ui");

    const onlySource = await issueWith(a, "Only defect", [defect.id, ui.id]);
    const both = await issueWith(a, "Defect and bug", [defect.id, bug.id]);
    const onlyTarget = await issueWith(a, "Only bug", [bug.id]);
    const unrelated = await issueWith(a, "Only ui", [ui.id]);

    const result = await labelService.mergeLabels(a.actors.admin, {
      orgId: a.org.id,
      sourceLabelId: defect.id,
      targetLabelId: bug.id,
    });

    expect(result.label.id).toBe(bug.id);
    expect(result.issuesRelabelled).toBe(2);

    expect(await labelIdsOf(a, onlySource)).toEqual([bug.id, ui.id].sort());
    // An issue that carried both ends up with the target exactly once.
    expect(await labelIdsOf(a, both)).toEqual([bug.id]);
    expect(await labelIdsOf(a, onlyTarget)).toEqual([bug.id]);
    expect(await labelIdsOf(a, unrelated)).toEqual([ui.id]);

    const names = await labelNames(a);
    expect(names).toContain("bug");
    expect(names).not.toContain("defect");
  });

  it("relabels archived issues as well", async () => {
    const source = await label(a, "legacy");
    const target = await label(a, "tech-debt");
    const archived = await issueWith(a, "Archived legacy work", [source.id]);
    await issueService.archiveIssue(a.actors.member, a.org.id, archived.id);

    const result = await labelService.mergeLabels(a.actors.owner, {
      orgId: a.org.id,
      sourceLabelId: source.id,
      targetLabelId: target.id,
    });

    expect(result.issuesRelabelled).toBe(1);
    expect(await labelIdsOf(a, archived)).toEqual([target.id]);
  });

  it("requires the same role as deleting a label", async () => {
    const source = await label(a, "p-source");
    const target = await label(a, "p-target");
    const issue = await issueWith(a, "Permission probe", [source.id]);

    await expect(
      labelService.mergeLabels(a.actors.member, {
        orgId: a.org.id,
        sourceLabelId: source.id,
        targetLabelId: target.id,
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(await labelIdsOf(a, issue)).toEqual([source.id]);
    expect(await labelNames(a)).toContain("p-source");
  });

  it("treats a label of another organization as not found and changes nothing", async () => {
    const mine = await label(a, "mine");
    const theirs = await label(b, "theirs");
    const myIssue = await issueWith(a, "Mine", [mine.id]);
    const theirIssue = await issueWith(b, "Theirs", [theirs.id]);

    await expect(
      labelService.mergeLabels(a.actors.admin, {
        orgId: a.org.id,
        sourceLabelId: mine.id,
        targetLabelId: theirs.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      labelService.mergeLabels(a.actors.admin, {
        orgId: a.org.id,
        sourceLabelId: theirs.id,
        targetLabelId: mine.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await labelIdsOf(a, myIssue)).toEqual([mine.id]);
    expect(await labelIdsOf(b, theirIssue)).toEqual([theirs.id]);
    expect(await labelNames(a)).toContain("mine");
    expect(await labelNames(b)).toContain("theirs");
  });

  it("refuses to act on another organization", async () => {
    const x = await label(b, "b-x");
    const y = await label(b, "b-y");

    await expect(
      labelService.mergeLabels(a.actors.owner, {
        orgId: b.org.id,
        sourceLabelId: x.id,
        targetLabelId: y.id,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect(await labelNames(b)).toEqual(expect.arrayContaining(["b-x", "b-y"]));
  });

  it("never merges a label into itself", async () => {
    const self = await label(a, "self");
    const issue = await issueWith(a, "Self merge", [self.id]);

    expect(
      mergeLabelsSchema.safeParse({
        orgId: a.org.id,
        sourceLabelId: self.id,
        targetLabelId: self.id,
      }).success,
    ).toBe(false);

    await expect(
      labelService.mergeLabels(a.actors.owner, {
        orgId: a.org.id,
        sourceLabelId: self.id,
        targetLabelId: self.id,
      }),
    ).rejects.toThrow();

    expect(await labelNames(a)).toContain("self");
    expect(await labelIdsOf(a, issue)).toEqual([self.id]);
  });
});
