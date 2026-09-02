/**
 * Cross-cutting constants that are neither plan limits nor flags (page sizes,
 * edit windows, retry counts).
 *
 * Quotas live in `@/config/plan-limits` and rollout gates in
 * `@/config/feature-flags`; anything that is neither — a default page size, a
 * grace window, a retry budget — belongs here so the number exists once.
 */

/** Rows per page for every cursor-paginated list unless the caller overrides. */
export const DEFAULT_PAGE_SIZE: number = 25;

/** Upper bound the pagination schemas clamp `limit` to. */
export const MAX_PAGE_SIZE: number = 100;

/** How long after posting a comment its author may still edit it. */
export const COMMENT_EDIT_WINDOW_MINUTES: number = 15;

/** Delivery attempts before the webhook dispatcher parks a delivery. */
export const WEBHOOK_MAX_ATTEMPTS: number = 5;

/** Hard cap on entries rendered in one digest email. */
export const DIGEST_MAX_ENTRIES: number = 50;

/** How far ahead the overdue job looks when collecting due issues. */
export const OVERDUE_LOOKAHEAD_HOURS: number = 24;
