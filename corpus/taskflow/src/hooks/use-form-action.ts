"use client";

/**
 * Bridges react-hook-form submission to a Server Action's `ActionResult`.
 *
 * Actions never throw for expected failures — they return
 * `{ ok: false, error }` so the form can render field errors without an error
 * boundary. This hook keeps that contract in one place: expected failures land
 * in `error`, and anything that genuinely throws is normalised by
 * `toAppError()` so the caller only ever sees an `AppErrorShape`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toAppError } from "@/lib/errors";
import type { ActionResult, AppErrorShape } from "@/types/api";

export type FormActionOptions = {
  onSuccess?: () => void;
  onError?: (error: AppErrorShape) => void;
  resetOnSuccess?: boolean;
};

export function useFormAction<TInput, TData>(
  action: (input: TInput) => Promise<ActionResult<TData>>,
  options?: FormActionOptions,
): {
  submit: (input: TInput) => Promise<void>;
  pending: boolean;
  error: AppErrorShape | null;
} {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppErrorShape | null>(null);

  // Callers pass an inline options object; a ref keeps `submit` stable so the
  // form does not re-register its handler on every render.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const submit = useCallback(
    async (input: TInput): Promise<void> => {
      const current = optionsRef.current;
      setPending(true);
      try {
        const result = await action(input);
        if (result.ok) {
          if (current?.resetOnSuccess !== false) setError(null);
          current?.onSuccess?.();
        } else {
          setError(result.error);
          current?.onError?.(result.error);
        }
      } catch (thrown) {
        const appError = toAppError(thrown);
        setError(appError);
        current?.onError?.(appError);
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { submit, pending, error };
}
