/**
 * Issue list skeleton.
 *
 * Owner D. Rows only — the project header above is rendered by the layout and
 * is already on screen while this streams in.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading issues">
      <Skeleton height="1.25rem" width="12rem" />
      <div className="space-y-2">
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} height="2.75rem" rounded />
        ))}
      </div>
    </div>
  );
}
