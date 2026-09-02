"use client";

/**
 * Create/edit project form; previews the slug with `slugify`.
 *
 * Must call (do not reimplement): createProjectSchema, slugify
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/hooks/use-form-action";
import { isReservedSlug, projectKeyFromName, slugify } from "@/lib/slug";
import { createProjectSchema, type CreateProjectInput } from "@/schemas/project";
import type { ActionResult } from "@/types/api";
import type { OrgId, UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { Project, ProjectVisibility } from "@/types/project";
import type { ReactElement } from "react";

export type ProjectFormProps = {
  orgId: OrgId;
  members: readonly MemberWithUser[];
  defaultValues?: Partial<CreateProjectInput>;
  onSubmit: (input: CreateProjectInput) => Promise<ActionResult<Project>>;
};

const VISIBILITY_OPTIONS: readonly SelectOption[] = [
  { value: "private", label: "Private — invited project members only" },
  { value: "org", label: "Organization — anyone in this org" },
  { value: "public", label: "Public — anyone with the link" },
];

export function ProjectForm(props: ProjectFormProps): ReactElement | null {
  const { orgId, members, defaultValues, onSubmit } = props;

  const [name, setName] = useState(defaultValues?.name ?? "");
  // An empty override means "follow the name"; typing in the field pins it.
  const [slugOverride, setSlugOverride] = useState(defaultValues?.slug ?? "");
  const [description, setDescription] = useState(
    defaultValues?.description ?? "",
  );
  const [visibility, setVisibility] = useState<ProjectVisibility>(
    defaultValues?.visibility ?? "org",
  );
  const [leadId, setLeadId] = useState<UserId | null>(
    (defaultValues?.leadId as UserId | null | undefined) ?? null,
  );
  const [invalid, setInvalid] = useState<string | null>(null);

  const { submit, pending, error } = useFormAction(onSubmit);

  // Exactly the transformation the server applies, so the preview cannot lie.
  const slug = slugOverride.length > 0 ? slugify(slugOverride) : slugify(name);
  const reserved = slug.length > 0 && isReservedSlug(slug);

  async function handleSubmit(): Promise<void> {
    const parsed = createProjectSchema.safeParse({
      orgId,
      name,
      slug,
      key: defaultValues?.key ?? projectKeyFromName(name),
      description: description.length === 0 ? null : description,
      visibility,
      leadId,
      color: defaultValues?.color ?? "#6366f1",
      targetDate: defaultValues?.targetDate ?? null,
    });

    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setInvalid(null);
    await submit(parsed.data);
  }

  const leadOptions: readonly SelectOption[] = [
    { value: "", label: "No lead" },
    ...members.map((member) => ({
      value: member.userId,
      label: member.user.name,
    })),
  ];

  return (
    <div className="project-form space-y-4">
      <FormField name="name" label="Name" required>
        <Input
          name="name"
          value={name}
          placeholder="Payments platform"
          onChange={setName}
        />
      </FormField>

      <FormField
        name="slug"
        label="URL slug"
        hint={slug.length > 0 ? `/projects/${slug}` : "Derived from the name"}
        error={reserved ? `"${slug}" is reserved` : null}
      >
        <Input
          name="slug"
          value={slugOverride}
          placeholder={slugify(name)}
          invalid={reserved}
          onChange={setSlugOverride}
        />
      </FormField>

      <FormField name="description" label="Description">
        <Textarea
          name="description"
          rows={3}
          value={description}
          onChange={setDescription}
        />
      </FormField>

      <FormField name="visibility" label="Visibility">
        <Select
          name="visibility"
          value={visibility}
          options={VISIBILITY_OPTIONS}
          onChange={(value) => setVisibility(value as ProjectVisibility)}
        />
      </FormField>

      <FormField name="leadId" label="Project lead">
        <Select
          name="leadId"
          value={leadId ?? ""}
          options={leadOptions}
          onChange={(value) =>
            setLeadId(value.length === 0 ? null : (value as UserId))
          }
        />
      </FormField>

      <ErrorMessage message={invalid ?? error?.message ?? null} />

      <Button
        type="button"
        loading={pending}
        disabled={pending || reserved || name.length === 0}
        onClick={() => void handleSubmit()}
      >
        Save project
      </Button>
    </div>
  );
}
