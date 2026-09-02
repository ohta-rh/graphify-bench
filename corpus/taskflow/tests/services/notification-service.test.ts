/**
 * Fan-out honours preferences and the digest flag.
 *
 * Owner C implements `@/server/services/notification-service`.
 */
import { describe, it } from "vitest";

describe("services/notification-service", () => {
  // comment.created with mentions produces one comment_mention per mentioned user.
  it.todo("creates one notification per mentioned user");

  // The actor who caused the event is not notified about their own action.
  it.todo("does not notify the actor about their own action");

  // NotificationPreference.email === false suppresses the email channel only.
  it.todo("honours the per-kind email preference");

  // digestOnly routes the entry to the digest instead of an immediate email.
  it.todo("queues a digestOnly notification for the digest instead of sending");

  // isEnabled("digest_email", …) gates the digest channel by plan.
  it.todo("skips the digest channel when the digest_email flag is off");

  // in_app is always recorded, even when email delivery is suppressed.
  it.todo("always records the in-app notification");

  // Notifications carry the org id and are only visible inside that tenant.
  it.todo("scopes notifications to the recipient's organization");
});
