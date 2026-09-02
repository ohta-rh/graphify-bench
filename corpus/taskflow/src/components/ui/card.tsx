/**
 * Surface container; also exports header/title/content/footer parts.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement, ReactNode } from "react";
export type CardProps = { padded?: boolean; className?: string; children?: ReactNode };

export function Card(props: CardProps): ReactElement | null {
  return null;
}

export function CardHeader(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}

export function CardTitle(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}

export function CardDescription(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}

export function CardContent(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}

export function CardFooter(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}
