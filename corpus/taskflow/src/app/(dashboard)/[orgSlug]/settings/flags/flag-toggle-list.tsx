"use client";

/**
 * Flag rows with a switch each.
 *
 * Owner D. Private to the flags route. The switch is only offered for
 * `overridable` flags; the rest are shown read-only with the reason they are on
 * or off, which is more useful than a disabled control with no explanation.
 */

import { useTransition } from "react";
import type { FeatureFlagKey } from "@/types/feature-flag";

export type FlagRow = {
  readonly key: FeatureFlagKey;
  readonly label: string;
  readonly description: string;
  readonly strategy: string;
  readonly overridable: boolean;
  readonly overridden: boolean;
  readonly enabled: boolean;
};

export type FlagToggleListProps = {
  rows: readonly FlagRow[];
  onToggle: (flag: FeatureFlagKey, enabled: boolean) => void;
};

export function FlagToggleList(props: FlagToggleListProps) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {props.rows.map((row) => (
        <li key={row.key} className="flex items-start gap-4 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{row.label}</p>
            <p className="mt-0.5 text-sm text-slate-600">{row.description}</p>
            <p className="mt-1 text-xs text-slate-400">
              {row.strategy}
              {row.overridden ? " · overridden for this organization" : ""}
            </p>
          </div>

          {row.overridable ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.enabled}
                disabled={pending}
                onChange={(event) => {
                  const next = event.target.checked;
                  startTransition(() => {
                    props.onToggle(row.key, next);
                  });
                }}
              />
              {row.enabled ? "On" : "Off"}
            </label>
          ) : (
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {row.enabled ? "On" : "Off"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
