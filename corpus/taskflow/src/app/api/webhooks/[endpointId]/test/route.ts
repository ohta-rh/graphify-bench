/**
 * Sends a signed test payload to one endpoint.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, signPayload
 */

export async function GET(request: Request, context: { params: Promise<{ endpointId: string }> }): Promise<Response> {
  void request;
  await context.params;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/webhooks/[endpointId]/test/route.ts" } },
    { status: 501 },
  );
}

export async function POST(request: Request, context: { params: Promise<{ endpointId: string }> }): Promise<Response> {
  void request;
  await context.params;
  return Response.json(
    { error: { code: "internal_error", message: "stub: src/app/api/webhooks/[endpointId]/test/route.ts" } },
    { status: 501 },
  );
}
