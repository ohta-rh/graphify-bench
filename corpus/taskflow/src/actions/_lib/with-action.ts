/**
 * Wrapper shared by every Server Action: parses with a Zod schema, resolves the
 * `Actor`, maps thrown domain errors to an `AppErrorShape` and revalidates the
 * affected tags.
 *
 * Owner D. Every mutation in `src/actions/**` funnels through here so the four
 * things each one must do — validate, authenticate, translate errors,
 * revalidate — happen in exactly one place.
 *
 * Must call (do not reimplement): getActor, toActionResult, revalidateTagged
 */

import { getActor, requireActorFor } from "@/lib/actor";
import { CACHE_PROFILES, revalidateTagged } from "@/lib/cache";
import { toActionResult } from "@/lib/errors";
import { getSessionPrincipal } from "@/lib/session";
import type { ActionResult } from "@/types/api";
import type { OrgId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { ZodType } from "zod";
import { UnauthorizedActionError } from "./action-errors";

/** The body of an action: already-validated input plus the resolved principal. */
export type ActionHandler = (input: unknown, actor: Actor) => Promise<unknown>;

export type ActionOptions = {
  /**
   * When `true` (the default) the organization is taken from the parsed input —
   * either an `orgSlug` or an `orgId` field. When `false` the action does not
   * name an organization and the session's active org is used instead.
   */
  requireOrg?: boolean;
  /** Static cache tags invalidated once the handler resolves. */
  revalidate?: readonly string[];
  /** cacheLife profile handed to `revalidateTag` — required in Next 16. */
  cacheProfile?: string;
};

type OrgBearingInput = { orgSlug?: unknown; orgId?: unknown };

/**
 * Resolves the actor for one action call.
 *
 * `getActor(orgSlug)` is the primary path because most mutations are dispatched
 * from a `[orgSlug]` route; actions whose payload carries the branded `orgId`
 * instead resolve through `requireActorFor()`.
 */
async function resolveActorFor(input: unknown, fromInput: boolean): Promise<Actor> {
  if (fromInput && typeof input === "object" && input !== null) {
    const record = input as OrgBearingInput;
    if (typeof record.orgSlug === "string" && record.orgSlug.length > 0) {
      return getActor(record.orgSlug);
    }
    if (typeof record.orgId === "string" && record.orgId.length > 0) {
      return requireActorFor(record.orgId as OrgId);
    }
  }

  const principal = await getSessionPrincipal();
  if (principal === null || principal.activeOrgId === null) {
    throw new UnauthorizedActionError();
  }
  return requireActorFor(principal.activeOrgId);
}

/** Adds the monotonic token `useActionState` uses to tell two results apart. */
function stamp<T>(result: ActionResult<T>): ActionResult<T> {
  const submittedAt = new Date().toISOString();
  return result.ok
    ? { ok: true, data: result.data, submittedAt }
    : { ok: false, error: result.error, submittedAt };
}

export function withAction<TSchema extends ZodType, TData>(
  schema: TSchema,
  handler: ActionHandler,
  options: ActionOptions = {},
): (raw: unknown) => Promise<ActionResult<TData>> {
  return async function runAction(raw: unknown): Promise<ActionResult<TData>> {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return stamp(toActionResult(parsed.error));
    }

    try {
      const actor = await resolveActorFor(parsed.data, options.requireOrg !== false);
      const data = (await handler(parsed.data, actor)) as TData;

      const tags = options.revalidate ?? [];
      if (tags.length > 0) {
        revalidateTagged(tags, options.cacheProfile ?? CACHE_PROFILES.minutes);
      }

      return stamp({ ok: true, data });
    } catch (error) {
      return stamp(toActionResult(error));
    }
  };
}
