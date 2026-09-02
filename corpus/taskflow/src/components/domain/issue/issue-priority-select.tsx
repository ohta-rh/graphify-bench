"use client";

/**
 * Priority dropdown driven by `ISSUE_PRIORITIES`.
 */
import { Select, type SelectOption } from "@/components/ui/select";
import { humanizePriority } from "@/lib/format";
import { ISSUE_PRIORITIES, type IssuePriority } from "@/types/issue";
import type { ReactElement } from "react";

export type IssuePrioritySelectProps = {
  value: IssuePriority;
  disabled?: boolean;
  onChange: (priority: IssuePriority) => void;
};

function priorityOptions(): readonly SelectOption[] {
  return ISSUE_PRIORITIES.map((priority) => ({
    value: priority,
    label: humanizePriority(priority),
  }));
}

export function IssuePrioritySelect(
  props: IssuePrioritySelectProps,
): ReactElement | null {
  return (
    <Select
      name="priority"
      value={props.value}
      options={priorityOptions()}
      disabled={props.disabled ?? false}
      onChange={(value) => props.onChange(value as IssuePriority)}
    />
  );
}
