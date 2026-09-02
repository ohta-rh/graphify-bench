"use client";

/**
 * Create/edit form bound to `createIssueSchema` through `zodResolver`.
 *
 * The schema is the same object the Server Action re-parses, so a field the
 * client accepts can never be one the server rejects — that shared definition
 * is the whole point of keeping the Zod schemas outside both layers.
 *
 * Must call (do not reimplement): createIssueSchema
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { createIssueSchema, type CreateIssueInput } from "@/schemas/issue";
import type { ActionResult } from "@/types/api";
import type { IsoTimestamp, LabelId, OrgId, ProjectId, UserId } from "@/types/common";
import type { Issue, IssueLabel } from "@/types/issue";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
import { IssueAssigneePicker } from "./issue-assignee-picker";
import { IssueDueDateField } from "./issue-due-date-field";
import { IssueLabelPicker } from "./issue-label-picker";
import { IssuePrioritySelect } from "./issue-priority-select";
import { IssueStatusSelect } from "./issue-status-select";

export type IssueFormProps = {
  orgId: OrgId;
  projectId: ProjectId;
  defaultValues?: Partial<CreateIssueInput>;
  members: readonly MemberWithUser[];
  labels: readonly IssueLabel[];
  onSubmit: (input: CreateIssueInput) => Promise<ActionResult<Issue>>;
};

export function IssueForm(props: IssueFormProps): ReactElement | null {
  const { orgId, projectId, defaultValues, members, labels, onSubmit } = props;

  const form = useForm({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      orgId,
      projectId,
      title: "",
      description: null,
      status: "backlog",
      priority: "none",
      assigneeId: null,
      parentId: null,
      estimate: null,
      dueAt: null,
      labelIds: [],
      ...defaultValues,
    },
  });

  const { submit, pending, error } = useFormAction(onSubmit, {
    onSuccess: () => form.reset(),
  });

  const values = useWatch({ control: form.control });
  const fieldError = (name: keyof CreateIssueInput): string | null =>
    form.formState.errors[name]?.message ?? null;

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((input) => submit(input))}
    >
      <FormField
        name="title"
        label="Title"
        required
        error={fieldError("title")}
      >
        <Input
          name="title"
          value={values.title ?? ""}
          placeholder="Something is broken"
          invalid={fieldError("title") !== null}
          onChange={(value) => form.setValue("title", value)}
        />
      </FormField>

      <FormField name="description" label="Description">
        <Textarea
          name="description"
          rows={6}
          value={values.description ?? ""}
          placeholder="What happened, and what did you expect?"
          onChange={(value) =>
            form.setValue("description", value.length === 0 ? null : value)
          }
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name="status" label="Status">
          <IssueStatusSelect
            value={values.status ?? "backlog"}
            onChange={(status) => form.setValue("status", status)}
          />
        </FormField>

        <FormField name="priority" label="Priority">
          <IssuePrioritySelect
            value={values.priority ?? "none"}
            onChange={(priority) => form.setValue("priority", priority)}
          />
        </FormField>

        <FormField name="assigneeId" label="Assignee">
          <IssueAssigneePicker
            value={(values.assigneeId ?? null) as UserId | null}
            members={members}
            onChange={(userId) => form.setValue("assigneeId", userId)}
          />
        </FormField>

        <FormField name="dueAt" label="Due date">
          <IssueDueDateField
            value={(values.dueAt ?? null) as IsoTimestamp | null}
            onChange={(dueAt) => form.setValue("dueAt", dueAt)}
          />
        </FormField>
      </div>

      <FormField name="labelIds" label="Labels">
        <IssueLabelPicker
          value={(values.labelIds ?? []) as unknown as readonly LabelId[]}
          labels={labels}
          onChange={(labelIds) => form.setValue("labelIds", [...labelIds])}
        />
      </FormField>

      <ErrorMessage message={error?.message ?? null} />

      <Button type="submit" loading={pending} disabled={pending}>
        Create issue
      </Button>
    </form>
  );
}
