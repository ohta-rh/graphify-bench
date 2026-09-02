/**
 * Cron-style trigger for the overdue scan.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): runOverdueIssueJob
 */

export async function GET(request: Request): Promise<Response> {
  void request;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/cron/overdue/route.ts" } },
    { status: 501 },
  );
}

export async function POST(request: Request): Promise<Response> {
  void request;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/cron/overdue/route.ts" } },
    { status: 501 },
  );
}
