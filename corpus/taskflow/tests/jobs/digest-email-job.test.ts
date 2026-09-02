/**
 * Runs only for orgs whose digest hour has arrived and whose plan includes it.
 *
 * Owner C implements `@/server/jobs/digest-email-job`. The window arithmetic
 * itself is covered by `tests/lib/date.test.ts`.
 */
import { describe, it } from "vitest";

describe("jobs/digest-email-job", () => {
  // digestWindow(settings.digestHourUtc, now) selects the window to cover.
  it.todo("uses the org's configured digest hour to pick the window");

  // An org whose digest hour has not arrived is skipped this run.
  it.todo("skips an org whose digest hour has not arrived");

  // isEnabled("digest_email", …) is false below the growth plan.
  it.todo("skips an org whose plan does not include digest_email");

  // A recipient with no queued entries gets no email at all.
  it.todo("sends nothing to a recipient with an empty window");

  // Entries are capped at DIGEST_MAX_ENTRIES with an overflow line.
  it.todo("caps the entries at DIGEST_MAX_ENTRIES");

  // Two runs over the same window must not send the digest twice.
  it.todo("does not resend a digest for an already-covered window");

  // The job builds its own Actor — it is outside the request lifecycle.
  it.todo("constructs its own actor rather than reading cookies");
});
