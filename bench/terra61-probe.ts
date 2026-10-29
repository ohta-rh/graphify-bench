/** Availability probes only; no probe is scored as a benchmark task. */
import fs from 'node:fs';
import path from 'node:path';
import { TERRA61_EFFORTS, runCodex, parseCodexEvents, CODEX_BIN } from './lib/terra61-exec.js';
const out=path.resolve('results/terra61/probes');
const work='/private/tmp/terra61-probe-20261027';
fs.mkdirSync(work,{recursive:true}); fs.mkdirSync(out,{recursive:true});
for (const effort of TERRA61_EFFORTS) {
  const inv=await runCodex(work,effort,'Reply with exactly OK. Do not use tools.');
  const parsed=parseCodexEvents(inv.stdout,inv.wallMs);
  fs.writeFileSync(path.join(out,effort+'.jsonl'),inv.stdout);
  fs.writeFileSync(path.join(out,effort+'.stderr'),inv.stderr);
  fs.writeFileSync(path.join(out,effort+'.meta.json'),JSON.stringify({binary:CODEX_BIN,argv:inv.argv,exitCode:inv.exitCode,completed:parsed.completed,usage:parsed.nativeUsage,wall_ms:inv.wallMs,error:parsed.error,not_a_scored_benchmark:true},null,2)+'\n');
  console.log(effort,parsed.completed,inv.exitCode,parsed.error??parsed.result.result);
  if (!parsed.completed || inv.exitCode!==0) throw new Error(`Terra ${effort} probe failed; no substitute model allowed`);
}
