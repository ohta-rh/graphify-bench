"use client";

/**
 * Textarea with an @-mention autocomplete that reports mentioned ids.
 */
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { resolveMentions } from "@/lib/mentions";
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
import {
  applyMention,
  findMentionQuery,
  matchMembers,
  mentionHandle,
  type MentionQuery,
} from "./mention-query";

export type MentionTextareaProps = {
  value: string;
  members: readonly MemberWithUser[];
  onChange: (value: string, mentioned: readonly UserId[]) => void;
};

export function MentionTextarea(
  props: MentionTextareaProps,
): ReactElement | null {
  const { value, members, onChange } = props;
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [mention, setMention] = useState<MentionQuery | null>(null);

  // `resolveMentions` is the same function the comment service runs on the
  // stored body, so what the composer reports and what the server records
  // cannot drift apart.
  function emit(body: string): void {
    onChange(body, resolveMentions(body, members));
  }

  function handleInput(body: string, caret: number): void {
    setMention(findMentionQuery(body, caret));
    emit(body);
  }

  function choose(member: MemberWithUser): void {
    if (mention === null) return;
    const next = applyMention(value, mention, member);
    setMention(null);
    emit(next.body);
    const element = ref.current;
    if (element !== null) {
      element.focus();
      element.setSelectionRange(next.caret, next.caret);
    }
  }

  const suggestions =
    mention === null ? [] : matchMembers(members, mention.query);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        name="body"
        rows={4}
        value={value}
        className={cn("w-full rounded border p-2 text-sm")}
        placeholder="Leave a comment. Use @ to mention a teammate."
        onChange={(event) =>
          handleInput(event.target.value, event.target.selectionStart)
        }
        onKeyDown={(event) => {
          if (event.key === "Escape" && mention !== null) {
            event.preventDefault();
            setMention(null);
          }
        }}
      />

      {suggestions.length > 0 ? (
        <ul className="absolute z-10 mt-1 w-64 rounded border bg-white shadow">
          {suggestions.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                className="flex w-full justify-between px-2 py-1 text-left text-sm hover:bg-neutral-100"
                onClick={() => choose(member)}
              >
                <span>{member.user.name}</span>
                <span className="text-neutral-500">
                  @{mentionHandle(member)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
