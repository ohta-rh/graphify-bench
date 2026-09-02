"use client";

/**
 * Owns the open/closed state of the archive confirmation dialog.
 *
 * Owner D. A Server Component cannot hand `onClose` to a client dialog — event
 * handlers are not serialisable — so the state lives here and the page passes
 * only data and the Server Action.
 */

import { useState } from "react";
import { ProjectArchiveDialog } from "@/components/domain/project/project-archive-dialog";
import type { ActionResult } from "@/types/api";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";

export type ArchiveProjectPanelProps = {
  project: Project;
  actor: Actor;
  onConfirm: (input: unknown) => Promise<ActionResult<Project>>;
};

export function ArchiveProjectPanel(props: ArchiveProjectPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900"
      >
        Archive project…
      </button>

      <ProjectArchiveDialog
        open={open}
        project={props.project}
        actor={props.actor}
        onConfirm={props.onConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
