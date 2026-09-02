/**
 * Daily digest built by `DigestService`.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { DigestEntry } from "@/types/notification";
import type { ReactElement } from "react";
export type DigestEmailProps = { recipientName: string; orgName: string; entries: readonly DigestEntry[]; inboxUrl: string };

export function DigestEmail(props: DigestEmailProps): ReactElement | null {
  return null;
}
