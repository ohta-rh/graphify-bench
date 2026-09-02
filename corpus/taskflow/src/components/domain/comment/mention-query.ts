/**
 * The typing-side half of @-mentions.
 *
 * `@/lib/mentions` owns what a finished comment body *means* (which users it
 * mentions); this module owns what the caret is currently doing — where the
 * active `@token` starts, what it filters to, and what the body looks like
 * once a suggestion is accepted. Splitting it that way keeps the textarea from
 * re-deriving the parsing rules the server also applies.
 */
import type { MemberWithUser } from "@/types/member";

/** An in-progress mention: `@` plus the characters typed after it. */
export interface MentionQuery {
  /** Index of the `@` in the body. */
  readonly start: number;
  /** Index just past the last typed character. */
  readonly end: number;
  /** The text after `@`, lowercased for matching. */
  readonly query: string;
}

const MENTION_CHARS = /^[a-zA-Z0-9._-]*$/;

/**
 * Finds the mention the caret sits inside, or `null` when the caret is not in
 * one. A mention only starts at the beginning of the body or after
 * whitespace, so an email address never opens the autocomplete.
 */
export function findMentionQuery(
  body: string,
  caret: number,
): MentionQuery | null {
  const upTo = body.slice(0, Math.max(0, Math.min(caret, body.length)));
  const at = upTo.lastIndexOf("@");
  if (at === -1) return null;

  const before = at === 0 ? "" : upTo[at - 1] ?? "";
  if (before.length > 0 && !/\s/.test(before)) return null;

  const typed = upTo.slice(at + 1);
  if (!MENTION_CHARS.test(typed)) return null;

  return { start: at, end: upTo.length, query: typed.toLowerCase() };
}

/** The handle Taskflow mentions people by: the local part of their email. */
export function mentionHandle(member: MemberWithUser): string {
  const [local = member.user.name] = member.user.email.split("@");
  return local.toLowerCase();
}

/** Members whose handle or display name matches the in-progress query. */
export function matchMembers(
  members: readonly MemberWithUser[],
  query: string,
  limit = 5,
): readonly MemberWithUser[] {
  const needle = query.toLowerCase();
  const matches =
    needle.length === 0
      ? members
      : members.filter(
          (member) =>
            mentionHandle(member).includes(needle) ||
            member.user.name.toLowerCase().includes(needle),
        );
  return matches.slice(0, limit);
}

/** Replaces the in-progress mention with the chosen member's handle. */
export function applyMention(
  body: string,
  mention: MentionQuery,
  member: MemberWithUser,
): { body: string; caret: number } {
  const inserted = `@${mentionHandle(member)} `;
  const next = body.slice(0, mention.start) + inserted + body.slice(mention.end);
  return { body: next, caret: mention.start + inserted.length };
}
