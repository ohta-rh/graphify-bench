"use client";

/**
 * Per-kind channel matrix; the digest column is hidden unless `digest_email` is on.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled
 */
import type { UpdateNotificationPreferenceInput } from "@/schemas/notification";
import type { ActionResult } from "@/types/api";
import type { OrgId, UserId } from "@/types/common";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { NotificationPreference } from "@/types/notification";
import type { ReactElement } from "react";
export type NotificationPreferencesFormProps = { orgId: OrgId; userId: UserId; preferences: readonly NotificationPreference[]; flags: FeatureFlagSnapshot; onSubmit: (input: UpdateNotificationPreferenceInput) => Promise<ActionResult<NotificationPreference>> };

export function NotificationPreferencesForm(props: NotificationPreferencesFormProps): ReactElement | null {
  return null;
}
