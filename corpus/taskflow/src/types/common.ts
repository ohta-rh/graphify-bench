/**
 * Primitive identifier and envelope types shared by every Taskflow domain type.
 *
 * Every entity in Taskflow uses opaque branded string ids so that an `IssueId`
 * can never be silently passed where a `ProjectId` is expected. Ids are ULID
 * strings at runtime; the brand exists only at the type level.
 */

declare const brand: unique symbol;

/** Attaches a compile-time-only tag to a primitive type. */
export type Branded<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Branded<string, "UserId">;
export type OrgId = Branded<string, "OrgId">;
export type ProjectId = Branded<string, "ProjectId">;
export type IssueId = Branded<string, "IssueId">;
export type CommentId = Branded<string, "CommentId">;
export type MemberId = Branded<string, "MemberId">;
export type NotificationId = Branded<string, "NotificationId">;
export type ActivityId = Branded<string, "ActivityId">;
export type InvitationId = Branded<string, "InvitationId">;
export type LabelId = Branded<string, "LabelId">;
export type AttachmentId = Branded<string, "AttachmentId">;
export type SubscriptionId = Branded<string, "SubscriptionId">;
export type SessionId = Branded<string, "SessionId">;
export type WebhookId = Branded<string, "WebhookId">;

/** Union of every branded id used in the app, for generic id helpers. */
export type AnyId =
  | UserId
  | OrgId
  | ProjectId
  | IssueId
  | CommentId
  | MemberId
  | NotificationId
  | ActivityId
  | InvitationId
  | LabelId
  | AttachmentId
  | SubscriptionId
  | SessionId
  | WebhookId;

/** ISO-8601 timestamp string as stored in SQLite text columns. */
export type IsoTimestamp = Branded<string, "IsoTimestamp">;

/** Rows carrying the standard created/updated bookkeeping columns. */
export interface Timestamps {
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Soft-delete marker. `archivedAt === null` means the row is live. Repositories
 * must filter on this via the helpers in `src/lib/soft-delete.ts` rather than
 * writing the predicate by hand.
 */
export interface SoftDeletable {
  readonly archivedAt: IsoTimestamp | null;
}

/** Rows that belong to exactly one tenant. Enforced by `src/lib/tenant.ts`. */
export interface TenantScoped {
  readonly orgId: OrgId;
}

export type SortDirection = "asc" | "desc";

export interface SortSpec<TField extends string = string> {
  readonly field: TField;
  readonly direction: SortDirection;
}

/** Cursor pagination request shared by every repository `list*` method. */
export interface PageRequest {
  readonly limit: number;
  readonly cursor?: string | null;
}

/** Cursor pagination response shared by every repository `list*` method. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly total: number;
}

/** Options accepted by every soft-delete-aware repository read. */
export interface ArchiveScope {
  readonly includeArchived?: boolean;
}

export function makePage<T>(
  items: readonly T[],
  nextCursor: string | null,
  total: number,
): Page<T> {
  return { items, nextCursor, total };
}

export function toIsoTimestamp(value: Date | string): IsoTimestamp {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString() as IsoTimestamp;
}
