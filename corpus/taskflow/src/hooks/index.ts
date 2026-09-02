/**
 * Barrel for the hook layer.
 *
 * Client components import from `@/hooks`; the private stores and pure
 * helpers behind these hooks (`toast-store`, `optimistic-issues-reducer`,
 * `command-groups`, …) are deliberately not re-exported — they are
 * implementation detail and their own tests import them by path.
 */
export { OrgProvider, OrgContext } from "./org-context";
export type { OrgContextValue, OrgProviderProps } from "./org-context";
export {
  ANONYMOUS_FLAG_CONTEXT,
  FlagSnapshotContext,
  orgFlagContext,
  readFlag,
} from "./flag-context";

export { useCommandPalette, COMMAND_PALETTE_SHORTCUT } from "./use-command-palette";
export { useDebouncedValue } from "./use-debounced-value";
export { useFeatureFlag } from "./use-feature-flag";
export { useFormAction } from "./use-form-action";
export type { FormActionOptions } from "./use-form-action";
export { useIssueFilters } from "./use-issue-filters";
export { useKeyboardShortcut } from "./use-keyboard-shortcut";
export { useNotifications } from "./use-notifications";
export { useOptimisticIssues } from "./use-optimistic-issues";
export { useOrg, useOrgContext } from "./use-org";
export { usePagination } from "./use-pagination";
export { usePermission } from "./use-permission";
export { usePlanLimits } from "./use-plan-limits";
export { useToast } from "./use-toast";
