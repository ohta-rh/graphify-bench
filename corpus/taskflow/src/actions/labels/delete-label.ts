"use server";

/**
 * Deletes a label and detaches it from every issue.
 *
 * Owner D. Labels are a hard delete — unlike issues and projects they carry no
 * `archived_at`, and `LabelService` is responsible for pruning the label id out
 * of every issue's `labelIds` in the same transaction.
 *
 * Must call (do not reimplement): deleteLabelSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { deleteLabelSchema } from "@/schemas/label";
import { deleteLabel } from "@/server/services/label-service";
import type { ActionResult } from "@/types/api";
import type { LabelId, OrgId } from "@/types/common";

type DeleteLabelInput = { orgId: OrgId; labelId: LabelId };

const run = withAction<typeof deleteLabelSchema, null>(
  deleteLabelSchema,
  async (raw, actor) => {
    const input = raw as DeleteLabelInput;

    if (!can(actor, "org:update", { kind: "organization", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:update");
    }

    await deleteLabel(actor, input.orgId, input.labelId);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return null;
  },
  { revalidate: ["labels", "issues"], cacheProfile: "hours" },
);

export async function deleteLabelAction(raw: unknown): Promise<ActionResult<null>> {
  return run(raw);
}
