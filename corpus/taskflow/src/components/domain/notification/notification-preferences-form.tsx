"use client";

/**
 * Per-kind channel matrix; the digest column is hidden unless `digest_email`
 * is on.
 *
 * Must call (do not reimplement): isEnabled
 */
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { ANONYMOUS_FLAG_CONTEXT } from "@/hooks/flag-context";
import { useFormAction } from "@/hooks/use-form-action";
import { isEnabled } from "@/lib/feature-flags";
import type { UpdateNotificationPreferenceInput } from "@/schemas/notification";
import type { ActionResult } from "@/types/api";
import type { OrgId, UserId } from "@/types/common";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type {
  NotificationKind,
  NotificationPreference,
} from "@/types/notification";
import type { ReactElement } from "react";

export type NotificationPreferencesFormProps = {
  orgId: OrgId;
  userId: UserId;
  preferences: readonly NotificationPreference[];
  flags: FeatureFlagSnapshot;
  onSubmit: (
    input: UpdateNotificationPreferenceInput,
  ) => Promise<ActionResult<NotificationPreference>>;
};

const KIND_LABELS: Readonly<Record<NotificationKind, string>> = {
  issue_assigned: "Issue assigned to me",
  issue_status_changed: "Issue status changed",
  issue_due_soon: "Issue due soon",
  issue_overdue: "Issue overdue",
  comment_created: "New comment",
  comment_mention: "I was mentioned",
  member_invited: "Member invited",
  member_joined: "Member joined",
  project_archived: "Project archived",
  plan_limit_reached: "Plan limit reached",
  digest_ready: "Daily digest ready",
};

export function NotificationPreferencesForm(
  props: NotificationPreferencesFormProps,
): ReactElement | null {
  const { orgId, userId, preferences, flags, onSubmit } = props;
  const { submit, pending } = useFormAction(onSubmit);

  const digestOn =
    flags.digest_email === true ||
    isEnabled("digest_email", ANONYMOUS_FLAG_CONTEXT);

  function update(
    preference: NotificationPreference,
    patch: Partial<
      Pick<NotificationPreference, "inApp" | "email" | "digestOnly">
    >,
  ): void {
    void submit({
      orgId,
      userId,
      kind: preference.kind,
      inApp: patch.inApp ?? preference.inApp,
      email: patch.email ?? preference.email,
      digestOnly: patch.digestOnly ?? preference.digestOnly,
    });
  }

  return (
    <Table caption="Notification preferences">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Event</TableHeaderCell>
          <TableHeaderCell>In app</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          {digestOn ? <TableHeaderCell>Digest only</TableHeaderCell> : null}
        </TableRow>
      </TableHead>

      <TableBody>
        {preferences.map((preference) => (
          <TableRow key={preference.kind}>
            <TableCell>{KIND_LABELS[preference.kind]}</TableCell>

            <TableCell className="w-24">
              <Switch
                name={`${preference.kind}-in-app`}
                checked={preference.inApp}
                disabled={pending}
                onChange={(checked) => update(preference, { inApp: checked })}
              />
            </TableCell>

            <TableCell className="w-24">
              <Switch
                name={`${preference.kind}-email`}
                checked={preference.email}
                disabled={pending}
                onChange={(checked) => update(preference, { email: checked })}
              />
            </TableCell>

            {digestOn ? (
              <TableCell className="w-28">
                <Switch
                  name={`${preference.kind}-digest`}
                  checked={preference.digestOnly}
                  // Batching only makes sense when email is on at all.
                  disabled={pending || !preference.email}
                  onChange={(checked) =>
                    update(preference, { digestOnly: checked })
                  }
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
