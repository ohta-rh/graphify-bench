/**
 * Class-name merger used by every component. Deliberately dependency-free:
 * it joins truthy class strings, splits them on whitespace and keeps the
 * last occurrence of a repeated class so a caller-supplied `className` wins
 * over a component's own default.
 */
export function cn(
  ...values: readonly (string | false | null | undefined)[]
): string {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    if (!value) continue;
    for (const token of value.split(/\s+/)) {
      if (token === "") continue;
      if (seen.has(token)) {
        out.splice(out.indexOf(token), 1);
      }
      seen.add(token);
      out.push(token);
    }
  }

  return out.join(" ");
}
