"use client";

/**
 * Invite form that disables submit once the seat quota is reached.
 *
 * Must call (do not reimplement): inviteMemberSchema, can, getPlanLimits
 */
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { getPlanLimits } from "@/config/plan-limits";
import { formatLimit } from "@/lib/format";
import { can } from "@/lib/permissions";
import { useFormAction } from "@/hooks/use-form-action";
import { inviteMemberSchema, type InviteMemberInput } from "@/schemas/member";
import type { ActionResult } from "@/types/api";
import type { LimitCheck } from "@/types/billing";
import type { OrgId } from "@/types/common";
import type { Actor, Invitation, Role } from "@/types/member";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";
import { RoleSelect } from "./role-select";

export type InviteMemberFormProps = {
  orgId: OrgId;
  actor: Actor;
  seatCheck: LimitCheck;
  onSubmit: (input: InviteMemberInput) => Promise<ActionResult<Invitation>>;
};

export function InviteMemberForm(
  props: InviteMemberFormProps,
): ReactElement | null {
  const { orgId, actor, seatCheck, onSubmit } = props;

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [invalid, setInvalid] = useState<string | null>(null);

  const { submit, pending, error } = useFormAction(onSubmit, {
    onSuccess: () => setEmail(""),
  });

  // Hiding the form is not the enforcement — `inviteMemberAction` calls
  // `assertCan` for the same pair — but offering an impossible action is worse
  // than not offering it.
  if (!can(actor, "member:invite", organizationResource(orgId))) return null;

  // The quota number comes from the plan table, never from a literal.
  const limits = getPlanLimits(seatCheck.plan);
  const seatsExhausted = seatCheck.exceeded || seatCheck.remaining <= 0;

  async function handleSubmit(): Promise<void> {
    const parsed = inviteMemberSchema.safeParse({ orgId, email, role });
    if (!parsed.success) {
      setInvalid(parsed.error.issues[0]?.message ?? "Check the address");
      return;
    }
    setInvalid(null);
    await submit(parsed.data);
  }

  return (
    <div className="invite-member-form space-y-3">
      {seatsExhausted ? (
        <Alert tone="warning" title="Seat limit reached">
          The {seatCheck.plan} plan includes {formatLimit(limits.seats)} seats
          and {seatCheck.used} are in use. Upgrade to invite more teammates.
        </Alert>
      ) : null}

      <FormField name="email" label="Email" required error={invalid}>
        <Input
          name="email"
          type="email"
          value={email}
          placeholder="teammate@example.com"
          invalid={invalid !== null}
          disabled={seatsExhausted}
          onChange={setEmail}
        />
      </FormField>

      <FormField name="role" label="Role">
        <RoleSelect
          value={role}
          actor={actor}
          disabled={seatsExhausted}
          onChange={setRole}
        />
      </FormField>

      <ErrorMessage message={error?.message ?? null} />

      <Button
        type="button"
        loading={pending}
        disabled={pending || seatsExhausted || email.length === 0}
        onClick={() => void handleSubmit()}
      >
        Send invitation
      </Button>
    </div>
  );
}
