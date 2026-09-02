/**
 * Liveness probe; the only unauthenticated JSON route.
 *
 * Owner D. Deliberately touches nothing — no database, no session, no service.
 * A health check that queries the database reports the database, not the app,
 * and turns one slow query into a restart loop.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  void request;

  return Response.json({
    status: "ok",
    service: "taskflow",
    checkedAt: new Date().toISOString(),
  });
}
