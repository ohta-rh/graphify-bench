/**
 * Registration page.
 *
 * Owner D. Signing up creates a user, an organization and the owner membership
 * in one step — Taskflow has no concept of a user without a tenant.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

type PageParams = Record<string, never>;

export const metadata: Metadata = {
  title: "Create an account",
};

export default async function Page(props: { params: Promise<PageParams> }) {
  // Next.js 16: params is a Promise and MUST be awaited. The registration page
  // has nothing to read from the query string, so it stays static.
  await props.params;

  return (
    <div className="space-y-6">
      <RegisterForm />
      <p className="text-center text-sm text-slate-500">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
