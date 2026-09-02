"use client";

/**
 * Textarea with an @-mention autocomplete that reports mentioned ids.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
export type MentionTextareaProps = { value: string; members: readonly MemberWithUser[]; onChange: (value: string, mentioned: readonly UserId[]) => void };

export function MentionTextarea(props: MentionTextareaProps): ReactElement | null {
  return null;
}
