/**
 * Field-level validation message bound to an input.
 *
 * Owner A — design system. The id it renders is the one `Input` / `Textarea`
 * point at through `aria-errormessage`, which is why the convention
 * `${field}-error` lives in both files.
 */
import type { ReactElement } from "react";

export type ErrorMessageProps = { message?: string | null; fieldId?: string };

/** The id an invalid control should reference for `fieldId`. */
export function errorMessageId(fieldId: string): string {
  return `${fieldId}-error`;
}

export function ErrorMessage(props: ErrorMessageProps): ReactElement | null {
  const { message, fieldId } = props;

  // Rendering nothing is correct here: an empty live region would still be
  // announced by some screen readers on every re-render.
  if (message === undefined || message === null || message.trim() === "") {
    return null;
  }

  return (
    <p
      id={fieldId !== undefined ? errorMessageId(fieldId) : undefined}
      role="alert"
      className="mt-1 text-xs font-medium text-red-600"
    >
      {message}
    </p>
  );
}
