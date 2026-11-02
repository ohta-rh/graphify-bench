/** Sol completion uses the historical Sol parser/prices and the tested streaming transport. */
import { runCodex as streamCodex } from "./terra61-recovery-exec.js";
import { CODEX_BIN, codexArgs, type SolAdditionalEffort } from "./sol61-additional-exec.js";
export { CODEX_BIN, codexArgs, parseCodexEvents, quotaResetAt,
  SOL61_ADDITIONAL_MODEL as SOL61_MODEL, SOL61_ADDITIONAL_EFFORTS as SOL61_EFFORTS,
  SOL61_ADDITIONAL_PRICING as SOL61_PRICING } from "./sol61-additional-exec.js";
export type { SolAdditionalEffort as SolEffort } from "./sol61-additional-exec.js";
export async function runCodex(cwd: string, effort: SolAdditionalEffort, prompt: string, evidenceDir: string) {
  return streamCodex(cwd, effort, prompt, evidenceDir, CODEX_BIN, codexArgs(cwd, effort));
}
