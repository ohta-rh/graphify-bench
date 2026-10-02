#!/usr/bin/env python3
"""Effort-by-effort summary of every model across the four task sets, as one HTML page.

Compares Grok 4.7, GPT-6.1 Sol, Opus 5.5, Sonnet 5.5 and Sonnet 5 at low / medium / high
(xhigh is left out because Grok and Sol have none). Cells are matched: every model is scored
on the cells the reference arm (Opus) has, and Sol, which ran only code-45 and extreme, is totalled
separately over those two sets. Runs without grade.json are skipped.
Usage: python3 scripts/report-effort-summary.py [docs/report-effort-summary-ja.html]
"""
import datetime
import html
import json
import pathlib
import statistics as st
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "docs/report-effort-summary-ja.html")
EFFORTS = ["low", "medium", "high"]
MODELS = [("Grok 4.7", "grok-effort"), ("GPT-6.1 Sol", "sol61-effort"), ("Opus 5.5", "opus-effort"),
          ("Sonnet 5.5", "sonnet55-effort"), ("Sonnet 5", "effort")]
SETS = [("45問", "code-45", ["results/opus", "results/sol61"]), ("難問", "hard", ["results/hard"]),
        ("超難問", "ultra", ["results/ultra"]), ("極難問", "extreme", ["results/models/extreme", "results/sol61-extreme"])]


def load(dirs):
    runs = {}
    for d in dirs:
        for r in sorted((ROOT / d / "runs").glob("*")):
            if not (r / "grade.json").exists() or not (r / "run.meta.json").exists():
                continue
            meta = json.loads((r / "run.meta.json").read_text())
            metrics = json.loads((r / "metrics.json").read_text())
            grade = json.loads((r / "grade.json").read_text())
            if grade.get("success") is None:
                continue
            runtime = meta.get("codex") or meta.get("claude")
            runs[(meta["condition"], meta["task_id"], meta.get("rep", 1))] = dict(
                ok=bool(grade["success"]), cost=metrics.get("total_cost_usd"), turns=metrics.get("num_turns"),
                tools=sum((metrics.get("tool_calls") or {}).values()), wall=runtime["wall_ms"] / 1000)
    return runs


def stats(runs, prefix, cells):
    rows = [runs[(f"{prefix}-{e}", t, r)] for e, t, r in cells if (f"{prefix}-{e}", t, r) in runs]
    if not rows:
        return None
    correct = sum(x["ok"] for x in rows)
    cost = sum(x["cost"] for x in rows if x["cost"] is not None)
    turns = [x["turns"] for x in rows if x["turns"] is not None]
    return dict(n=len(rows), correct=correct, acc=correct / len(rows), cost=cost,
                per_correct=cost / correct if correct else None, wall=st.median(x["wall"] for x in rows),
                turns=st.median(turns) if turns else None, tools=st.median(x["tools"] for x in rows))


DATA = {key: load(dirs) for _, key, dirs in SETS}


def cells(key, effort, prefix="opus-effort"):
    return sorted({(effort, t, r) for (c, t, r) in DATA[key] if c == f"{prefix}-{effort}"})


def table(rows, caption=None):
    """rows: list of (label, stats | note | None); bolds the best accuracy, lowest cost and fastest time."""
    live = [s for _, s in rows if isinstance(s, dict)]
    best_acc = max(s["acc"] for s in live)
    best_cost = min(s["per_correct"] for s in live if s["per_correct"])
    best_wall = min(s["wall"] for s in live)
    out = ['<div class="tbl"><table>']
    if caption:
        out.append(f"<caption>{caption}</caption>")
    out.append("<thead><tr><th>モデル</th><th>正解</th><th>正答率</th><th>コスト計</th><th>$/正解</th>"
               "<th>時間</th><th>turn</th><th>tool</th></tr></thead><tbody>")
    for label, s in rows:
        if not isinstance(s, dict):
            out.append(f'<tr class="na"><td>{label}</td><td colspan="7">{s or "対象外"}</td></tr>')
            continue
        def b(cond, text):
            return f"<b>{text}</b>" if cond else text
        acc = b(s["acc"] == best_acc, f"{s['acc']:.0%}")
        per = b(s["per_correct"] == best_cost, f"${s['per_correct']:.3f}") if s["per_correct"] else "-"
        wall = b(s["wall"] == best_wall, f"{s['wall']:.0f}s")
        turns = "-" if s["turns"] is None else f"{s['turns']:.0f}"
        out.append(
            f"<tr><td>{label}</td><td class=n>{s['correct']}/{s['n']}</td>"
            f'<td class=n>{acc}<span class="bar" style="--w:{s["acc"] * 100:.0f}%"></span></td>'
            f"<td class=n>${s['cost']:.2f}</td><td class=n>{per}</td><td class=n>{wall}</td>"
            f"<td class=n>{turns}</td><td class=n>{s['tools']:.0f}</td></tr>")
    out.append("</tbody></table></div>")
    return "\n".join(out)


SOL_SETS = {"code-45", "extreme"}
SCOPES = [("all4", "4セット合計（Sol は難問・超難問を測っていないので除外）", lambda m, key: m != "GPT-6.1 Sol"),
          ("sol2", "45問＋極難問の合計（Sol を含む全モデル）", lambda m, key: key in SOL_SETS)]
TOTALS = {}  # (scope, effort|"all", model) -> dict(n, correct, cost)


def add_total(scope, effort, model, s):
    for e in (effort, "all"):
        t = TOTALS.setdefault((scope, e, model), dict(n=0, correct=0, cost=0.0))
        t["n"] += s["n"]; t["correct"] += s["correct"]; t["cost"] += s["cost"]


def total_table(scope, effort, caption):
    rows = [(m, TOTALS[(scope, effort, m)]) for m, _ in MODELS if (scope, effort, m) in TOTALS]
    best_acc = max(t["correct"] / t["n"] for _, t in rows)
    best_cost = min(t["cost"] / t["correct"] for _, t in rows)
    body = ""
    for m, t in rows:
        acc, per = t["correct"] / t["n"], t["cost"] / t["correct"]
        body += (f"<tr><td>{m}</td><td class=n>{t['correct']}/{t['n']}</td>"
                 f"<td class=n>{'<b>' if acc == best_acc else ''}{acc:.1%}{'</b>' if acc == best_acc else ''}"
                 f'<span class="bar" style="--w:{acc * 100:.0f}%"></span></td>'
                 f"<td class=n>${t['cost']:.2f}</td><td class=n>{'<b>' if per == best_cost else ''}${per:.3f}{'</b>' if per == best_cost else ''}</td></tr>")
    return (f'<div class="tbl"><table><caption>{caption}</caption><thead><tr><th>モデル</th><th>正解</th><th>正答率</th>'
            f"<th>コスト計</th><th>$/正解</th></tr></thead><tbody>{body}</tbody></table></div>")


sections = []
for effort in EFFORTS:
    parts = []
    for name, key, _ in SETS:
        base = cells(key, effort)
        rows = [(m, stats(DATA[key], p, base)) for m, p in MODELS]
        parts.append(f"<h3>{name}<span class=sub>{len(base)}セル</span></h3>" + table(rows))
        for m, s in rows:
            for scope, _, keep in SCOPES:
                if isinstance(s, dict) and keep(m, key):
                    add_total(scope, effort, m, s)
    head = [f'<h2 id="{effort}">effort: {effort}</h2>'] + [total_table(sc, effort, cap) for sc, cap, _ in SCOPES]
    sections.append("\n".join(head + parts))
overview = '<h2 id="overview">総合（low・medium・high の合計）</h2>' + "".join(
    total_table(sc, "all", cap) for sc, cap, _ in SCOPES)
sections.insert(0, overview)

sol_done = sum(1 for k in DATA["extreme"] if k[0].startswith("sol61"))
today = datetime.date.today().isoformat()
page = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>effort別モデル比較</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&family=Noto+Sans+JP:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root{{--ground:#F5F6F3;--panel:#FCFCFB;--ink:#1C2024;--ink-2:#5F6B67;--rule:#D8DDD9;--rule-2:#EEF0EC;--accent:#3E4B9A;--bar:#B9C4C0}}
  @media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--ground:#15181A;--panel:#1C2023;--ink:#E6E9E6;--ink-2:#9AA39F;--rule:#2C3235;--rule-2:#232829;--accent:#9AA6E8;--bar:#3A4448}}}}
  :root[data-theme="dark"]{{--ground:#15181A;--panel:#1C2023;--ink:#E6E9E6;--ink-2:#9AA39F;--rule:#2C3235;--rule-2:#232829;--accent:#9AA6E8;--bar:#3A4448}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--ground);color:var(--ink);font-family:"Noto Sans JP",system-ui,sans-serif;font-size:15px;line-height:1.8}}
  .wrap{{max-width:960px;margin:0 auto;padding:48px 16px 96px}}
  h1,h2,h3{{font-family:"Shippori Mincho",serif;margin:0}}
  h1{{font-size:clamp(24px,4vw,34px);line-height:1.4}}
  h2{{font-size:24px;margin-top:64px;padding-top:16px;border-top:1px solid var(--rule)}}
  h3{{font-size:17px;margin-top:32px}}
  .sub{{font-family:"Noto Sans JP",sans-serif;font-weight:400;font-size:13px;color:var(--ink-2);margin-left:10px}}
  p,li{{max-width:72ch}} .muted{{color:var(--ink-2);font-size:13.5px}}
  nav a{{color:var(--accent);margin-right:16px;font-weight:500}}
  .tbl{{overflow-x:auto;margin:12px 0 4px;background:var(--panel);border:1px solid var(--rule);border-radius:6px}}
  table{{border-collapse:collapse;width:100%;font-size:14px}}
  caption{{text-align:left;padding:10px 12px 0;color:var(--ink-2);font-size:13px}}
  th,td{{padding:7px 12px;border-bottom:1px solid var(--rule-2);white-space:nowrap;text-align:left}}
  th{{font-weight:500;color:var(--ink-2);font-size:12.5px}}
  td.n{{text-align:right;font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}}
  td b{{color:var(--accent);font-weight:500}}
  th:not(:first-child){{text-align:right}}
  tr.na td{{color:var(--ink-2)}}
  .bar{{display:inline-block;vertical-align:middle;margin-left:8px;width:56px;height:6px;background:linear-gradient(90deg,var(--bar) var(--w),transparent var(--w));border:1px solid var(--rule)}}
</style>
</head>
<body><div class="wrap">
<h1>effort別モデル比較：Grok 4.7・GPT-6.1 Sol・Claude</h1>
<p class="muted">{today} 集計。45問・難問・超難問・極難問の4セット、effort は low / medium / high。</p>
<nav><a href="#overview">総合</a><a href="#low">low</a><a href="#medium">medium</a><a href="#high">high</a></nav>
<ul class="muted">
<li>どのモデルも同じタスク・同じ回のセルで比べている。Claude の xhigh は Grok と Sol に無いので外した。</li>
<li>時間・turn・tool は中央値。$/正解 はコスト計を正解数で割った値。太字はその表で最良。</li>
<li>コストの出どころが違う。Claude は API の報告額、Grok は Grok Build の報告額、Sol は定価からの推定。</li>
<li>Sol は turn を記録しない。難問・超難問は測っていないので、Sol を含む比較は 45問＋極難問 の合計で見る（Sol は {sol_done}/72 セル完了）。</li>\n<li>極難問 EIM2-issue-import は、hidden test のモックに <code>setOrgPlan</code> が無いために落ちる実行がある（Sol は6件中5件）。採点は他モデルと同じ厳格なルールのまま変えていない。</li>
<li>実行環境（Claude Code / Codex / Grok CLI）が違うので、純粋なモデル差ではない。数セルの表の1〜2問差は誤差の範囲。</li>
</ul>
{''.join(sections)}
<p class="muted" style="margin-top:64px">再生成：python3 scripts/report-effort-summary.py</p>
</div></body></html>
"""
OUT.write_text(page)
print(f"wrote {OUT.relative_to(ROOT)}")
