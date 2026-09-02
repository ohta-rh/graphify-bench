/**
 * Extracts `@handle` mentions from comment bodies and resolves them to member ids.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
export function extractMentions(body: string): readonly string[] {
  throw new Error("stub: src/lib/mentions.ts");
}

export function resolveMentions(body: string, members: readonly MemberWithUser[]): readonly UserId[] {
  throw new Error("stub: src/lib/mentions.ts");
}

export function highlightMentions(body: string): string {
  throw new Error("stub: src/lib/mentions.ts");
}
