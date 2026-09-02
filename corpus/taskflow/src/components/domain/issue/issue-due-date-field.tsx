"use client";

/**
 * Due-date control that flags overdue values.
 */
import { DatePicker } from "@/components/ui/date-picker";
import { toIsoTimestamp } from "@/types/common";
import { isOverdue } from "@/lib/date";
import type { IsoTimestamp } from "@/types/common";
import type { ReactElement } from "react";

export type IssueDueDateFieldProps = {
  value: IsoTimestamp | null;
  onChange: (value: IsoTimestamp | null) => void;
};

/** The picker speaks `YYYY-MM-DD`; the domain stores full ISO timestamps. */
export function toDateInputValue(value: IsoTimestamp | null): string | null {
  return value === null ? null : value.slice(0, 10);
}

export function fromDateInputValue(value: string | null): IsoTimestamp | null {
  if (value === null || value.length === 0) return null;
  // End of day: an issue due "today" is not overdue at 09:00.
  return toIsoTimestamp(new Date(`${value}T23:59:59.999Z`));
}

export function IssueDueDateField(
  props: IssueDueDateFieldProps,
): ReactElement | null {
  const overdue = isOverdue(props.value);

  return (
    <div className="space-y-1">
      <DatePicker
        value={toDateInputValue(props.value)}
        placeholder="No due date"
        onChange={(value) => props.onChange(fromDateInputValue(value))}
      />
      {overdue ? (
        <p className="text-xs text-red-600">This issue is past its due date.</p>
      ) : null}
    </div>
  );
}
