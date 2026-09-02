"use client";

/**
 * Reads and writes the issue filter through the URL search params.
 */
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { IssueFilter } from "@/types/issue";
import {
  issueFilterQueryString,
  parseIssueFilterParams,
} from "./issue-filter-params";

export function useIssueFilters(): {
  filter: IssueFilter;
  setFilter: (filter: IssueFilter) => void;
  reset: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(
    () => parseIssueFilterParams(searchParams),
    [searchParams],
  );

  const setFilter = useCallback(
    (next: IssueFilter) => {
      // Changing a filter always returns to page 1; keeping the old cursor
      // would show an empty page for a narrower result set.
      router.replace(`${pathname}${issueFilterQueryString(next)}`, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { filter, setFilter, reset };
}
