"use client";

/**
 * Comment box bound to `createCommentSchema`.
 *
 * Must call (do not reimplement): createCommentSchema
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { useFormAction } from "@/hooks/use-form-action";
import { createCommentSchema, type CreateCommentInput } from "@/schemas/comment";
import type { ActionResult } from "@/types/api";
import type { CommentId, IssueId, OrgId, UserId } from "@/types/common";
import type { Comment } from "@/types/comment";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
import { MentionTextarea } from "./mention-textarea";

export type CommentComposerProps = {
  orgId: OrgId;
  issueId: IssueId;
  members: readonly MemberWithUser[];
  onSubmit: (input: CreateCommentInput) => Promise<ActionResult<Comment>>;
  /** Set when replying inside a thread rather than starting a new one. */
  parentId?: CommentId | null;
};

export function CommentComposer(
  props: CommentComposerProps,
): ReactElement | null {
  const { orgId, issueId, members, onSubmit, parentId = null } = props;

  const [body, setBody] = useState("");
  const [mentioned, setMentioned] = useState<readonly UserId[]>([]);
  const [invalid, setInvalid] = useState<string | null>(null);

  const { submit, pending, error } = useFormAction(onSubmit, {
    onSuccess: () => {
      setBody("");
      setMentioned([]);
    },
  });

  async function handleSubmit(): Promise<void> {
    // Parse with the same schema the Server Action re-parses, so the button
    // never posts something the server is going to reject for shape.
    const parsed = createCommentSchema.safeParse({
      orgId,
      issueId,
      body,
      parentId,
      mentionedUserIds: mentioned,
    });

    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? "This comment is not valid");
      return;
    }

    setInvalid(null);
    await submit(parsed.data);
  }

  return (
    <div className="comment-composer space-y-2">
      <MentionTextarea
        value={body}
        members={members}
        onChange={(nextBody, nextMentions) => {
          setBody(nextBody);
          setMentioned(nextMentions);
        }}
      />

      <ErrorMessage message={invalid ?? error?.message ?? null} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          {mentioned.length > 0
            ? `${mentioned.length} teammate(s) will be notified`
            : "No mentions"}
        </span>
        <Button
          type="button"
          loading={pending}
          disabled={pending || body.trim().length === 0}
          onClick={() => void handleSubmit()}
        >
          {parentId === null ? "Comment" : "Reply"}
        </Button>
      </div>
    </div>
  );
}
