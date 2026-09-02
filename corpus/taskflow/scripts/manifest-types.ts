/**
 * Shape of `corpus-manifest.json`.
 *
 * The manifest is the contract between the five corpus workers. Every planned
 * source file has exactly one entry; the entry names the owner, what the file
 * is responsible for, the exact public exports it must keep, and which
 * cross-cutting helpers the implementation is required to call.
 */

export type Owner = "A" | "B" | "C" | "D" | "E" | "CONTRACT";

export type ExportKind =
  | "function"
  | "component"
  | "const"
  | "type"
  | "hook"
  | "action"
  | "page"
  | "layout"
  | "route";

export interface ExportSpec {
  /** Exported identifier, or "default" for a default export. */
  name: string;
  kind: ExportKind;
  /**
   * For functions/hooks/actions/components: the full TypeScript signature
   * including parameter names, e.g. `(input: CreateIssueInput, actor: Actor):
   * Promise<ActionResult<Issue>>`. For `type`: the right-hand side of the
   * alias. For `const`: the declared type.
   */
  signature: string;
}

export interface ManifestEntry {
  path: string;
  owner: Owner;
  responsibility: string;
  exports: ExportSpec[];
  /**
   * Cross-cutting helpers the finished implementation MUST call rather than
   * reimplement. Names refer to exports of the frozen contract layer.
   */
  mustUse?: string[];
  /** Emitted with a `"use client"` directive. */
  client?: boolean;
}

export interface CorpusManifest {
  domain: string;
  generatedFrom: string;
  entries: ManifestEntry[];
}
