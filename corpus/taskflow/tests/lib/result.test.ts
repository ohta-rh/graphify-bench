/** Mapping, unwrapping, async lifting and collecting the `Result` envelope. */
import { describe, expect, it } from "vitest";
import { collectResults, fromPromise, mapResult, unwrapOr } from "@/lib/result";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import type { AppErrorShape, Result } from "@/types/api";
import { err, ok } from "@/types/api";

const failure: AppErrorShape = { code: "not_found", message: "no such issue" };

describe("lib/result", () => {
  it("maps the value of a success", () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual({ ok: true, data: 6 });
  });

  it("passes a failure through unmapped", () => {
    let called = false;
    const mapped = mapResult(err<number>(failure), () => {
      called = true;
      return 0;
    });
    expect(called).toBe(false);
    expect(mapped).toEqual({ ok: false, error: failure });
  });

  it("unwraps a success and falls back on a failure", () => {
    expect(unwrapOr(ok("value"), "fallback")).toBe("value");
    expect(unwrapOr(err<string>(failure), "fallback")).toBe("fallback");
  });

  it("lifts a resolved promise into a success", async () => {
    await expect(fromPromise(Promise.resolve(7))).resolves.toEqual({
      ok: true,
      data: 7,
    });
  });

  it("lifts a rejection into a mapped AppErrorShape", async () => {
    const result = await fromPromise(
      Promise.reject(new AlreadyArchivedError("Issue", "01ISS")),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("conflict");
  });

  it("collects an all-success list into one success", () => {
    expect(collectResults([ok(1), ok(2), ok(3)])).toEqual({
      ok: true,
      data: [1, 2, 3],
    });
    expect(collectResults<number>([])).toEqual({ ok: true, data: [] });
  });

  it("short-circuits on the first failure", () => {
    const second: AppErrorShape = { code: "conflict", message: "second" };
    const results: readonly Result<number>[] = [
      ok(1),
      err<number>(failure),
      err<number>(second),
    ];
    expect(collectResults(results)).toEqual({ ok: false, error: failure });
  });
});
