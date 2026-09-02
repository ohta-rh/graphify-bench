"use client";

/**
 * Multi-select label chips.
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { LabelId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";
import type { ReactElement } from "react";

export type IssueLabelPickerProps = {
  value: readonly LabelId[];
  labels: readonly IssueLabel[];
  onChange: (labelIds: readonly LabelId[]) => void;
};

/** `createIssueSchema` caps `labelIds` at 20; the picker stops before the
 *  server has to reject the form. */
export const MAX_LABELS_PER_ISSUE = 20;

export function toggleLabel(
  selected: readonly LabelId[],
  labelId: LabelId,
): readonly LabelId[] {
  if (selected.includes(labelId)) {
    return selected.filter((id) => id !== labelId);
  }
  if (selected.length >= MAX_LABELS_PER_ISSUE) return selected;
  return [...selected, labelId];
}

export function IssueLabelPicker(
  props: IssueLabelPickerProps,
): ReactElement | null {
  const { value, labels, onChange } = props;

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => {
        const selected = value.includes(label.id);
        return (
          <button
            key={label.id}
            type="button"
            aria-pressed={selected}
            className={cn(
              "rounded-full",
              selected ? "ring-2 ring-indigo-500" : "opacity-70",
            )}
            onClick={() => onChange(toggleLabel(value, label.id))}
          >
            <Badge tone={selected ? "brand" : "neutral"} size="sm">
              {label.name}
            </Badge>
          </button>
        );
      })}
      {labels.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No labels defined for this organization yet.
        </p>
      ) : null}
    </div>
  );
}
