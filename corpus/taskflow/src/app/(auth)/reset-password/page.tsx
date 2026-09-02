/**
 * Password reset request page.
 *
 * Owner D. Static shell around a client form — no session is read here, because
 * asking for a reset link is legitimate whether or not you are signed in.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { ResetRequestForm } from "./reset-request-form";

type PageParams = Record<string, never>;

export const metadata: Metadata = {
  title: "Reset your password",
};

export default async function Page(props: { params: Promise<PageParams> }) {
  // Next.js 16: params is a Promise and MUST be awaited. Nothing here reads the
  // query string, so the page stays static.
  await props.params;

  return (
    <div className="space-y-6">
      <ResetRequestForm />
      <p className="text-center text-sm text-slate-500">
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
