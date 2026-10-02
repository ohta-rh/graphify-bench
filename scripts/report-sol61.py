#!/usr/bin/env python3
"""Build the complete code-45 Sol report, CSV/JSON, and an addition to the model HTML.

Only publishes a result when all 135 requested cells have valid outcomes and grades.
Usage: python3 scripts/report-sol61.py [results/sol61]
"""
import collections
import csv
import datetime as dt
import html
import hashlib
import itertools
import json
import pathlib
import random
import re
import statistics as st
import sys
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "results/sol61")
EFFORTS = ["low", "medium", "high"]
ARMS = [f"sol61-effort-{e}" for e in EFFORTS]
TASKS = {t["id"]: t for f in ["tasks.json", "tasks-ext.json"] for t in json.loads((ROOT / "tasks" / f).read_text())["tasks"]}
EXPERIMENT = json.loads((OUT / "experiment.json").read_text())
# Verify and pin the measured snapshot against the frozen source/test corpus.
snapshot = pathlib.Path(EXPERIMENT["corpus"])
files = sorted(p for top in ["src", "tests"] for p in (ROOT / "corpus/taskflow" / top).rglob("*") if p.is_file())
if snapshot.exists():
    for p in files:
        rel = p.relative_to(ROOT / "corpus/taskflow")
        if p.read_bytes() != (snapshot / rel).read_bytes():
            raise SystemExit(f"measured corpus differs from repository: {rel}")
elif not EXPERIMENT.get("corpus_tree_hash"):
    raise SystemExit("cannot verify corpus without its snapshot or a recorded hash")
tree = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT)}\n' for p in files)
tree_hash = hashlib.sha256(tree.encode()).hexdigest()
if EXPERIMENT.get("corpus_tree_hash") not in [None, tree_hash]:
    raise SystemExit("repository corpus differs from the recorded measured hash")
EXPERIMENT["corpus_tree_hash"] = tree_hash
EXPERIMENT["task_file_sha256"] = {f: hashlib.sha256((ROOT / "tasks" / f).read_bytes()).hexdigest() for f in ["tasks.json", "tasks-ext.json"]}
(OUT / "experiment.json").write_text(json.dumps(EXPERIMENT, indent=2) + "\n")


def load_runs(directory):
    runs = collections.defaultdict(dict)
    for d in sorted(directory.glob("runs/*")):
        if not d.is_dir() or not (d / "run.meta.json").exists():
            continue
        meta = json.loads((d / "run.meta.json").read_text())
        allowed = ARMS + [f"{p}-{e}" for p in ["opus-effort", "effort", "sonnet55-effort"] for e in EFFORTS]
        if meta["condition"] not in allowed:
            continue
        metrics = json.loads((d / "metrics.json").read_text())
        grade = json.loads((d / "grade.json").read_text()) if (d / "grade.json").exists() else {}
        task, arm = meta["task_id"], meta["condition"]
        if task not in TASKS:
            continue
        runs[arm][task] = dict(run_id=d.name, task_id=task, condition=arm, category=meta["category"],
            started_at=meta["started_at"], finished_at=meta["finished_at"],
            success=grade.get("success"), score=grade.get("score"),
            input_tokens=metrics["uncached_equivalent_all"], output_tokens=metrics["output_tokens_all"],
            cached_input_tokens=metrics["cache_read_input_tokens"], thinking_tokens=metrics.get("thinking_tokens"),
            cost_usd=metrics["total_cost_usd"],
            wall_seconds=(meta.get("codex") or meta.get("claude"))["wall_ms"] / 1000,
            tool_calls=sum(metrics["tool_calls"].values()), num_turns=metrics.get("num_turns"),
            runtime=meta.get("runtime", "claude"), cost_basis=metrics.get("cost_basis", "cli_list_price"),
            is_error=metrics["is_error"], error=grade.get("error") or meta.get("error"))
    return runs


R = load_runs(OUT)
for arm in ARMS:
    if set(R[arm]) != set(TASKS):
        raise SystemExit(f"incomplete {arm}: {len(R[arm])}/45 cells")
    for r in R[arm].values():
        if r["is_error"] or r["error"] or r["success"] is None or any(r[k] is None for k in ["input_tokens", "output_tokens", "cost_usd"]):
            raise SystemExit(f"invalid/ungraded run: {r['run_id']}")


def summary(rows):
    rows = list(rows)
    categories = collections.defaultdict(lambda: [0, 0])
    for r in rows:
        categories[r["category"]][0] += int(r["success"])
        categories[r["category"]][1] += 1
    correct = sum(r["success"] for r in rows)
    cost = sum(r["cost_usd"] for r in rows)
    thinking = [r["thinking_tokens"] for r in rows if r["thinking_tokens"] is not None]
    return dict(n=len(rows), correct=correct, accuracy=correct / len(rows), mean_score=st.mean(r["score"] for r in rows),
        cost_sum=cost, cost_median=st.median(r["cost_usd"] for r in rows), cost_per_correct=cost / correct if correct else None,
        wall_median=st.median(r["wall_seconds"] for r in rows), input_median=st.median(r["input_tokens"] for r in rows),
        output_median=st.median(r["output_tokens"] for r in rows), thinking_median=st.median(thinking) if thinking else None,
        by_category=dict(categories))


def bootstrap(x, y, key):
    tasks = sorted(set(R[x]) & set(R[y]))
    diffs = [float(R[x][t][key]) - float(R[y][t][key]) for t in tasks]
    rng = random.Random(7)
    samples = sorted(st.mean(rng.choices(diffs, k=len(diffs))) for _ in range(10000))
    return dict(n=len(diffs), mean=st.mean(diffs), lo=samples[249], hi=samples[9750])


summaries = {a: summary(R[a].values()) for a in ARMS}
measurement_dates = sorted({dt.datetime.fromisoformat(r["started_at"].replace("Z", "+00:00")).astimezone(ZoneInfo("Asia/Tokyo")).date().isoformat()
                            for a in ARMS for r in R[a].values()})
date_label = "〜".join([measurement_dates[0], measurement_dates[-1]]) if len(measurement_dates) > 1 else measurement_dates[0]
EXPERIMENT["measurement_dates_jst"] = measurement_dates
EXPERIMENT["quarantined_attempts"] = len([d for d in (OUT / "quarantine").glob("*") if d.is_dir()])
(OUT / "experiment.json").write_text(json.dumps(EXPERIMENT, indent=2) + "\n")
old = load_runs(ROOT / "results/opus")
R.update(old)
model_prefixes = {"GPT-6.1 Sol": "sol61-effort", "Opus 5.5": "opus-effort", "Sonnet 5": "effort", "Sonnet 5.5": "sonnet55-effort"}
matched_models = {name: summary(R[f"{prefix}-{e}"][t] for e in EFFORTS for t in sorted(TASKS))
                  for name, prefix in model_prefixes.items()}
pair_list = list(itertools.combinations(ARMS[::-1], 2))
pair_list += [(f"sol61-effort-{e}", f"{p}-{e}") for e in EFFORTS for p in ["opus-effort", "effort", "sonnet55-effort"]]
pairs = {f"{x}|{y}": {k: bootstrap(x, y, k) for k in ["success", "cost_usd", "wall_seconds", "input_tokens"]}
         for x, y in pair_list if set(R[x]) == set(TASKS) and set(R[y]) == set(TASKS)}
data = dict(experiment=EXPERIMENT, arms=summaries, matched_models=matched_models, pairs=pairs,
    runs=[R[a][t] for a in ARMS for t in sorted(TASKS)],
    metric_definitions={"input_tokens": "Total input volume including cached input; metrics.uncached_equivalent_all.",
        "output_tokens": "All output tokens, including reasoning once.",
        "cost_usd": "Estimated standard list price for the solver; grading and failed infrastructure attempts excluded.",
        "wall_seconds": "Solver CLI wall time; corpus copy and grading excluded.",
        "num_turns": "Model/API turn count. Null for Codex because native exec JSONL does not expose it."},
    comparison_scope="Effort comparisons use the same Codex runtime. Claude comparisons include runtime/tool/limit/date differences.")
(OUT / "analysis.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
with (OUT / "runs.csv").open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=list(data["runs"][0]))
    writer.writeheader()
    writer.writerows(data["runs"])


def money(v):
    return f"${v:.4f}"


def ci(p, key):
    r = p[key]
    if key == "success":
        return f"{r['mean'] * 100:+.1f} pt [{r['lo'] * 100:+.1f}, {r['hi'] * 100:+.1f}]"
    if key == "cost_usd":
        return f"${r['mean']:+.4f} [{r['lo']:+.4f}, {r['hi']:+.4f}]"
    return f"{r['mean']:+.1f} s [{r['lo']:+.1f}, {r['hi']:+.1f}]"


def arm_label(arm):
    for prefix, name in [("sol61-effort-", "Sol"), ("opus-effort-", "Opus 5.5"), ("sonnet55-effort-", "Sonnet 5.5"), ("effort-", "Sonnet 5")]:
        if arm.startswith(prefix):
            return name + " · " + arm.removeprefix(prefix)
    return arm


def ci_html(p, key):
    value, interval = ci(p, key).split(" [")
    return f'<td class="n">{value}<span class="q">[{interval}</span></td>'


rows = [f"| {a.removeprefix('sol61-effort-')} | {s['correct']}/45 | {s['accuracy']:.1%} | {money(s['cost_median'])} | {money(s['cost_sum'])} | {money(s['cost_per_correct'])} | {s['wall_median']:.1f} s | {s['input_median']:,.0f} |"
        for a, s in summaries.items()]
pair_rows = [f"| {x} − {y} | {ci(pairs[x + '|' + y], 'success')} | {ci(pairs[x + '|' + y], 'cost_usd')} | {ci(pairs[x + '|' + y], 'wall_seconds')} |" for x, y in pair_list if x + "|" + y in pairs]
cat_rows = [f"| {c} | " + " | ".join(f"{summaries[a]['by_category'][c][0]}/{summaries[a]['by_category'][c][1]}" for a in ARMS) + " |" for c in sorted({t["category"] for t in TASKS.values()})]
model_rows = [f"| {name} | {s['correct']}/135 | {s['accuracy']:.1%} | {money(s['cost_median'])} | {money(s['cost_per_correct'])} | {s['wall_median']:.1f} s |" for name, s in matched_models.items()]
total_cost = sum(s["cost_sum"] for s in summaries.values())
report = f"""# GPT-6.1 Sol: code-45, low / medium / high

135 runs, 45 unchanged code tasks × 3 reasoning efforts × 1 repetition. Measured on {date_label} (Asia/Tokyo) with {EXPERIMENT['versions']['codex']}, concurrency {EXPERIMENT['concurrency']}. Total standard list-price equivalent: {money(total_cost)}. Grading uses the existing set-F1 thresholds, Vitest specs, and blind Haiku explanation judge.

| effort | correct | accuracy | cost median | total cost | cost/correct | wall median | input tokens median |
|---|---:|---:|---:|---:|---:|---:|---:|
{chr(10).join(rows)}

| category | low | medium | high |
|---|---:|---:|---:|
{chr(10).join(cat_rows)}

Claude reference comparison, matched low/medium/high cells only (45 × 3 = 135 per model; xhigh excluded). The CLI/tool/date/limit differences still apply. These are descriptive totals; effort-specific paired CIs follow below.

| model | correct | accuracy | cost median | cost/correct | wall median |
|---|---:|---:|---:|---:|---:|
{chr(10).join(model_rows)}

Paired mean differences over the same 45 tasks; percentile 95% bootstrap CIs, 10,000 resamples, seed 7. Positive accuracy means the first arm is better; negative cost/time means it is cheaper/faster. CIs crossing zero do not establish a difference. Claude comparisons include the runtime change and are contextual comparisons, not isolated model effects.

| comparison | accuracy difference [95% CI] | cost difference [95% CI] | wall difference [95% CI] |
|---|---:|---:|---:|
{chr(10).join(pair_rows)}

Measurement details and limits:

- Fresh code-only corpus-v1 clone per cell, the baseline answer contract copied byte-for-byte to AGENTS.md and CLAUDE.md; task prompts, injected fix bugs, answer keys and scoring thresholds are unchanged. Stable shuffled task/effort order. No index.
- Codex native shell/edit tools, workspace-write sandbox, personal config ignored, web search disabled, multi-agent tools disabled. Claude arms use Claude Code with different tools, system prompts and delegation behavior; their dates and concurrency also differ.
- Native input_tokens already includes cached input and cache writes. Uncached input = input − cached − writes. All output tokens include reasoning; reasoning tokens are not added again. Cache writes are billed separately when reported. `uncached_equivalent_all` means total input volume, not the uncached-only portion. Unknown model/API turn count remains null, not 1.
- Cost is calculated from [the official model pricing](https://developers.openai.com/api/docs/models/gpt-6.1-sol): $2/M uncached input, $0.10/M cached input, $2.50/M cache writes, $10/M output, standard service. It is a list-price estimate, not a subscription invoice. Judge charges are in grade.json and excluded from solver costs, matching the existing benchmark.
- Codex exec JSONL does not expose incremental per-request token usage or the original Claude CLI caps. These runs have a 30-minute wall cap, with no enforced 60-model-turn/$4 cap. This is a limit difference for Claude comparisons. Inspect unusually long/expensive runs in runs.csv.
- Each effort has only one run per task; near-equal accuracy at n=45 can reflect noise. This addition measures code-45 only; it supports no claims about hard, ultra, extreme, or index effectiveness.
- The account quota interrupted execution after 89 graded cells on September 30. The remaining 46 cells resumed on October 1, preserving every completed outcome. Efforts were interleaved within each session; date/cache effects are not separately controlled. {EXPERIMENT['quarantined_attempts']} infrastructure attempts are kept in quarantine and excluded from the 135 valid measurements. Raw native events.jsonl, normalized transcript.jsonl for the existing scope audit, actual changes.patch for fix tasks, result.json, run.meta.json, metrics.json and grade.json are retained.

Reproduce with `scripts/run-sol61.sh`; machine-readable data: analysis.json and runs.csv. Japanese report: ../../docs/report-sol61-ja.html, with an addition in ../../docs/report-opus-ja.html.
"""
(OUT / "REPORT.md").write_text(report)

table = '<div class="tbl"><table class="rep"><thead><tr><th>effort</th><th class="n">正解</th><th class="n">推定費用中央値</th><th class="n">費用/正解</th><th class="n">wall 中央値</th><th class="n">入力中央値</th></tr></thead><tbody>'
for a, s in summaries.items():
    table += f'<tr><td>{a.removeprefix("sol61-effort-")}</td><td class="n">{s["correct"]}/45 ({s["accuracy"]:.1%})</td><td class="n">{money(s["cost_median"])}</td><td class="n">{money(s["cost_per_correct"])}</td><td class="n">{s["wall_median"]:.1f} s</td><td class="n">{s["input_median"]:,.0f}</td></tr>'
table += '</tbody></table></div>'
mtable = '<div class="tbl"><table class="rep"><thead><tr><th>モデル</th><th class="n">正解</th><th class="n">費用中央値</th><th class="n">費用/正解</th><th class="n">wall 中央値</th></tr></thead><tbody>'
for name, s in matched_models.items():
    mtable += f'<tr><td>{name}</td><td class="n">{s["correct"]}/135 ({s["accuracy"]:.1%})</td><td class="n">{money(s["cost_median"])}</td><td class="n">{money(s["cost_per_correct"])}</td><td class="n">{s["wall_median"]:.1f} s</td></tr>'
mtable += '</tbody></table></div>'
ptable = '<div class="tbl"><table class="rep"><thead><tr><th>比較（先 − 後）</th><th class="n">正答率差 [95% CI]</th><th class="n">推定費用差 [95% CI]</th><th class="n">wall 差 [95% CI]</th></tr></thead><tbody>'
for x, y in pair_list:
    if x + "|" + y not in pairs:
        continue
    p = pairs[x + "|" + y]
    ptable += f'<tr><td>{html.escape(arm_label(x))} − {html.escape(arm_label(y))}</td>{ci_html(p, "success")}{ci_html(p, "cost_usd")}{ci_html(p, "wall_seconds")}</tr>'
ptable += '</tbody></table></div>'
ctable = '<div class="tbl"><table class="rep"><thead><tr><th>カテゴリ</th><th class="n">low</th><th class="n">medium</th><th class="n">high</th></tr></thead><tbody>'
for c in sorted({t["category"] for t in TASKS.values()}):
    ctable += f'<tr><td>{c}</td>' + ''.join(f'<td class="n">{summaries[a]["by_category"][c][0]}/{summaries[a]["by_category"][c][1]}</td>' for a in ARMS) + '</tr>'
ctable += '</tbody></table></div>'
best_score = max(s["correct"] for s in summaries.values())
best_names = '・'.join(a.removeprefix("sol61-effort-") for a, s in summaries.items() if s["correct"] == best_score)
cheapest = min(summaries, key=lambda a: summaries[a]["cost_per_correct"])
interpretation = f'今回の最多正解は {best_names} の {best_score}/45。正解あたりの推定費用が最も低いのは {cheapest.removeprefix("sol61-effort-")}（{money(summaries[cheapest]["cost_per_correct"])}）。これは今回の観測値で、差の確かさは下の対応比較の信頼区間で判断する。'
section = f"""<!-- SOL61-START -->
<section id="sol61">
<h2 class="col">追記: GPT-6.1 Sol の 45 問（{date_label}）</h2>
<p class="col"><code>gpt-6.1-sol</code> の reasoning low・medium・high を、既存の code-45 全45問で各1回、計135回実行した。{html.escape(EXPERIMENT['versions']['codex'])}、並列度 {EXPERIMENT['concurrency']}、合計の定価換算は {money(total_cost)}。問題・回答契約・採点基準は既存と同じ。</p>
{table}
<p class="col">{interpretation}</p>
<p class="cap">費用は公式単価での推定。入力トークンにはキャッシュ分を含む。wall は問題を解くCLI実行だけの時間。採点時間・費用を含まない。</p>
<h3>カテゴリごとの正解</h3>{ctable}
<h3 id="sol61-claude">Claude シリーズとの参考比較</h3>
<p class="col">各モデルの同じ45問・同じ low／medium／high の135実行だけを集計した（xhigh は除外）。実行環境・時期・上限が異なるため、モデル単体の性能差ではない。設定別の対応比較は次の表に示す。</p>
{mtable}
<h3 id="sol61-pairs">同じ問題どうしの対応比較</h3>
<p class="col">各値は45問での平均差と95% bootstrap CI（10,000回、seed 7）。正答率差はプラスが先の条件に有利、費用・時間差はマイナスが有利。0をまたぐ区間からは差を確定できない。</p>
{ptable}
<h3 id="sol61-limits">比較の条件と限界</h3>
<ul class="col">
<li>Sol の effort 比較は同じ Codex 環境で、実行順を混ぜて測った。コードのみの corpus-v1 を毎回複製し、baseline の回答契約を AGENTS.md と CLAUDE.md に置いた。fix のバグとテスト、集合回答のF1、explain の匿名 Haiku 採点は既存のものを使った。</li>
<li>個人設定・Web検索・subagent は無効。Claude の既存行は Claude Code の別のツール・システムプロンプト・委譲設定・実行日で測っている。Claude との表はモデルと実行環境を合わせた参考比較で、モデル単体の効果を分離できない。</li>
<li>Codex CLI では従来の60モデルターン／$4上限を同じ方法で強制できず、30分の時間上限を使用した。APIターン数は取得できないためnullで保存した。</li>
<li>費用は <a href="https://developers.openai.com/api/docs/models/gpt-6.1-sol">公式モデル単価</a>（入力 $2/M、キャッシュ入力 $0.10/M、書き込み $2.50/M、出力 $10/M）から算出した推定。サブスクの請求額ではない。出力に含まれる reasoning を二重に足していない。</li>
<li>各条件45問・1反復。hard・ultra・extreme の測定や、索引の効果はこの追記の対象外。既存のClaudeモデルの見解はその測定範囲に限る。</li>
<li>9月30日に89実行まで終えた時点で利用枠に達し、10月1日に残り46実行を再開した。完了済みの結果はすべて保持した。日付やキャッシュの影響は分離していない。利用枠などで失敗した {EXPERIMENT['quarantined_attempts']} 試行は quarantine に保存し、135実行の集計から除外した。</li>
</ul>
<p class="foot">生データ: <a href="../results/sol61/analysis.json">analysis.json</a> · <a href="../results/sol61/runs.csv">runs.csv</a> · <a href="../results/sol61/REPORT.md">REPORT.md</a>。全runの回答、使用量、実行ログ、採点、fixの変更を <code>results/sol61/runs</code> に保存。再実行: <code>scripts/run-sol61.sh</code>。</p>
</section>
<!-- SOL61-END -->"""
head = (ROOT / "scripts/report-opus/head.html").read_text().replace('<title>Opus 5.5 対 Sonnet 5</title>', '<title>GPT-6.1 Sol · 45問ベンチマーク</title>')
(ROOT / "docs/report-sol61-ja.html").write_text(head + '<body><div class="wrap"><p class="eyebrow">graphify-bench · GPT-6.1 Sol</p><h1>GPT-6.1 Sol の low・medium・high を45問で比較</h1>' + section + '</div></body></html>\n')
existing = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else ROOT / "docs/report-opus-ja.html"
page = re.sub(r'<!-- SOL61-START -->.*?<!-- SOL61-END -->\n{0,2}', '', existing.read_text(), flags=re.S)
page = page.replace('45 問は、どのモデルも 78〜89% の天井に張り付く。', '45 問では、今回測った Claude 3 モデルは 78〜89% の範囲に入る。')
page = page.replace('その中では Sonnet 5.5 の正解が最も多く', 'この Claude 比較の中では Sonnet 5.5 の正解が最も多く')
anchor = '  <p class="tag col">測定された事実</p>'
if page.count(anchor) != 1:
    raise SystemExit("cannot find unique model-report insertion anchor")
page = page.replace(anchor, section + '\n\n' + anchor)
existing.write_text(page)
readme = ROOT / "README.md"
readme_text = re.sub(r'<!-- SOL61-README-START -->.*?<!-- SOL61-README-END -->\n{0,2}', '', readme.read_text(), flags=re.S)
readme_block = f"""<!-- SOL61-README-START -->
**GPT-6.1 Sol, code-45 addition** ({date_label}, Asia/Tokyo): all 45 original code tasks at reasoning low, medium and high, one repetition each, {EXPERIMENT['versions']['codex']}, concurrency {EXPERIMENT['concurrency']}. 135 graded runs, {money(total_cost)} at estimated standard list price. Same task prompts, baseline answer contract and graders as the existing comparison. The quota interrupted the run after 89 cells; the remaining 46 resumed the next day without replacing completed outcomes.

| effort | correct | accuracy | median cost | cost/correct | median wall |
|---|---:|---:|---:|---:|---:|
""" + '\n'.join(f"| {a.removeprefix('sol61-effort-')} | {s['correct']}/45 | {s['accuracy']:.1%} | {money(s['cost_median'])} | {money(s['cost_per_correct'])} | {s['wall_median']:.1f} s |" for a, s in summaries.items()) + """

The effort comparison uses the same Codex runtime with interleaved execution. Claude rows are contextual comparisons: the agent CLI, tool set, system prompt, delegation and execution date differ. Codex runs have a 30-minute wall cap; the original Claude 60-turn/$4 caps are not enforced by this adapter. These results cover code-45 only. Paired task bootstrap CIs, categories and limits: [`results/sol61`](results/sol61/REPORT.md); machine-readable [`analysis.json`](results/sol61/analysis.json) and [`runs.csv`](results/sol61/runs.csv); Japanese HTML [`report-sol61-ja.html`](docs/report-sol61-ja.html), also appended to [`report-opus-ja.html`](docs/report-opus-ja.html). Reproduce: `BENCH_CORPUS_V1=<code-only snapshot> scripts/run-sol61.sh` (completed cells are skipped).
<!-- SOL61-README-END -->

"""
readme_anchor = 'Paired mean differences over tasks with 95% bootstrap CIs.'
if readme_text.count(readme_anchor) != 1:
    raise SystemExit("cannot find unique README insertion anchor")
readme.write_text(readme_text.replace(readme_anchor, readme_block + readme_anchor))
print(f"wrote {OUT}/analysis.json, runs.csv, REPORT.md and both Japanese HTML reports")
