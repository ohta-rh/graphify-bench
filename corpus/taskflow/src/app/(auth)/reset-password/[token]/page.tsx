/**
 * Password reset confirmation page; awaits `params`.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */

type PageParams = { token: string };

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  await props.params;
  await props.searchParams;
  return <div data-stub="src/app/(auth)/reset-password/[token]/page.tsx" />;
}
