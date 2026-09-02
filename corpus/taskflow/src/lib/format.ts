/**
 * Display formatting for money, counts, byte sizes and enum labels.
 *
 * The humanizers here are the only place a domain enum turns into prose —
 * components render `humanizeStatus(issue.status)` rather than carrying their
 * own label maps, so a new status value shows up consistently everywhere.
 */
import { UNLIMITED } from "@/config/plan-limits";
import type { IssuePriority, IssueStatus } from "@/types/issue";
import type { Role } from "@/types/member";

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** 1_234 → "1,234"; 12_400 → "12.4K"; 3_100_000 → "3.1M". */
export function formatCount(value: number): string {
  const abs = Math.abs(value);
  if (abs < 10_000) return new Intl.NumberFormat("en-US").format(value);
  if (abs < 1_000_000) return `${trimZero(value / 1_000)}K`;
  return `${trimZero(value / 1_000_000)}M`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${trimZero(value)} ${BYTE_UNITS[unit]}`;
}

/** Renders a plan quota, including the `Infinity` "no limit" sentinel. */
export function formatLimit(limit: number): string {
  return limit === UNLIMITED || !Number.isFinite(limit)
    ? "Unlimited"
    : formatCount(limit);
}

const STATUS_LABELS: Readonly<Record<IssueStatus, string>> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  canceled: "Canceled",
};

const PRIORITY_LABELS: Readonly<Record<IssuePriority, string>> = {
  none: "No priority",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function humanizeStatus(status: IssueStatus): string {
  return STATUS_LABELS[status];
}

export function humanizePriority(priority: IssuePriority): string {
  return PRIORITY_LABELS[priority];
}

export function humanizeRole(role: Role): string {
  return ROLE_LABELS[role];
}

/** The short reference shown on cards and in links, e.g. "TF-142". */
export function issueKey(projectKey: string, issueNumber: number): string {
  return `${projectKey.toUpperCase()}-${issueNumber}`;
}
