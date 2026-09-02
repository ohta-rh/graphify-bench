"use client";

/**
 * Page-number state synced to the query string.
 */
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_PAGE_SIZE } from "@/config/constants";
import { pageCount as computePageCount } from "@/lib/pagination";

export function usePagination(
  total: number,
  perPage: number = DEFAULT_PAGE_SIZE,
): {
  page: number;
  perPage: number;
  pageCount: number;
  setPage: (page: number) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageCount = useMemo(
    () => computePageCount(total, perPage),
    [total, perPage],
  );

  const page = useMemo(() => {
    const raw = Number.parseInt(searchParams.get("page") ?? "1", 10);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return pageCount > 0 ? Math.min(raw, pageCount) : 1;
  }, [searchParams, pageCount]);

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(next));
      }
      const query = params.toString();
      router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  return { page, perPage, pageCount, setPage };
}
