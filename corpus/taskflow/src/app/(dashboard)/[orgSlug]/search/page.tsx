/**
 * Full-page search results.
 *
 * Owner D. The command palette and this page share one action, so the flag
 * check has to live in both places — the palette narrows what it asks for, and
 * this page explains why comments are missing from the results.
 *
 * Must call (do not reimplement): isEnabled
 */

import Link from "next/link";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { isEnabled } from "@/lib/feature-flags";
import { searchQuerySchema } from "@/schemas/search";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { search as runSearch } from "@/server/services/search-service";
import { loadTenantContext } from "../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
};

const RESULT_LIMIT = 30;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const advanced = isEnabled("advanced_search", buildFlagContext(actor, org));
  const query = typeof search.q === "string" ? search.q : "";

  if (query.length === 0) {
    return (
      <div className="space-y-8">
        <SearchHeader orgSlug={orgSlug} query={query} advanced={advanced} />
        <EmptyState
          title="Search this organization"
          description="Type at least one character to look through issues, and — on the higher plans — comments and projects too."
        />
      </div>
    );
  }

  const parsed = searchQuerySchema.safeParse({
    orgId: org.id,
    q: query,
    kinds: advanced ? ["issue", "comment", "project"] : ["issue"],
    limit: RESULT_LIMIT,
  });

  if (!parsed.success) {
    return (
      <div className="space-y-8">
        <SearchHeader orgSlug={orgSlug} query={query} advanced={advanced} />
        <EmptyState title="That query is not valid" description="Try something shorter." />
      </div>
    );
  }

  const page = await runSearch(actor, parsed.data);

  return (
    <div className="space-y-8">
      <SearchHeader orgSlug={orgSlug} query={query} advanced={advanced} />

      {page.items.length === 0 ? (
        <EmptyState title={`Nothing matches “${query}”`} />
      ) : (
        <ul className="space-y-4">
          {page.items.map((hit) => (
            <li key={`${hit.kind}:${hit.id}`}>
              <Link href={hit.href} className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">
                  {hit.kind}
                </span>
                <span className="mt-0.5 block text-sm font-medium">
                  {hit.title}
                </span>
                <span className="mt-0.5 block text-sm text-slate-600">
                  {hit.snippet}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchHeader(props: {
  orgSlug: string;
  query: string;
  advanced: boolean;
}) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
      <form action={`/${props.orgSlug}/search`} className="mt-4 max-w-md">
        <input
          name="q"
          type="search"
          defaultValue={props.query}
          placeholder="Search issues…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </form>
      {!props.advanced ? (
        <p className="mt-2 text-xs text-slate-500">
          Comments and projects are searchable on the growth plan and above.
        </p>
      ) : null}
    </header>
  );
}
