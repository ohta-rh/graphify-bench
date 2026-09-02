"use client";

/**
 * Create/delete UI for organization labels.
 *
 * Owner D. Private to the labels route. Both mutations arrive as props so this
 * component never imports the action layer directly — the same discipline the
 * `src/components/domain` tree follows.
 */

import { useActionState } from "react";
import { fieldErrorsFromZod } from "@/lib/errors";
import { createLabelSchema } from "@/schemas/label";
import type { ActionResult } from "@/types/api";
import type { LabelId, OrgId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";

export type LabelManagerProps = {
  orgId: OrgId;
  labels: readonly IssueLabel[];
  editable: boolean;
  onCreate: (input: unknown) => Promise<ActionResult<IssueLabel>>;
  onDelete: (input: unknown) => Promise<ActionResult<null>>;
};

type CreateState = ActionResult<IssueLabel> | null;

export function LabelManager(props: LabelManagerProps) {
  const { orgId, labels, editable, onCreate, onDelete } = props;

  const [state, submit, pending] = useActionState<CreateState, FormData>(
    async (_previous, formData) => {
      const description = String(formData.get("description") ?? "").trim();

      const parsed = createLabelSchema.safeParse({
        orgId,
        name: String(formData.get("name") ?? ""),
        color: String(formData.get("color") ?? "#94a3b8"),
        description: description.length === 0 ? null : description,
      });

      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "validation_failed",
            message: "Check the label details.",
            fieldErrors: fieldErrorsFromZod(parsed.error),
          },
        };
      }

      return onCreate(parsed.data);
    },
    null,
  );

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <div className="space-y-8">
      <ul className="space-y-2">
        {labels.map((label) => (
          <li
            key={label.id}
            className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <span
              aria-hidden
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            <span className="font-medium">{label.name}</span>
            {label.description !== null ? (
              <span className="text-slate-500">{label.description}</span>
            ) : null}

            {editable ? (
              <button
                type="button"
                onClick={() => {
                  void onDelete({ orgId, labelId: label.id as LabelId });
                }}
                className="ml-auto text-xs text-rose-600"
              >
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {editable ? (
        <form action={submit} className="space-y-3 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold">Add a label</h2>

          <div className="flex gap-3">
            <input
              name="name"
              placeholder="Label name"
              required
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              name="color"
              type="color"
              defaultValue="#94a3b8"
              className="h-9 w-12 rounded border border-slate-300"
            />
          </div>
          {fieldErrors.name !== undefined ? (
            <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
          ) : null}

          <input
            name="description"
            placeholder="Optional description"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add label"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
