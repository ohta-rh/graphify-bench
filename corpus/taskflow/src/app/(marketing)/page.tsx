/**
 * Landing page.
 *
 * Owner D. Fully static — this is the one route that has to render fast for
 * people who have never signed in, so it touches neither the session nor any
 * service.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { getPlanLimits } from "@/config/plan-limits";

type PageParams = Record<string, never>;

export const metadata: Metadata = {
  title: "Taskflow — issue tracking that stays out of the way",
};

const FEATURES: readonly { title: string; body: string }[] = [
  {
    title: "Projects and issues",
    body: "Six statuses, five priorities, labels shared across the organization. No workflow builder to configure before you can file a bug.",
  },
  {
    title: "Roles that mean something",
    body: "Owner, admin, member and viewer, checked at one place in the codebase. Nobody can see another tenant's work.",
  },
  {
    title: "A kanban board when you want one",
    body: "Drag a card and the change is optimistic; the server reconciles it. Turn the board off entirely if lists suit you better.",
  },
  {
    title: "An audit log you can export",
    body: "Every mutation is recorded from the event bus, not sprinkled through the code, so the trail has no gaps.",
  },
];

export default async function Page(props: { params: Promise<PageParams> }) {
  // Next.js 16: params is a Promise and MUST be awaited. `searchParams` is
  // deliberately not accepted — reading it would opt the page out of static
  // rendering, and the landing page has nothing to read from the query string.
  await props.params;

  const free = getPlanLimits("free");

  return (
    <main>
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Issue tracking that stays out of the way
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Taskflow gives a small team projects, issues, comments and a board —
          and stops there. Start with {free.seats} seats and {free.projects}{" "}
          projects, free forever.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            Create an organization
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-8 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h2 className="text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
