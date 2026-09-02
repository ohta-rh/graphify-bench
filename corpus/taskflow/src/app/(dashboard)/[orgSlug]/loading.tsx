/**
 * Skeleton for the tenant shell.
 *
 * Owner D. Mirrors the real layout's column widths so the page does not jump
 * when the data arrives.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen" aria-busy="true" aria-label="Loading">
      <div className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <Skeleton height="1.5rem" width="60%" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height="1rem" />
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        <Skeleton height="2rem" width="16rem" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} height="3rem" rounded />
          ))}
        </div>
      </div>
    </div>
  );
}
