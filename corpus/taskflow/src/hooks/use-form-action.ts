"use client";

/**
 * Bridges react-hook-form submission to a Server Action's `ActionResult`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ActionResult, AppErrorShape } from "@/types/api";
export type FormActionOptions = { onSuccess?: () => void; onError?: (error: AppErrorShape) => void; resetOnSuccess?: boolean };

export function useFormAction<TInput, TData>(action: (input: TInput) => Promise<ActionResult<TData>>, options?: FormActionOptions): { submit: (input: TInput) => Promise<void>; pending: boolean; error: AppErrorShape | null } {
  throw new Error("stub: src/hooks/use-form-action.ts");
}
