/**
 * Static changelog.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */

type PageParams = Record<string, never>;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  await props.params;
  await props.searchParams;
  return <div data-stub="src/app/(marketing)/changelog/page.tsx" />;
}
