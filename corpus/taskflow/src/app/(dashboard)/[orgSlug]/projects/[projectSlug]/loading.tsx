/**
 * Project overview skeleton.
 *
 * Owner D. Three stat tiles and a list, matching the real page's shape.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading project">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} height="5rem" rounded />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height="3rem" rounded />
        ))}
      </div>
    </div>
  );
}
