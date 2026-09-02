/**
 * Very small Markdown subset renderer for issue descriptions and comments.
 *
 * Supported: ATX headings, fenced and inline code, bold, italic, links,
 * unordered lists and paragraphs. Everything else is escaped — this renderer
 * is applied to user input, so escaping first and un-escaping only the
 * constructs below is the whole safety argument.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      '<a href="$2">$1</a>',
    );
}

/** Renders the supported subset to HTML. Unsupported syntax stays literal. */
export function renderMarkdown(source: string): string {
  const blocks: string[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  let listBuffer: string[] = [];
  let codeBuffer: string[] | null = null;

  const flushList = (): void => {
    if (listBuffer.length === 0) return;
    blocks.push(`<ul>${listBuffer.map((li) => `<li>${li}</li>`).join("")}</ul>`);
    listBuffer = [];
  };

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      if (codeBuffer === null) {
        flushList();
        codeBuffer = [];
      } else {
        blocks.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = null;
      }
      continue;
    }

    if (codeBuffer !== null) {
      codeBuffer.push(line);
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1]?.length ?? 1;
      blocks.push(`<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`);
      continue;
    }

    const listItem = /^\s*[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      listBuffer.push(renderInline(listItem[1] ?? ""));
      continue;
    }

    if (line.trim() === "") {
      flushList();
      continue;
    }

    flushList();
    blocks.push(`<p>${renderInline(line.trim())}</p>`);
  }

  if (codeBuffer !== null) {
    blocks.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  flushList();

  return blocks.join("\n");
}

/** Plain-text projection, for search indexing, digests and email previews. */
export function stripMarkdown(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** A single-line snippet, truncated on a word boundary with an ellipsis. */
export function excerpt(source: string, maxLength = 160): string {
  const text = stripMarkdown(source);
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
