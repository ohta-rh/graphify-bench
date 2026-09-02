/**
 * Label + control + hint + error layout used by every form.
 *
 * Owner A — design system. Server-renderable. The child control is expected to
 * carry `id={name}`, which every primitive in this directory already does — that
 * is what makes the label click-through and the error association work.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ErrorMessage } from "./error-message";
import { Label } from "./label";

export type FormFieldProps = { name: string; label: string; hint?: string; error?: string | null; required?: boolean; children?: ReactNode };

export function FormField(props: FormFieldProps): ReactElement | null {
  const { name, label, hint, error, required = false, children } = props;

  const invalid = typeof error === "string" && error.trim() !== "";

  return (
    <div className={cn("flex flex-col gap-1.5", invalid && "has-error")}>
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      {children}
      {hint !== undefined && !invalid ? (
        <p id={`${name}-hint`} className="text-xs text-black/50 dark:text-white/50">
          {hint}
        </p>
      ) : null}
      <ErrorMessage message={error} fieldId={name} />
    </div>
  );
}
