"use client";

/**
 * Endpoint list plus the "add endpoint" form.
 *
 * Owner D. Private to the webhooks route. The event-type checkboxes are driven
 * by `webhookEventTypeSchema` so the list of subscribable events cannot drift
 * from what the server will accept.
 */

import { useActionState } from "react";
import { fieldErrorsFromZod } from "@/lib/errors";
import { createWebhookSchema, webhookEventTypeSchema } from "@/schemas/webhook";
import type { WebhookEndpointRow } from "@/server/db/schema/webhooks";
import type { ActionResult } from "@/types/api";
import type { OrgId, WebhookId } from "@/types/common";

export type WebhookManagerProps = {
  orgId: OrgId;
  endpoints: readonly WebhookEndpointRow[];
  atLimit: boolean;
  onCreate: (input: unknown) => Promise<ActionResult<WebhookEndpointRow>>;
  onDelete: (input: unknown) => Promise<ActionResult<null>>;
};

type CreateState = ActionResult<WebhookEndpointRow> | null;

const EVENT_TYPES = webhookEventTypeSchema.options;

export function WebhookManager(props: WebhookManagerProps) {
  const { orgId, endpoints, atLimit, onCreate, onDelete } = props;

  const [state, submit, pending] = useActionState<CreateState, FormData>(
    async (_previous, formData) => {
      const parsed = createWebhookSchema.safeParse({
        orgId,
        url: String(formData.get("url") ?? ""),
        eventTypes: formData.getAll("eventTypes").map(String),
      });

      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: "validation_failed",
            message: "Check the endpoint details.",
            fieldErrors: fieldErrorsFromZod(parsed.error),
          },
        };
      }

      return onCreate(parsed.data);
    },
    null,
  );

  const fieldErrors = state?.ok === false ? (state.error.fieldErrors ?? {}) : {};

  return (
    <div className="space-y-8">
      <ul className="space-y-2">
        {endpoints.map((endpoint) => (
          <li
            key={endpoint.id}
            className="flex items-start gap-4 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{endpoint.url}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {endpoint.enabled ? "Enabled" : "Disabled"} · {endpoint.eventTypes}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void onDelete({ orgId, webhookId: endpoint.id as WebhookId });
              }}
              className="text-xs text-rose-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <form action={submit} className="space-y-4 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold">Add an endpoint</h2>

        {atLimit ? (
          <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This plan&apos;s webhook quota is full. Delete one first, or upgrade.
          </p>
        ) : null}

        {state?.ok === false && state.error.code === "plan_limit_exceeded" ? (
          <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {state.error.message}
          </p>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="url" className="text-sm font-medium">
            Endpoint URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            disabled={atLimit}
            placeholder="https://example.com/hooks/taskflow"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
          />
          {fieldErrors.url !== undefined ? (
            <p className="text-xs text-rose-600">{fieldErrors.url[0]}</p>
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Events</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {EVENT_TYPES.map((eventType) => (
              <label key={eventType} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="eventTypes"
                  value={eventType}
                  disabled={atLimit}
                />
                {eventType}
              </label>
            ))}
          </div>
          {fieldErrors.eventTypes !== undefined ? (
            <p className="text-xs text-rose-600">{fieldErrors.eventTypes[0]}</p>
          ) : null}
        </fieldset>

        <button
          type="submit"
          disabled={atLimit || pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add endpoint"}
        </button>
      </form>
    </div>
  );
}
