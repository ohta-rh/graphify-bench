/** Non-throwing Zod parsing and searchParams normalisation. */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseSearchParams, safeParse } from "@/lib/validation";
import { searchParamsPaginationSchema } from "@/schemas/pagination";

const schema = z.object({
  title: z.string().min(3),
  estimate: z.number().int().optional(),
});

describe("lib/validation", () => {
  it("returns the parsed value on success", () => {
    const result = safeParse(schema, { title: "Ship it", estimate: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ title: "Ship it", estimate: 3 });
  });

  it("returns a validation_failed error instead of throwing", () => {
    const result = safeParse(schema, { title: "no" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("validation_failed");
    expect(result.error.fieldErrors?.title).toBeDefined();
  });

  it("reports every failing field at once", () => {
    const result = safeParse(schema, { title: "no", estimate: 1.5 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.error.fieldErrors ?? {}).sort()).toEqual([
      "estimate",
      "title",
    ]);
  });

  it("applies schema defaults when parsing searchParams", () => {
    expect(parseSearchParams(searchParamsPaginationSchema, {})).toEqual({
      page: 1,
      perPage: 25,
    });
  });

  it("coerces string searchParams into their schema types", () => {
    expect(
      parseSearchParams(searchParamsPaginationSchema, { page: "3", perPage: "10" }),
    ).toEqual({ page: 3, perPage: 10 });
  });

  it("falls back to the caught default for a hand-edited query string", () => {
    expect(
      parseSearchParams(searchParamsPaginationSchema, { page: "banana" }),
    ).toEqual({ page: 1, perPage: 25 });
  });

  it("drops undefined entries rather than passing them to the schema", () => {
    expect(
      parseSearchParams(searchParamsPaginationSchema, { cursor: undefined }),
    ).toEqual({ page: 1, perPage: 25 });
  });
});
