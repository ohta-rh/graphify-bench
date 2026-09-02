/**
 * REQUIRED default for the `@panel` parallel slot — without it Next 16 fails the
 * build.
 *
 * Owner D. Rendered when the slot has no match for the current URL, which is
 * every route except `/[orgSlug]` and `/[orgSlug]/notifications`. Returning
 * `null` collapses the aside rather than leaving an empty column.
 */

export default function DefaultSlot() {
  return null;
}
