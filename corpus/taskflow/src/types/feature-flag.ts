import type { OrgId, UserId } from "./common";
import type { PlanId } from "./billing";
import type { Role } from "./member";

/**
 * Every feature flag known to Taskflow. Adding a key here obliges you to add a
 * matching entry to `FEATURE_FLAG_DEFINITIONS` in `src/config/feature-flags.ts`
 * — the type is what keeps the two in sync.
 */
export type FeatureFlagKey =
  | "kanban_board"
  | "ai_issue_summary"
  | "command_palette"
  | "activity_feed"
  | "public_projects"
  | "webhooks"
  | "csv_export"
  | "digest_email"
  | "issue_templates"
  | "advanced_search";

export type FlagRolloutStrategy =
  | { readonly kind: "off" }
  | { readonly kind: "on" }
  | { readonly kind: "plan"; readonly minPlan: PlanId }
  | { readonly kind: "role"; readonly minRole: Role }
  | { readonly kind: "percentage"; readonly percent: number };

export interface FeatureFlagDefinition {
  readonly key: FeatureFlagKey;
  readonly label: string;
  readonly description: string;
  readonly strategy: FlagRolloutStrategy;
  /** When true the org-level override in `OrganizationSettings` can turn it on. */
  readonly overridable: boolean;
}

/**
 * Evaluation context passed to `isEnabled()`. The same shape is used on the
 * server (built from the session) and in the client via `useFeatureFlag`.
 */
export interface FlagContext {
  readonly orgId: OrgId | null;
  readonly userId: UserId | null;
  readonly plan: PlanId;
  readonly role: Role | null;
  readonly overrides?: readonly string[];
}

/** Serialisable snapshot handed from a server layout to the client provider. */
export type FeatureFlagSnapshot = Readonly<Record<FeatureFlagKey, boolean>>;
