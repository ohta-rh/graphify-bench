/**
 * Login page; reads the `next` search param.
 *
 * Owner D. Dynamic because it reads the session — an already-signed-in visitor
 * is bounced straight to wherever they were heading rather than shown a form
 * they do not need.
 *
 * Must call (do not reimplement): getSessionPrincipal
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionPrincipal } from "@/lib/session";
import { LoginForm } from "./login-form";

type PageParams = Record<string, never>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

const DEFAULT_DESTINATION = "/orgs";

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  await props.params;
  const search = await props.searchParams;

  const next = safeDestination(search.next);

  const principal = await getSessionPrincipal();
  if (principal !== null) {
    redirect(next);
  }

  return <LoginForm next={next} />;
}

/**
 * Only same-site paths are honoured, so `?next=https://elsewhere` cannot turn
 * the login form into an open redirect.
 */
function safeDestination(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return DEFAULT_DESTINATION;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }
  return candidate;
}
