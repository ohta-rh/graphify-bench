/** ULID shape, uniqueness, ordering and the deterministic seeded factory. */
import { describe, expect, it } from "vitest";
import { idFactory, isUlid, newId } from "@/lib/id";

describe("lib/id", () => {
  it("produces a 26-character Crockford base32 id", () => {
    const id = newId();
    expect(id).toHaveLength(26);
    expect(isUlid(id)).toBe(true);
  });

  it("produces distinct ids", () => {
    const ids = new Set(Array.from({ length: 500 }, newId));
    expect(ids.size).toBe(500);
  });

  it("rejects strings that are not ULIDs", () => {
    expect(isUlid("")).toBe(false);
    expect(isUlid("not-a-ulid")).toBe(false);
    expect(isUlid("0".repeat(25))).toBe(false);
    // I, L, O and U are excluded from the alphabet.
    expect(isUlid(`I${"0".repeat(25)}`)).toBe(false);
  });

  it("is deterministic for a given seed", () => {
    const first = Array.from({ length: 5 }, idFactory(7));
    const second = Array.from({ length: 5 }, idFactory(7));
    expect(first).toEqual(second);
    expect(first.every(isUlid)).toBe(true);
  });

  it("differs between seeds", () => {
    expect(idFactory(1)()).not.toBe(idFactory(2)());
  });

  it("emits seeded ids in ascending order", () => {
    const next = idFactory(99);
    const ids = Array.from({ length: 10 }, next);
    expect([...ids].sort()).toEqual(ids);
  });
});
