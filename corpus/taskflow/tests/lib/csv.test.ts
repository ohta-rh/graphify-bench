/** Quoting, embedded newlines and column ordering. */
import { describe, expect, it } from "vitest";
import { csvResponseHeaders, escapeCsvValue, toCsv } from "@/lib/csv";

describe("lib/csv", () => {
  it("leaves plain values unquoted", () => {
    expect(escapeCsvValue("backlog")).toBe("backlog");
    expect(escapeCsvValue(42)).toBe("42");
    expect(escapeCsvValue(true)).toBe("true");
  });

  it("renders null as an empty field", () => {
    expect(escapeCsvValue(null)).toBe("");
  });

  it("quotes values containing a comma, a quote or a newline", () => {
    expect(escapeCsvValue("Alpha, Beta")).toBe('"Alpha, Beta"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue("line one\nline two")).toBe('"line one\nline two"');
  });

  it("writes the header from `columns` and orders fields by it", () => {
    const csv = toCsv(
      [
        { title: "Second", status: "todo" },
        { status: "done", title: "First" },
      ],
      ["status", "title"],
    );

    expect(csv.split("\r\n")).toEqual(["status,title", "todo,Second", "done,First"]);
  });

  it("ignores keys not named in `columns` and blanks missing ones", () => {
    const csv = toCsv([{ title: "Only", secret: "hidden" }], ["title", "assignee"]);
    expect(csv).toBe("title,assignee\r\nOnly,");
    expect(csv).not.toContain("hidden");
  });

  it("separates rows with CRLF as RFC 4180 requires", () => {
    expect(toCsv([{ a: "1" }, { a: "2" }], ["a"])).toBe("a\r\n1\r\n2");
  });

  it("emits only the header for an empty row set", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b");
  });

  it("builds download headers with a sanitised filename", () => {
    const headers = csvResponseHeaders("issues report/2026.csv");
    expect(headers["Content-Type"]).toBe("text/csv; charset=utf-8");
    expect(headers["Content-Disposition"]).toBe(
      'attachment; filename="issues-report-2026.csv"',
    );
    expect(headers["Cache-Control"]).toBe("no-store");
  });
});
