/**
 * Kanban board; falls back to the list view when `kanban_board` is off.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled, can
 */

type PageParams = { orgSlug: string; projectSlug: string };

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  await props.params;
  await props.searchParams;
  return <div data-stub="src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/board/page.tsx" />;
}
