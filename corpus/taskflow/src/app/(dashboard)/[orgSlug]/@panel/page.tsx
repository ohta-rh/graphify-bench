/**
 * Default content of the side panel slot.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */

type PageParams = { orgSlug: string };

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  await props.params;
  await props.searchParams;
  return <div data-stub="src/app/(dashboard)/[orgSlug]/@panel/page.tsx" />;
}
