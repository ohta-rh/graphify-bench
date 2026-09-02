"use client";

/**
 * Archive confirmation explaining the soft-delete semantics.
 *
 * Must call (do not reimplement): can
 */
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { useFormAction } from "@/hooks/use-form-action";
import { can } from "@/lib/permissions";
import type { ArchiveProjectInput } from "@/schemas/project";
import type { ActionResult } from "@/types/api";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";
import { projectResource } from "../permission/resources";

export type ProjectArchiveDialogProps = {
  open: boolean;
  project: Project;
  actor: Actor;
  onConfirm: (input: ArchiveProjectInput) => Promise<ActionResult<Project>>;
  onClose: () => void;
};

export function ProjectArchiveDialog(
  props: ProjectArchiveDialogProps,
): ReactElement | null {
  const { open, project, actor, onConfirm, onClose } = props;

  const [archiveIssues, setArchiveIssues] = useState(true);
  const { submit, pending, error } = useFormAction(onConfirm, {
    onSuccess: onClose,
  });

  if (!open) return null;
  if (!can(actor, "project:archive", projectResource(project))) return null;

  return (
    <Dialog
      open={open}
      title={`Archive ${project.name}?`}
      description="Archiving is reversible — nothing is deleted."
      onClose={onClose}
      footer={
        <DialogFooter>
          <Button variant="secondary" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            disabled={pending}
            onClick={() =>
              void submit({
                orgId: project.orgId,
                projectId: project.id,
                archiveIssues,
              })
            }
          >
            Archive project
          </Button>
        </DialogFooter>
      }
    >
      <Alert tone="info" title="What archiving does">
        The project keeps its data and stops appearing in lists, boards and
        search. An owner can restore it later and every issue comes back.
      </Alert>

      <Checkbox
        name="archiveIssues"
        checked={archiveIssues}
        onChange={setArchiveIssues}
      >
        Also archive the issues in this project
      </Checkbox>

      <ErrorMessage message={error?.message ?? null} />
    </Dialog>
  );
}
