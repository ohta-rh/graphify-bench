/**
 * Returns the current `SessionPrincipal`, or 401.
 *
 * Owner D. Used by the client to re-check the session after a tab has been
 * asleep. It returns the principal, never the token — the cookie is httpOnly
 * and stays that way.
 *
 * Must call (do not reimplement): getSessionPrincipal
 */

import { getSessionPrincipal } from "@/lib/session";
import { errorResponse, failure } from "@/app/api/_lib/responses";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  void request;

  try {
    const principal = await getSessionPrincipal();
    if (principal === null) {
      return failure("unauthorized", "No active session.");
    }

    return Response.json({
      userId: principal.userId,
      email: principal.email,
      activeOrgId: principal.activeOrgId,
      expiresAt: principal.expiresAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
