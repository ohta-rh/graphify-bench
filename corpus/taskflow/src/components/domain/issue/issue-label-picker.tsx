"use client";

/**
 * Multi-select label chips.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { LabelId } from "@/types/common";
import type { IssueLabel } from "@/types/issue";
import type { ReactElement } from "react";
export type IssueLabelPickerProps = { value: readonly LabelId[]; labels: readonly IssueLabel[]; onChange: (labelIds: readonly LabelId[]) => void };

export function IssueLabelPicker(props: IssueLabelPickerProps): ReactElement | null {
  return null;
}
