/** The Markdown subset renderer, its plain-text projection and excerpts. */
import { describe, expect, it } from "vitest";
import { excerpt, renderMarkdown, stripMarkdown } from "@/lib/markdown";

describe("lib/markdown", () => {
  it("wraps a plain line in a paragraph", () => {
    expect(renderMarkdown("hello")).toBe("<p>hello</p>");
  });

  it("renders headings up to level three", () => {
    expect(renderMarkdown("# Title")).toBe("<h1>Title</h1>");
    expect(renderMarkdown("### Small")).toBe("<h3>Small</h3>");
  });

  it("renders bold, italic and inline code", () => {
    expect(renderMarkdown("**bold**")).toBe("<p><strong>bold</strong></p>");
    expect(renderMarkdown("*thin*")).toBe("<p><em>thin</em></p>");
    expect(renderMarkdown("`code`")).toBe("<p><code>code</code></p>");
  });

  it("groups consecutive list items into one list", () => {
    expect(renderMarkdown("- one\n- two")).toBe(
      "<ul><li>one</li><li>two</li></ul>",
    );
  });

  it("renders a fenced block without interpreting its contents", () => {
    expect(renderMarkdown("```\n**not bold**\n```")).toBe(
      "<pre><code>**not bold**</code></pre>",
    );
  });

  it("escapes HTML in user input", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("renders http and root-relative links only", () => {
    expect(renderMarkdown("[docs](https://example.com)")).toBe(
      '<p><a href="https://example.com">docs</a></p>',
    );
    expect(renderMarkdown("[here](/acme/issues)")).toBe(
      '<p><a href="/acme/issues">here</a></p>',
    );
    expect(renderMarkdown("[x](javascript:alert(1))")).not.toContain("<a ");
  });

  it("strips syntax down to plain text", () => {
    expect(stripMarkdown("# Title\n\n- **one**\n- [two](https://x.dev)")).toBe(
      "Title one two",
    );
    expect(stripMarkdown("run `pnpm test` now")).toBe("run pnpm test now");
    expect(stripMarkdown("```\ncode\n```")).toBe("");
  });

  it("returns short text unchanged from excerpt", () => {
    expect(excerpt("A short note")).toBe("A short note");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const long = "alpha beta gamma delta epsilon zeta eta theta iota kappa";
    const short = excerpt(long, 20);
    expect(short.endsWith("…")).toBe(true);
    expect(short.length).toBeLessThanOrEqual(21);
    expect(short).not.toContain("  ");
    expect(long.startsWith(short.slice(0, -1))).toBe(true);
  });

  it("excerpts the plain-text projection, not the raw Markdown", () => {
    expect(excerpt("**bold** and `code`", 100)).toBe("bold and code");
  });
});
