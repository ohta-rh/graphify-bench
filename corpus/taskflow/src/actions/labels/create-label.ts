"use server";

/**
 * Creates a label.
 *
 * Owner D. Labels are organization-wide rather than per-project, so the
 * permission asked about is `org:update` on the organization itself.
 *
 * Must call (do not reimplement): createLabelSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { createLabelSchema, type CreateLabelInput } from "@/schemas/label";
import { createLabel } from "@/server/services/label-service";
import type { ActionResult } from "@/types/api";
import type { IssueLabel } from "@/types/issue";

const run = withAction<typeof createLabelSchema, IssueLabel>(
  createLabelSchema,
  async (raw, actor) => {
    const input = raw as CreateLabelInput;

    if (!can(actor, "org:update", { kind: "organization", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:update");
    }

    const label = await createLabel(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return label;
  },
  { revalidate: ["labels"], cacheProfile: "hours" },
);

export async function createLabelAction(raw: unknown): Promise<ActionResult<IssueLabel>> {
  return run(raw);
}
