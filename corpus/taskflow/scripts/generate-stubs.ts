import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { CorpusManifest, ExportSpec, ManifestEntry } from "./manifest-types";

/**
 * Generates a compiling stub for every manifest entry that does not exist yet.
 *
 * Existing files are never touched, so the frozen contract layer and any work a
 * corpus worker has already done survive a re-run. Imports are resolved from a
 * symbol table built out of (a) the real contract files on disk and (b) the
 * exports the manifest itself declares, which is what keeps the stub tree
 * type-clean without hand-written import lists.
 */

const ROOT = resolve(process.cwd());

const TS_BUILTINS = new Set([
  "string", "number", "boolean", "void", "null", "undefined", "unknown", "never",
  "any", "object", "symbol", "bigint", "this",
  "Promise", "Array", "ReadonlyArray", "Record", "Readonly", "Partial", "Required",
  "Pick", "Omit", "Exclude", "Extract", "NonNullable", "Parameters", "ReturnType",
  "Awaited", "Map", "Set", "Date", "Error", "RegExp", "JSON", "Math", "Object",
  "Function", "Iterable", "AsyncIterable", "Request", "Response", "Headers",
  "URL", "URLSearchParams", "FormData", "Blob", "File", "AbortSignal",
  "NodeJS", "ProcessEnv", "readonly", "extends", "keyof", "typeof", "infer",
  "in", "is", "as", "const", "true", "false",
]);

const EXTERNAL_SYMBOLS: Record<string, string> = {
  ReactNode: "react",
  ReactElement: "react",
  ComponentType: "react",
  Metadata: "next",
  NextRequest: "next/server",
  SQL: "drizzle-orm",
  SQLiteColumn: "drizzle-orm/sqlite-core",
  ZodType: "zod",
  ZodError: "zod",
};

/** Directories whose real, already-written files define contract symbols. */
const CONTRACT_DIRS = [
  "src/types",
  "src/schemas",
  "src/lib",
  "src/config",
  "src/server/db",
];

const EXPORT_RE =
  /^export\s+(?:declare\s+)?(?:async\s+)?(?:type|interface|const|let|function|class|enum)\s+([A-Za-z_$][\w$]*)/gm;

function moduleSpecifier(path: string): string {
  const withoutExt = path.replace(/\.(tsx?|mts|cts)$/, "");
  if (withoutExt.startsWith("src/")) {
    return `@/${withoutExt.slice("src/".length)}`;
  }
  return `./${withoutExt}`;
}

function walk(dir: string, out: string[] = []): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) {
      walk(rel, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(rel);
    }
  }
  return out;
}

function buildSymbolTable(manifest: CorpusManifest): Map<string, string> {
  const table = new Map<string, string>();

  for (const [symbol, mod] of Object.entries(EXTERNAL_SYMBOLS)) {
    table.set(symbol, mod);
  }

  for (const dir of CONTRACT_DIRS) {
    for (const file of walk(dir)) {
      if (file.endsWith("/index.ts")) continue;
      const source = readFileSync(join(ROOT, file), "utf8");
      const spec = moduleSpecifier(file);
      for (const match of source.matchAll(EXPORT_RE)) {
        const name = match[1];
        if (name && !table.has(name)) table.set(name, spec);
      }
    }
  }

  for (const entry of manifest.entries) {
    const spec = moduleSpecifier(entry.path);
    for (const exported of entry.exports) {
      if (exported.name === "default") continue;
      if (!table.has(exported.name)) table.set(exported.name, spec);
    }
  }

  return table;
}

function stripLiterals(text: string): string {
  return text.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
}

function leadingTypeParams(signature: string): {
  typeParams: string;
  rest: string;
  names: string[];
} {
  if (!signature.startsWith("<")) {
    return { typeParams: "", rest: signature, names: [] };
  }
  let depth = 0;
  for (let i = 0; i < signature.length; i += 1) {
    const ch = signature[i];
    if (ch === "<") depth += 1;
    else if (ch === ">") {
      depth -= 1;
      if (depth === 0) {
        const typeParams = signature.slice(0, i + 1);
        const names = [
          ...stripLiterals(typeParams).matchAll(/[<,]\s*([A-Za-z_$][\w$]*)/g),
        ]
          .map((m) => m[1] ?? "")
          .filter((n) => n.length > 0 && !TS_BUILTINS.has(n));
        return { typeParams, rest: signature.slice(i + 1), names };
      }
    }
  }
  return { typeParams: "", rest: signature, names: [] };
}

/**
 * Identifiers that can name a type. Only capitalised names are considered so
 * that parameter names (`now`, `input`, `actor`) are never mistaken for types
 * that need importing.
 */
function identifiersIn(text: string): string[] {
  return [...stripLiterals(text).matchAll(/\b[A-Z][\w$]*/g)].map((m) => m[0]);
}

function dynamicSegments(path: string): string[] {
  const names: string[] = [];
  for (const segment of path.split("/")) {
    const match = /^\[(?:\.\.\.)?([A-Za-z_$][\w$]*)\]$/.exec(segment);
    if (match?.[1]) names.push(match[1]);
  }
  return names;
}

function paramsType(path: string): string {
  const segments = dynamicSegments(path);
  if (segments.length === 0) return "Record<string, never>";
  return `{ ${segments.map((s) => `${s}: string`).join("; ")} }`;
}

function header(entry: ManifestEntry): string {
  const lines = [
    "/**",
    ` * ${entry.responsibility}`,
    " *",
    ` * STUB — owner ${entry.owner}. Replace the body, keep every exported`,
    " * signature exactly as declared in corpus-manifest.json.",
  ];
  if (entry.mustUse && entry.mustUse.length > 0) {
    lines.push(
      " *",
      ` * Must call (do not reimplement): ${entry.mustUse.join(", ")}`,
    );
  }
  lines.push(" */");
  return lines.join("\n");
}

function importBlock(
  entry: ManifestEntry,
  table: Map<string, string>,
  extraIdentifiers: string[] = [],
): string {
  const own = new Set(entry.exports.map((e) => e.name));
  const selfSpec = moduleSpecifier(entry.path);
  const needed = new Map<string, Set<string>>();

  const scan = (text: string, skip: Set<string>) => {
    for (const id of identifiersIn(text)) {
      if (own.has(id) || skip.has(id) || TS_BUILTINS.has(id)) continue;
      const mod = table.get(id);
      if (!mod || mod === selfSpec) continue;
      const set = needed.get(mod) ?? new Set<string>();
      set.add(id);
      needed.set(mod, set);
    }
  };

  for (const exported of entry.exports) {
    const { typeParams, rest, names } = leadingTypeParams(exported.signature);
    scan(`${typeParams} ${rest}`, new Set(names));
  }
  scan(extraIdentifiers.join(" "), new Set());

  const specs = [...needed.keys()].sort();
  return specs
    .map(
      (mod) =>
        `import type { ${[...(needed.get(mod) ?? [])].sort().join(", ")} } from "${mod}";`,
    )
    .join("\n");
}

function renderExport(exported: ExportSpec, path: string): string {
  const { name, kind, signature } = exported;
  switch (kind) {
    case "type":
      return `export type ${name} = ${signature};`;
    case "const":
      return `export const ${name}: ${signature} = undefined as unknown as ${signature};`;
    case "component":
      return [
        `export function ${name}${signature} {`,
        "  return null;",
        "}",
      ].join("\n");
    default: {
      const { typeParams, rest } = leadingTypeParams(signature);
      const isAsync = /:\s*Promise</.test(rest.slice(rest.lastIndexOf(")")));
      return [
        `export ${isAsync ? "async " : ""}function ${name}${typeParams}${rest} {`,
        `  throw new Error("stub: ${path}");`,
        "}",
      ].join("\n");
    }
  }
}

function pageStub(entry: ManifestEntry): string {
  const componentName = "Page";
  return [
    header(entry),
    "",
    `type PageParams = ${paramsType(entry.path)};`,
    "",
    `export default async function ${componentName}(props: {`,
    "  params: Promise<PageParams>;",
    "  searchParams: Promise<Record<string, string | string[] | undefined>>;",
    "}) {",
    "  // Next.js 16: params and searchParams are Promises and MUST be awaited.",
    "  await props.params;",
    "  await props.searchParams;",
    `  return <div data-stub=${JSON.stringify(entry.path)} />;`,
    "}",
    "",
  ].join("\n");
}

function layoutStub(entry: ManifestEntry): string {
  const slot = entry.path.includes("[orgSlug]/layout.tsx")
    ? "  panel?: ReactNode;\n"
    : "";
  return [
    header(entry),
    "",
    'import type { ReactNode } from "react";',
    "",
    `type LayoutParams = ${paramsType(entry.path)};`,
    "",
    "export default async function Layout(props: {",
    "  children: ReactNode;",
    slot.trimEnd() ? slot.trimEnd() : null,
    "  params: Promise<LayoutParams>;",
    "}) {",
    "  // Next.js 16: params is a Promise and MUST be awaited.",
    "  await props.params;",
    `  return <div data-stub=${JSON.stringify(entry.path)}>{props.children}</div>;`,
    "}",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function rootLayoutStub(entry: ManifestEntry): string {
  return [
    header(entry),
    "",
    'import type { Metadata, Viewport } from "next";',
    'import type { ReactNode } from "react";',
    'import "./globals.css";',
    "",
    "export const metadata: Metadata = {",
    '  title: "Taskflow",',
    '  description: "Multi-tenant project and issue tracking for small teams.",',
    "};",
    "",
    "export const viewport: Viewport = {",
    '  themeColor: "#6366f1",',
    "};",
    "",
    "export default function RootLayout(props: { children: ReactNode }) {",
    '  return (',
    '    <html lang="en">',
    "      <body>{props.children}</body>",
    "    </html>",
    "  );",
    "}",
    "",
  ].join("\n");
}

function errorStub(entry: ManifestEntry): string {
  const isGlobal = entry.path.endsWith("global-error.tsx");
  const body = isGlobal
    ? [
        '    <html lang="en">',
        "      <body>",
        `        <h2>Something went wrong</h2>`,
        "        <button onClick={props.reset}>Try again</button>",
        "      </body>",
        "    </html>",
      ]
    : [
        `    <div data-stub=${JSON.stringify(entry.path)}>`,
        "      <h2>Something went wrong</h2>",
        "      <button onClick={props.reset}>Try again</button>",
        "    </div>",
      ];
  return [
    '"use client";',
    "",
    header(entry),
    "",
    "export default function ErrorBoundary(props: {",
    "  error: Error & { digest?: string };",
    "  reset: () => void;",
    "}) {",
    "  return (",
    ...body,
    "  );",
    "}",
    "",
  ].join("\n");
}

function simpleComponentStub(entry: ManifestEntry, name: string): string {
  return [
    header(entry),
    "",
    `export default function ${name}() {`,
    `  return <div data-stub=${JSON.stringify(entry.path)} />;`,
    "}",
    "",
  ].join("\n");
}

function routeStub(entry: ManifestEntry): string {
  const segments = dynamicSegments(entry.path);
  const hasParams = segments.length > 0;
  const context = hasParams
    ? `, context: { params: Promise<${paramsType(entry.path)}> }`
    : "";
  const awaitParams = hasParams ? "  await context.params;\n" : "";
  const method = (verb: string) =>
    [
      `export async function ${verb}(request: Request${context}): Promise<Response> {`,
      "  void request;",
      awaitParams.trimEnd() ? awaitParams.trimEnd() : null,
      "  return Response.json(",
      `    { error: { code: "internal_error", message: "stub: ${entry.path}" } },`,
      "    { status: 501 },",
      "  );",
      "}",
    ]
      .filter((l) => l !== null)
      .join("\n");
  return [header(entry), "", method("GET"), "", method("POST"), ""].join("\n");
}

function testStub(entry: ManifestEntry): string {
  const suite = entry.path.replace(/^tests\//, "").replace(/\.test\.tsx?$/, "");
  return [
    header(entry),
    "",
    'import { describe, it } from "vitest";',
    "",
    `describe(${JSON.stringify(suite)}, () => {`,
    `  it.todo(${JSON.stringify(entry.responsibility)});`,
    "});",
    "",
  ].join("\n");
}

function moduleStub(entry: ManifestEntry, table: Map<string, string>): string {
  const imports = importBlock(entry, table);
  const body = entry.exports.map((e) => renderExport(e, entry.path)).join("\n\n");
  const parts = [entry.client === true ? '"use client";\n' : "", header(entry), ""];
  if (imports) parts.push(imports, "");
  if (body) {
    parts.push(body, "");
  } else {
    parts.push("export {};", "");
  }
  return parts.filter((p) => p !== "").join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function actionStub(entry: ManifestEntry, table: Map<string, string>): string {
  const imports = importBlock(entry, table);
  const body = entry.exports.map((e) => renderExport(e, entry.path)).join("\n\n");
  return [
    '"use server";',
    "",
    header(entry),
    "",
    imports,
    imports ? "" : null,
    body,
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function isAllActions(entry: ManifestEntry): boolean {
  return (
    entry.exports.length > 0 && entry.exports.every((e) => e.kind === "action")
  );
}

function render(entry: ManifestEntry, table: Map<string, string>): string {
  const base = entry.path.split("/").pop() ?? "";
  if (entry.path === "src/app/layout.tsx") return rootLayoutStub(entry);
  if (base === "page.tsx") return pageStub(entry);
  if (base === "layout.tsx") return layoutStub(entry);
  if (base === "error.tsx" || base === "global-error.tsx") return errorStub(entry);
  if (base === "loading.tsx") return simpleComponentStub(entry, "Loading");
  if (base === "not-found.tsx") return simpleComponentStub(entry, "NotFound");
  if (base === "default.tsx") return simpleComponentStub(entry, "DefaultSlot");
  if (base === "route.ts") return routeStub(entry);
  if (/\.test\.tsx?$/.test(entry.path)) return testStub(entry);
  if (isAllActions(entry)) return actionStub(entry, table);
  return moduleStub(entry, table);
}

function main(): void {
  const manifestPath = resolve(ROOT, "corpus-manifest.json");
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as CorpusManifest;

  const table = buildSymbolTable(manifest);

  const force = process.argv.includes("--force");
  let created = 0;
  let skipped = 0;

  for (const entry of manifest.entries) {
    if (entry.owner === "CONTRACT") {
      skipped += 1;
      continue;
    }
    const abs = join(ROOT, entry.path);
    if (existsSync(abs) && !force) {
      skipped += 1;
      continue;
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, render(entry, table), "utf8");
    created += 1;
  }

  console.log(`stubs created: ${created}, existing files left alone: ${skipped}`);
}

main();
