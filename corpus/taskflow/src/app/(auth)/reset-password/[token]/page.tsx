/**
 * Password reset confirmation page; awaits `params`.
 *
 * Owner D. The token is only shape-checked here — whether it is live, expired
 * or already spent is decided by `AuthService.confirmPasswordReset`, because a
 * page render must not consume a single-use credential.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { ResetConfirmForm } from "./reset-confirm-form";

type PageParams = { token: string };

export const metadata: Metadata = {
  title: "Choose a new password",
};

const MIN_TOKEN_LENGTH = 16;

export default async function Page(props: { params: Promise<PageParams> }) {
  // Next.js 16: params is a Promise and MUST be awaited.
  const { token } = await props.params;

  if (token.length < MIN_TOKEN_LENGTH) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">That link is not valid</h1>
        <p className="text-sm text-slate-600">
          Reset links expire after an hour and can only be used once.
        </p>
        <Link href="/reset-password" className="text-sm text-indigo-600">
          Request a new one
        </Link>
      </div>
    );
  }

  return <ResetConfirmForm token={token} />;
}
