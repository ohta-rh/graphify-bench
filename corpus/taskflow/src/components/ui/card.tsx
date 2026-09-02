/**
 * Surface container; also exports header/title/content/footer parts.
 *
 * Owner A — design system. Server-renderable compound component: the parts are
 * plain layout wrappers so a Server Component can build a card without pulling
 * a client boundary in.
 */
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SURFACE } from "./_lib/tokens";

export type CardProps = { padded?: boolean; className?: string; children?: ReactNode };

type PartProps = { className?: string; children?: ReactNode };

export function Card(props: CardProps): ReactElement | null {
  const { padded = false, className, children } = props;

  return (
    <section
      className={cn(
        SURFACE,
        "rounded-lg shadow-sm",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 border-b border-black/8 px-4 py-3",
        className,
      )}
    >
      {children}
    </header>
  );
}

export function CardTitle(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <h2
      className={cn(
        "text-sm font-semibold text-black/85 dark:text-white/85",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function CardDescription(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <p className={cn("mt-0.5 text-xs text-black/55 dark:text-white/55", className)}>
      {children}
    </p>
  );
}

export function CardContent(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}

export function CardFooter(props: PartProps): ReactElement | null {
  const { className, children } = props;
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-2 border-t border-black/8 px-4 py-3",
        className,
      )}
    >
      {children}
    </footer>
  );
}
