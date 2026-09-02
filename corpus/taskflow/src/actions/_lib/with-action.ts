/**
 * Wrapper shared by every Server Action: parses with a Zod schema, resolves the `Actor`, maps thrown domain errors to an `AppErrorShape` and revalidates the affected tags.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getActor, toActionResult, revalidateTagged
 */
import type { ActionResult } from "@/types/api";
import type { Actor } from "@/types/member";
import type { ZodType } from "zod";
export function withAction<TSchema extends ZodType, TData>(schema: TSchema, handler: ActionHandler, options?: ActionOptions): (raw: unknown) => Promise<ActionResult<TData>> {
  throw new Error("stub: src/actions/_lib/with-action.ts");
}

export type ActionHandler = (input: unknown, actor: Actor) => Promise<unknown>;

export type ActionOptions = { requireOrg?: boolean; revalidate?: readonly string[]; cacheProfile?: string };
