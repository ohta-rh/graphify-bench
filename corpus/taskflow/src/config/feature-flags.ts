import type {
  FeatureFlagDefinition,
  FeatureFlagKey,
} from "@/types/feature-flag";

/**
 * Declarative registry of every feature flag. `isEnabled()` in
 * `src/lib/feature-flags.ts` is the only reader — UI and server code go
 * through that function, never through this table directly.
 */
export const FEATURE_FLAG_DEFINITIONS: Readonly<
  Record<FeatureFlagKey, FeatureFlagDefinition>
> = {
  kanban_board: {
    key: "kanban_board",
    label: "Kanban board",
    description: "Drag-and-drop board view for a project's issues.",
    strategy: { kind: "plan", minPlan: "starter" },
    overridable: true,
  },
  ai_issue_summary: {
    key: "ai_issue_summary",
    label: "AI issue summary",
    description: "Generates a short summary of a long issue thread.",
    strategy: { kind: "percentage", percent: 25 },
    overridable: true,
  },
  command_palette: {
    key: "command_palette",
    label: "Command palette",
    description: "Ctrl+K quick navigation and actions.",
    strategy: { kind: "on" },
    overridable: false,
  },
  activity_feed: {
    key: "activity_feed",
    label: "Activity feed",
    description: "Organization-wide audit trail view.",
    strategy: { kind: "plan", minPlan: "growth" },
    overridable: true,
  },
  public_projects: {
    key: "public_projects",
    label: "Public projects",
    description: "Share a read-only project page outside the organization.",
    strategy: { kind: "plan", minPlan: "enterprise" },
    overridable: true,
  },
  webhooks: {
    key: "webhooks",
    label: "Outgoing webhooks",
    description: "Deliver domain events to an external HTTP endpoint.",
    strategy: { kind: "plan", minPlan: "growth" },
    overridable: false,
  },
  csv_export: {
    key: "csv_export",
    label: "CSV export",
    description: "Export issues and the audit log as CSV.",
    strategy: { kind: "plan", minPlan: "starter" },
    overridable: true,
  },
  digest_email: {
    key: "digest_email",
    label: "Daily digest email",
    description: "Batches notifications into one daily email.",
    strategy: { kind: "plan", minPlan: "growth" },
    overridable: true,
  },
  issue_templates: {
    key: "issue_templates",
    label: "Issue templates",
    description: "Prefilled issue bodies per project.",
    strategy: { kind: "role", minRole: "admin" },
    overridable: true,
  },
  advanced_search: {
    key: "advanced_search",
    label: "Advanced search",
    description: "Field-scoped query syntax across issues and comments.",
    strategy: { kind: "plan", minPlan: "enterprise" },
    overridable: true,
  },
};

export const FEATURE_FLAG_KEYS = Object.keys(
  FEATURE_FLAG_DEFINITIONS,
) as readonly FeatureFlagKey[];

export function getFlagDefinition(key: FeatureFlagKey): FeatureFlagDefinition {
  return FEATURE_FLAG_DEFINITIONS[key];
}

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return Object.prototype.hasOwnProperty.call(FEATURE_FLAG_DEFINITIONS, value);
}
