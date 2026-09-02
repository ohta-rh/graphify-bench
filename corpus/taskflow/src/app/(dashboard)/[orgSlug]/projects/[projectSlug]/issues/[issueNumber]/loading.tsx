/**
 * Issue detail skeleton.
 *
 * Owner D. Two columns, matching the detail page: body and comments on the
 * left, the activity rail on the right.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]"
      aria-busy="true"
      aria-label="Loading issue"
    >
      <div className="space-y-8">
        <Skeleton height="2rem" width="70%" />
        <Skeleton height="10rem" rounded />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} height="4rem" rounded />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height="1rem" />
        ))}
      </div>
    </div>
  );
}
