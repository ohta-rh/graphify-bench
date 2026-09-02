"use client";

/**
 * Status dropdown driven by `ISSUE_STATUSES`.
 */
import { Select, type SelectOption } from "@/components/ui/select";
import { humanizeStatus } from "@/lib/format";
import { ISSUE_STATUSES, type IssueStatus } from "@/types/issue";
import type { ReactElement } from "react";

export type IssueStatusSelectProps = {
  value: IssueStatus;
  disabled?: boolean;
  onChange: (status: IssueStatus) => void;
};

/** Derived from the enum so a new status needs no change here. */
function statusOptions(): readonly SelectOption[] {
  return ISSUE_STATUSES.map((status) => ({
    value: status,
    label: humanizeStatus(status),
  }));
}

export function IssueStatusSelect(
  props: IssueStatusSelectProps,
): ReactElement | null {
  const options = statusOptions();
  return (
    <Select
      name="status"
      value={props.value}
      options={options}
      disabled={props.disabled ?? false}
      onChange={(value) => props.onChange(value as IssueStatus)}
    />
  );
}
