/**
 * One audit row per domain event; day grouping.
 *
 * Owner C implements `@/server/services/activity-service`, which subscribes to
 * the event bus at module init.
 */
import { describe, it } from "vitest";

describe("services/activity-service", () => {
  // subscribe() is registered for each ActivityAction-shaped event type.
  it.todo("subscribes to every event that maps to an ActivityAction");

  // One emit produces exactly one activity row, with the actor and subject.
  it.todo("records one audit row per emitted event");

  // A second identical emit produces a second row — the log is append-only.
  it.todo("appends rather than de-duplicates repeated events");

  // A throwing repository must not fail the emit for sibling subscribers.
  it.todo("isolates a write failure from the emitting service");

  // groupByDay buckets rows into ActivityGroup entries keyed by calendar day.
  it.todo("groups the feed into calendar days");

  // Rows are scoped to the actor's org, and export needs activity:export.
  it.todo("scopes the feed to the actor's organization");
});
