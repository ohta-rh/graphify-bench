/** Serialize the unchanged blind Claude judge, using only Luna's own results. */
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, RUNS_DIR } from "./lib/env.js";
import { gradeRun } from "./grade.js";
import { parseTaskFile } from "../tasks/tasks.schema.js";

if (!RUNS_DIR.includes(`${path.sep}luna${path.sep}`)) throw new Error("Luna results directory required");
const tasks = new Map(["tasks/tasks.json", "tasks/tasks-ext.json"].flatMap(f =>
  parseTaskFile(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, f), "utf8"))).tasks).map(t => [t.id, t]));
for (const id of fs.readdirSync(RUNS_DIR).sort()) {
  if (!id.includes("__luna-effort-")) continue;
  const dir = path.join(RUNS_DIR, id), file = path.join(dir, "grade.json");
  const task = tasks.get(id.split("__")[0]!);
  if (!task || task.grader !== "llm-judge") continue;
  if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, "utf8")).success !== null) continue;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const grade = await gradeRun(id, tasks, path.join(REPO_ROOT, "tasks"));
    fs.writeFileSync(file, JSON.stringify(grade, null, 2) + "\n");
    console.log(`judge ${id} attempt=${attempt} success=${grade.success} score=${grade.score}`);
    if (grade.success !== null) break;
    const archive = path.join(dir, `judge-incomplete-${attempt}-${Date.now()}.json`);
    fs.copyFileSync(file, archive);
    if (attempt === 5) throw new Error(`${id}: judge infrastructure failure; solver result preserved`);
    await new Promise(resolve => setTimeout(resolve, 60_000));
  }
}
