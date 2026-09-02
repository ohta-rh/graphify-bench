/**
 * Extracts `@handle` mentions from comment bodies and resolves them to member
 * ids.
 *
 * A handle is the local part of a member's email address, lowercased — that
 * is what the comment composer autocompletes and what `CommentService` feeds
 * to the notification fan-out, so extraction and resolution must agree
 * exactly. Mentions inside code spans and fenced blocks are ignored.
 */
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";

/** `@` must start the line or follow whitespace/punctuation, never an email. */
const MENTION_PATTERN = /(^|[\s(<[])@([a-z0-9][a-z0-9._-]{0,38}[a-z0-9])/gi;

function withoutCode(body: string): string {
  return body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
}

/** The handle Taskflow addresses a member by, derived from their email. */
export function handleOf(member: MemberWithUser): string {
  return (member.user.email.split("@")[0] ?? "").toLowerCase();
}

/** Every distinct handle mentioned, in first-appearance order. */
export function extractMentions(body: string): readonly string[] {
  const seen = new Set<string>();
  const handles: string[] = [];

  for (const match of withoutCode(body).matchAll(MENTION_PATTERN)) {
    const handle = (match[2] ?? "").toLowerCase();
    if (handle === "" || seen.has(handle)) continue;
    seen.add(handle);
    handles.push(handle);
  }

  return handles;
}

/**
 * Maps the mentions in `body` onto the ids of members who actually exist in
 * the organization. Unknown handles are silently dropped — a typo must never
 * fail the comment write.
 */
export function resolveMentions(
  body: string,
  members: readonly MemberWithUser[],
): readonly UserId[] {
  const byHandle = new Map<string, UserId>();
  for (const member of members) {
    byHandle.set(handleOf(member), member.userId);
  }

  const resolved: UserId[] = [];
  const seen = new Set<UserId>();
  for (const handle of extractMentions(body)) {
    const userId = byHandle.get(handle);
    if (userId === undefined || seen.has(userId)) continue;
    seen.add(userId);
    resolved.push(userId);
  }

  return resolved;
}

/** Wraps every mention in a span so the comment renderer can style it. */
export function highlightMentions(body: string): string {
  return body.replace(
    MENTION_PATTERN,
    (_match, prefix: string, handle: string) =>
      `${prefix}<span class="mention">@${handle}</span>`,
  );
}
