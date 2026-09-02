/**
 * Display formatting for money, counts, byte sizes and enum labels.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IssuePriority, IssueStatus } from "@/types/issue";
import type { Role } from "@/types/member";
export function formatCents(cents: number, currency?: string): string {
  throw new Error("stub: src/lib/format.ts");
}

export function formatCount(value: number): string {
  throw new Error("stub: src/lib/format.ts");
}

export function formatBytes(bytes: number): string {
  throw new Error("stub: src/lib/format.ts");
}

export function formatLimit(limit: number): string {
  throw new Error("stub: src/lib/format.ts");
}

export function humanizeStatus(status: IssueStatus): string {
  throw new Error("stub: src/lib/format.ts");
}

export function humanizePriority(priority: IssuePriority): string {
  throw new Error("stub: src/lib/format.ts");
}

export function humanizeRole(role: Role): string {
  throw new Error("stub: src/lib/format.ts");
}

export function issueKey(projectKey: string, issueNumber: number): string {
  throw new Error("stub: src/lib/format.ts");
}
