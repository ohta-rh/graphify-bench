/**
 * Static changelog.
 *
 * Owner D. The entries are a module constant rather than a database read — the
 * changelog is content, not tenant data, and keeping it static means this route
 * is prerendered with the rest of the marketing tree.
 */

import type { Metadata } from "next";

type PageParams = Record<string, never>;

export const metadata: Metadata = {
  title: "Changelog",
};

type ChangelogEntry = {
  readonly date: string;
  readonly title: string;
  readonly items: readonly string[];
};

const ENTRIES: readonly ChangelogEntry[] = [
  {
    date: "2026-08-19",
    title: "Board reconciliation",
    items: [
      "Dragging a card now applies optimistically and reconciles against the server row.",
      "Moving an issue into a closed status stamps `completedAt` instead of leaving it null.",
    ],
  },
  {
    date: "2026-07-30",
    title: "Audit export",
    items: [
      "The activity log can be exported as CSV by anyone with `activity:export`.",
      "Retention now follows the plan rather than a fixed 90 days.",
    ],
  },
  {
    date: "2026-06-11",
    title: "Per-organization feature flags",
    items: [
      "Owners can force-enable an overridable flag for their organization.",
      "The flag snapshot is handed to the client once per layout render.",
    ],
  },
  {
    date: "2026-05-02",
    title: "Digest email",
    items: [
      "One digest per recipient per day, at the hour the organization chose.",
      "Notifications marked `digestOnly` no longer send an immediate email.",
    ],
  },
];

export default async function Page(props: { params: Promise<PageParams> }) {
  // Next.js 16: params is a Promise and MUST be awaited. `searchParams` is not
  // accepted, so the whole marketing tree stays prerendered.
  await props.params;

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>

      <ol className="mt-12 space-y-12">
        {ENTRIES.map((entry) => (
          <li key={entry.date}>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {entry.date}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{entry.title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
