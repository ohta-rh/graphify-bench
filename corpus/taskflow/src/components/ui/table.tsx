/**
 * Data table primitives (head/body/row/cell).
 *
 * Owner A — design system. Server-renderable. The wrapper owns the horizontal
 * scroll so a wide issue table never widens the dashboard shell.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TableProps = { caption?: string; className?: string; children?: ReactNode };

type PartProps = { className?: string; children?: ReactNode };

export function Table(props: TableProps): ReactElement | null {
  const { caption, className, children } = props;

  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          "w-full border-collapse text-left text-sm text-black/80 dark:text-white/80",
          className,
        )}
      >
        {caption !== undefined ? (
          <caption className="sr-only">{caption}</caption>
        ) : null}
        {children}
      </table>
    </div>
  );
}

export function TableHead(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <thead
      className={cn(
        "border-b border-black/10 bg-surface-muted text-xs uppercase tracking-wide text-black/55",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function TableBody(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <tbody className={cn("divide-y divide-black/8", className)}>
      {children}
    </tbody>
  );
}

export function TableRow(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <tr className={cn("transition-colors hover:bg-surface-muted/70", className)}>
      {children}
    </tr>
  );
}

export function TableHeaderCell(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <th scope="col" className={cn("px-3 py-2 font-medium", className)}>
      {children}
    </th>
  );
}

export function TableCell(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return <td className={cn("px-3 py-2 align-middle", className)}>{children}</td>;
}
