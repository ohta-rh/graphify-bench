/**
 * Upgrade prompt shown when seats are exhausted.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { LimitCheck } from "@/types/billing";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type SeatLimitBannerProps = { check: LimitCheck; orgSlug: string; actor: Actor };

export function SeatLimitBanner(props: SeatLimitBannerProps): ReactElement | null {
  return null;
}
