/**
 * Fetch/patch one issue over JSON.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, assertOrgScope
 */

export async function GET(request: Request, context: { params: Promise<{ issueId: string }> }): Promise<Response> {
  void request;
  await context.params;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/issues/[issueId]/route.ts" } },
    { status: 501 },
  );
}

export async function POST(request: Request, context: { params: Promise<{ issueId: string }> }): Promise<Response> {
  void request;
  await context.params;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/issues/[issueId]/route.ts" } },
    { status: 501 },
  );
}
