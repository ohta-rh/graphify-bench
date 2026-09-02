/**
 * Current usage and limit checks for one organization.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, assertOrgScope, getPlanLimits
 */

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }): Promise<Response> {
  void request;
  await context.params;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/orgs/[orgId]/usage/route.ts" } },
    { status: 501 },
  );
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }): Promise<Response> {
  void request;
  await context.params;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/orgs/[orgId]/usage/route.ts" } },
    { status: 501 },
  );
}
