"use client";

/**
 * Editor for name, description, visibility, status, lead and colour.
 *
 * Owner D. Private to the project settings route. `updateProjectSchema` makes
 * every field optional, so the form sends the whole set and lets the service
 * diff them — which is also what produces `changedFields` on the event.
 */

import { useActionState } from "react";
import { fieldErrorsFromZod } from "@/lib/errors";
import { updateProjectSchema } from "@/schemas/project";
import type { ActionResult } from "@/types/api";
import type { OrgId, UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { Project } from "@/types/project";

export type ProjectSettingsFormProps = {
  orgId: OrgId;
  project: Project;
  members: readonly MemberWithUser[];
  onSubmit: (input: unknown) => Promise<ActionResult<Project>>;
};

type SettingsState = ActionResult<Project> | null;

export function ProjectSettingsForm(props: ProjectSettingsFormProps) {
  const { orgId, project, members, onSubmit } = props;

  const [state, submit, pending] = useActionState<SettingsState, FormData>(
    async (_previous, formData) => {
      const leadId = String(formData.get("leadId") ?? "");
      const description = String(formData.get("description") ?? "").trim();

      const parsed = updateProjectSchema.safeParse({
        orgId,
        projectId: project.id,
        name: String(formData.get("name") ?? ""),
        description: description.length === 0 ? null : description,
        visibility: String(formData.get("visibility") ?? project.visibility),
        status: String(formData.get("status") ?? project.status),
        color: String(formData.get("color") ?? project.color),
        leadId: leadId.length === 0 ? null : (leadId as UserId),
      });

      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "validation_failed",
            message: "Check the fields below.",
            fieldErrors: fieldErrorsFromZod(parsed.error),
          },
        };
      }

      return onSubmit(parsed.data);
    },
    null,
  );

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <form action={submit} className="space-y-5">
      {state?.ok === true ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Project updated.
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={project.name}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {fieldErrors.name !== undefined ? (
          <p className="text-xs text-rose-600">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={project.description ?? ""}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="visibility" className="text-sm font-medium">
            Visibility
          </label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={project.visibility}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="private">Private — people on the project</option>
            <option value="org">Organization — everybody here</option>
            <option value="public">Public — anybody with the link</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project.status}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="leadId" className="text-sm font-medium">
            Lead
          </label>
          <select
            id="leadId"
            name="leadId"
            defaultValue={project.leadId ?? ""}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">No lead</option>
            {members.map((member) => (
              <option key={member.id} value={member.userId}>
                {member.user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="color" className="text-sm font-medium">
            Colour
          </label>
          <input
            id="color"
            name="color"
            type="color"
            defaultValue={project.color}
            className="h-9 w-16 rounded border border-slate-300"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save project"}
      </button>
    </form>
  );
}
