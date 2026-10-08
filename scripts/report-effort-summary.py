#!/usr/bin/env python3
"""Detailed all-model comparison across the four task sets, as one HTML page.

Models: Haiku 5.5, Sonnet 5.5, Opus 5.5, Sonnet 5 (Claude Code), Grok 4.7 (Grok CLI),
GPT-6.1 Sol and GPT-6 Luna (Codex). Every table scores each model on the same
(task, effort, repetition) cells as the reference arm (Opus), so the rows are paired.
Pooled numbers use low / medium / high only, because Grok and Sol have no xhigh; xhigh
appears in the effort-scaling and per-effort sections. A model whose run is unfinished
is shown with its completed-cell count. Runs without a numeric grade are skipped.
Usage: python3 scripts/report-effort-summary.py [docs/report-effort-summary-ja.html]
"""
import collections
import datetime
import html
import json
import pathlib
import random
import statistics as st
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else "docs/report-effort-summary-ja.html")
EFFORTS = ["low", "medium", "high"]
ALL_EFFORTS = EFFORTS + ["xhigh"]
REF = "sonnet55-effort"
MODELS = [("Haiku 5.5", "haiku55-effort"), ("Sonnet 5.5", "sonnet55-effort"), ("Opus 5.5", "opus-effort"),
          ("Sonnet 5", "effort"), ("Grok 4.7", "grok-effort"), ("GPT-6.1 Sol", "sol61-effort"),
          ("GPT-6 Luna", "luna-effort")]
SETS = [("45問", "code-45", ["results/opus", "results/sol61", "results/luna/code45"]),
        ("難問", "hard", ["results/hard", "results/luna/hard"]),
        ("超難問", "ultra", ["results/ultra", "results/luna/ultra"]),
        ("極難問", "extreme", ["results/models/extreme", "results/sol61-extreme", "results/luna/extreme"])]
CATEGORIES = [("locate", "場所を探す"), ("reference", "呼び出し元を挙げる"), ("explain", "流れを説明する"),
              ("impact", "影響範囲を洗い出す"), ("fix", "バグを直す")]


def load(dirs):
    runs = {}
    for d in dirs:
        base = ROOT / d / "runs"
        if not base.is_dir():
            continue
        for r in sorted(base.glob("*")):
            try:
                meta = json.loads((r / "run.meta.json").read_text())
                metrics = json.loads((r / "metrics.json").read_text())
                grade = json.loads((r / "grade.json").read_text())
            except (FileNotFoundError, json.JSONDecodeError):
                continue
            if grade.get("success") is None:
                continue
            result = {}
            if (r / "result.json").exists():
                result = json.loads((r / "result.json").read_text())
            runtime = meta.get("codex") or meta.get("claude")
            runs[(meta["condition"], meta["task_id"], meta.get("rep", 1))] = dict(
                ok=bool(grade["success"]), score=grade.get("score"), category=meta.get("category"),
                cost=metrics.get("total_cost_usd") or 0.0, turns=metrics.get("num_turns"),
                tools=sum((metrics.get("tool_calls") or {}).values()), wall=runtime["wall_ms"] / 1000,
                error=bool(metrics.get("is_error")), terminal=result.get("terminal_reason") or result.get("subtype"))
    return runs


DATA = {key: load(dirs) for _, key, dirs in SETS}
QUARANTINE = {key: sum(1 for d in dirs for q in (ROOT / d / "quarantine").glob("*") if (ROOT / d / "quarantine").is_dir())
              for _, key, dirs in SETS}


def cells(key, efforts, prefix="opus-effort"):
    return sorted({(e, t, r) for (c, t, r) in DATA[key] for e in efforts if c == f"{prefix}-{e}"})


def rows_for(key, prefix, cell_list):
    return [DATA[key][(f"{prefix}-{e}", t, r)] for e, t, r in cell_list if (f"{prefix}-{e}", t, r) in DATA[key]]


def summarize(rows, total):
    if not rows:
        return None
    correct = sum(x["ok"] for x in rows)
    cost = sum(x["cost"] for x in rows)
    walls = sorted(x["wall"] for x in rows)
    turns = [x["turns"] for x in rows if x["turns"] is not None]
    return dict(n=len(rows), total=total, correct=correct, acc=correct / len(rows), cost=cost,
                per_correct=cost / correct if correct else None, cost_med=st.median(x["cost"] for x in rows),
                wall=st.median(walls), p90=walls[min(len(walls) - 1, int(0.9 * len(walls)))],
                turns=st.median(turns) if turns else None, tools=st.median(x["tools"] for x in rows),
                capped=sum(1 for x in rows if x["terminal"] in ("max_turns", "error_max_turns", "wall_timeout")))


def stats(key, prefix, efforts):
    base = cells(key, efforts)
    return summarize(rows_for(key, prefix, base), len(base))


# ---------- formatting ----------
def esc(s):
    return html.escape(str(s))


def usd(v, digits=3):
    return "-" if v is None else f"${v:.{digits}f}"


def pct(v):
    return "-" if v is None else f"{v:.0%}"


def table(head, body, caption=None, cls=""):
    cap = f"<caption>{caption}</caption>" if caption else ""
    ths = "".join(f"<th>{h}</th>" for h in head)
    return f'<div class="tbl {cls}"><table>{cap}<thead><tr>{ths}</tr></thead><tbody>{"".join(body)}</tbody></table></div>'


def bold_best(values, better="max"):
    live = [v for v in values if v is not None]
    if not live:
        return None
    return max(live) if better == "max" else min(live)


def cell(v, best, text, partial=False):
    t = f"<b>{text}</b>" if v is not None and v == best else text
    return f'<td class="n{" partial" if partial else ""}">{t}</td>'


def done_note(s):
    return "" if s is None or s["n"] == s["total"] else f'<span class="part">{s["n"]}/{s["total"]}</span>'


# ---------- 0. status ----------
def status_section():
    body = []
    for m, p in MODELS:
        tds = []
        for _, key, _ in SETS:
            n = sum(1 for (c, _, _) in DATA[key] if c.startswith(p + "-") and c.rsplit("-", 1)[-1] in ALL_EFFORTS)
            base = len(cells(key, ALL_EFFORTS))
            has_x = any(c == f"{p}-xhigh" for (c, _, _) in DATA[key])
            expected = base if has_x else len(cells(key, EFFORTS))
            tds.append(f'<td class="n">{"-" if n == 0 else f"{n}/{expected}"}</td>')
        body.append(f"<tr><td>{m}</td>{''.join(tds)}</tr>")
    q = "".join(f'<td class="n">{QUARANTINE[key]}</td>' for _, key, _ in SETS)
    body.append(f'<tr class="na"><td>quarantine（全モデル、再実行済み）</td>{q}</tr>')
    return ('<h2 id="status">進み具合</h2><p class="muted">採点済みセル数 / 予定セル数。'
            'xhigh の無いモデル（Grok・Sol）は low〜high が予定数。</p>'
            + table(["モデル"] + [name for name, _, _ in SETS], body))


# ---------- 1. overview matrices ----------
def overview_section():
    parts = ['<h2 id="overview">総合（low〜high、同じセルで比較）</h2>']
    S = {(m, key): stats(key, p, EFFORTS) for m, p in MODELS for _, key, _ in SETS}
    specs = [("正答率", lambda s: s["acc"], pct, "max"),
             ("$/正解", lambda s: s["per_correct"], usd, "min"),
             ("1本あたりの時間（中央値）", lambda s: s["wall"], lambda v: f"{v:.0f}s", "min"),
             ("1本あたりの時間（p90）", lambda s: s["p90"], lambda v: f"{v:.0f}s", "min"),
             ("ターン数（中央値）", lambda s: s["turns"], lambda v: "-" if v is None else f"{v:.0f}", "min")]
    for title, get, fmt, better in specs:
        body = []
        best = {key: bold_best([get(S[(m, key)]) if S[(m, key)] else None for m, _ in MODELS], better) for _, key, _ in SETS}
        for m, _ in MODELS:
            tds = ""
            for _, key, _ in SETS:
                s = S[(m, key)]
                if s is None:
                    tds += '<td class="n na">-</td>'
                    continue
                v = get(s)
                tds += cell(v, best[key], (fmt(v) if v is not None else "-") + done_note(s), s["n"] != s["total"])
            body.append(f"<tr><td>{m}</td>{tds}</tr>")
        parts.append(table(["モデル"] + [n for n, _, _ in SETS], body, title))
    return "\n".join(parts)


# ---------- 2. paired comparison vs Sonnet 5.5 ----------
def bootstrap(diffs, seed=7, n=10000):
    rng = random.Random(seed)
    k = len(diffs)
    means = sorted(sum(rng.choice(diffs) for _ in range(k)) / k for _ in range(n))
    return st.mean(diffs), means[int(0.025 * n)], means[int(0.975 * n) - 1]


def paired_section():
    parts = ['<h2 id="paired">Sonnet 5.5 とのペア比較</h2>',
             '<p class="muted">low〜high の同じセルで、タスクごとに「そのモデルの正答率 − Sonnet 5.5 の正答率」を取り、'
             'タスクを 10,000 回リサンプルした 95% 信頼区間（seed 7）。区間が 0 をまたぐなら差は確立していない。'
             'コストと時間は同じセルの合計・中央値の比。セルが揃っていないモデルは、揃ったセルだけで計算している。</p>']
    body = []
    for name, key, _ in SETS:
        base = cells(key, EFFORTS)
        for m, p in MODELS:
            if p == REF:
                continue
            per_task = collections.defaultdict(lambda: [[], []])
            for e, t, r in base:
                a, b = DATA[key].get((f"{p}-{e}", t, r)), DATA[key].get((f"{REF}-{e}", t, r))
                if a and b:
                    per_task[t][0].append(a["ok"]); per_task[t][1].append(b["ok"])
            if not per_task:
                continue
            diffs = [st.mean(x) - st.mean(y) for x, y in per_task.values()]
            mean, lo, hi = bootstrap(diffs)
            ma = [DATA[key][(f"{p}-{e}", t, r)] for e, t, r in base if (f"{p}-{e}", t, r) in DATA[key] and (f"{REF}-{e}", t, r) in DATA[key]]
            mb = [DATA[key][(f"{REF}-{e}", t, r)] for e, t, r in base if (f"{p}-{e}", t, r) in DATA[key] and (f"{REF}-{e}", t, r) in DATA[key]]
            sig = "sig-neg" if hi < 0 else "sig-pos" if lo > 0 else ""
            cr = sum(x["cost"] for x in ma) / sum(x["cost"] for x in mb)
            wr = st.median(x["wall"] for x in ma) / st.median(x["wall"] for x in mb)
            body.append(f'<tr><td>{name}</td><td>{m}</td><td class="n">{len(ma)}</td>'
                        f'<td class="n {sig}">{mean * 100:+.1f}pt</td><td class="n">[{lo * 100:+.1f}, {hi * 100:+.1f}]</td>'
                        f'<td class="n">{cr:.2f}×</td><td class="n">{wr:.2f}×</td></tr>')
    parts.append(table(["セット", "モデル", "セル", "正答率の差", "95% CI", "コスト比", "時間比"], body))
    return "\n".join(parts)


# ---------- 3. code-45 categories ----------
def category_section():
    key = "code-45"
    parts = ['<h2 id="category">45問：カテゴリ別</h2>',
             '<p class="muted">各カテゴリは 9 問（元の 15 問から 3 問 + 拡張 30 問から 6 問）。low〜high の 3 effort で 27 セル。'
             'locate / reference / impact は正解ファイル集合との F1、explain は LLM 判定、fix はテスト。'
             '平均スコアは合否の手前の連続値（F1 など）。GPT-6 Luna の explain は採点が後回しのため空欄。</p>']
    base = cells(key, EFFORTS)
    body = []
    best = {cat: bold_best([sum(x["ok"] for x in rows_for(key, p, base) if x["category"] == cat) for _, p in MODELS])
            for cat, _ in CATEGORIES}
    for m, p in MODELS:
        tds = ""
        for cat, _ in CATEGORIES:
            rows = [x for x in rows_for(key, p, base) if x["category"] == cat]
            if not rows:
                tds += '<td class="n na">-</td>'
                continue
            c = sum(x["ok"] for x in rows)
            sc = st.mean(x["score"] or 0 for x in rows)
            tds += cell(c, best[cat], f'{c}/{len(rows)} <span class="part">{sc:.2f}</span>')
        body.append(f"<tr><td>{m}</td>{tds}</tr>")
    parts.append(table(["モデル"] + [f"{c}<br><span class=th-sub>{j}</span>" for c, j in CATEGORIES], body,
                       "正解数（low〜high 合計）と平均スコア"))
    # per effort
    for e in ALL_EFFORTS:
        eb = cells(key, [e])
        body = []
        for m, p in MODELS:
            rows = rows_for(key, p, eb)
            if not rows:
                continue
            tds = ""
            for cat, _ in CATEGORIES:
                cr = [x for x in rows if x["category"] == cat]
                tds += f'<td class="n">{sum(x["ok"] for x in cr)}/{len(cr)}</td>' if cr else '<td class="n na">-</td>'
            tot = sum(x["ok"] for x in rows)
            body.append(f'<tr><td>{m}</td>{tds}<td class="n">{tot}/{len(rows)}</td></tr>')
        parts.append(table(["モデル"] + [c for c, _ in CATEGORIES] + ["計"], body, f"effort: {e}", "compact"))
    # tasks most often failed
    fails = collections.Counter()
    tries = collections.Counter()
    for (c, t, r), x in DATA[key].items():
        if any(c == f"{p}-{e}" for _, p in MODELS for e in EFFORTS):
            tries[t] += 1
            fails[t] += not x["ok"]
    body = [f'<tr><td>{esc(t)}</td><td class="n">{fails[t]}/{tries[t]}</td></tr>' for t, _ in fails.most_common(10)]
    parts.append(table(["タスク", "全モデルの失敗数"], body, "落とされやすいタスク（全モデル・low〜high）", "compact"))
    return "\n".join(parts)


# ---------- 4. effort scaling ----------
def scaling_section():
    parts = ['<h2 id="scaling">effort を上げたときの伸び方</h2>',
             '<p class="muted">各セル：正解数 / 本数、その下に 1 本あたりのコスト中央値。xhigh は Claude と Luna のみ。</p>']
    for name, key, _ in SETS:
        body = []
        for m, p in MODELS:
            tds = ""
            seen = False
            for e in ALL_EFFORTS:
                s = summarize(rows_for(key, p, cells(key, [e])), len(cells(key, [e])))
                if s is None:
                    tds += '<td class="n na">-</td>'
                    continue
                seen = True
                tds += f'<td class="n">{s["correct"]}/{s["n"]}<br><span class="part">{usd(s["cost_med"])}</span></td>'
            if seen:
                body.append(f"<tr><td>{m}</td>{tds}</tr>")
        parts.append(table(["モデル"] + ALL_EFFORTS, body, name, "compact"))
    return "\n".join(parts)


# ---------- 5. per-task matrices ----------
def task_section():
    parts = ['<h2 id="tasks">タスク別の正誤（難問・超難問・極難問）</h2>',
             '<p class="muted">low〜high × 2 回 = 6 本中の正解数。0〜2 は赤、6 は強調。</p>']
    for name, key, _ in SETS[1:]:
        tasks = sorted({t for (_, t, _) in cells(key, EFFORTS)})
        body = []
        for t in tasks:
            tds = ""
            for _, p in MODELS:
                rows = [x for (c, tt, r), x in DATA[key].items() if tt == t and c in {f"{p}-{e}" for e in EFFORTS}]
                if not rows:
                    tds += '<td class="n na">-</td>'
                    continue
                c = sum(x["ok"] for x in rows)
                cls = "hit" if c == len(rows) else "low" if c <= len(rows) / 3 else ""
                tds += f'<td class="n {cls}">{c}/{len(rows)}</td>'
            body.append(f"<tr><td>{esc(t)}</td>{tds}</tr>")
        parts.append(table(["タスク"] + [m for m, _ in MODELS], body, name, "compact"))
    return "\n".join(parts)


# ---------- 6. reliability ----------
def reliability_section():
    parts = ['<h2 id="reliability">打ち切り</h2>',
             '<p class="muted">ターン上限（Claude: 45問・難問 60、超難問・極難問 120）や Codex の 30 分上限で打ち切られた本数。'
             '打ち切りも結果として残し、隠しテストで採点している。</p>']
    body = []
    for m, p in MODELS:
        tds = ""
        for _, key, _ in SETS:
            rows = rows_for(key, p, cells(key, ALL_EFFORTS))
            n = sum(1 for x in rows if x["terminal"] in ("max_turns", "error_max_turns", "wall_timeout"))
            tds += f'<td class="n">{"-" if not rows else f"{n}/{len(rows)}"}</td>'
        body.append(f"<tr><td>{m}</td>{tds}</tr>")
    parts.append(table(["モデル"] + [n for n, _, _ in SETS], body, None, "compact"))
    return "\n".join(parts)


# ---------- 7. per-effort detail ----------
def effort_tables():
    sections = []
    for effort in ALL_EFFORTS:
        parts = [f'<h2 id="{effort}">effort: {effort}</h2>']
        for name, key, _ in SETS:
            base = cells(key, [effort])
            ss = [(m, summarize(rows_for(key, p, base), len(base))) for m, p in MODELS]
            ss = [(m, s) for m, s in ss if s]
            if not ss:
                continue
            ba = bold_best([s["acc"] for _, s in ss])
            bc = bold_best([s["per_correct"] for _, s in ss], "min")
            bw = bold_best([s["wall"] for _, s in ss], "min")
            body = []
            for m, s in ss:
                body.append(f'<tr><td>{m}{done_note(s)}</td><td class="n">{s["correct"]}/{s["n"]}</td>'
                            + cell(s["acc"], ba, f'{s["acc"]:.0%}<span class="bar" style="--w:{s["acc"] * 100:.0f}%"></span>')
                            + f'<td class="n">{usd(s["cost"], 2)}</td>' + cell(s["per_correct"], bc, usd(s["per_correct"]))
                            + cell(s["wall"], bw, f'{s["wall"]:.0f}s')
                            + f'<td class="n">{s["p90"]:.0f}s</td><td class="n">{"-" if s["turns"] is None else f"{s["turns"]:.0f}"}</td>'
                              f'<td class="n">{s["tools"]:.0f}</td></tr>')
            parts.append(f"<h3>{name}<span class=sub>{len(base)}セル</span></h3>"
                         + table(["モデル", "正解", "正答率", "コスト計", "$/正解", "時間", "p90", "turn", "tool"], body))
        sections.append("\n".join(parts))
    return "\n".join(sections)


today = datetime.date.today().isoformat()
body = "\n".join([status_section(), overview_section(), paired_section(), category_section(),
                  scaling_section(), task_section(), reliability_section(), effort_tables()])
page = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>モデル比較の詳細</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@700&family=Noto+Sans+JP:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root{{--ground:#F5F6F3;--panel:#FCFCFB;--ink:#1C2024;--ink-2:#5F6B67;--rule:#D8DDD9;--rule-2:#EEF0EC;--accent:#3E4B9A;--bar:#B9C4C0;--good:#0B7A6F;--bad:#B24A2A;--hit:#E3EFEC;--low:#F6E4DD}}
  @media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--ground:#15181A;--panel:#1C2023;--ink:#E6E9E6;--ink-2:#9AA39F;--rule:#2C3235;--rule-2:#232829;--accent:#9AA6E8;--bar:#3A4448;--good:#3DB3A5;--bad:#E0785A;--hit:#1F2F2C;--low:#3A2621}}}}
  :root[data-theme="dark"]{{--ground:#15181A;--panel:#1C2023;--ink:#E6E9E6;--ink-2:#9AA39F;--rule:#2C3235;--rule-2:#232829;--accent:#9AA6E8;--bar:#3A4448;--good:#3DB3A5;--bad:#E0785A;--hit:#1F2F2C;--low:#3A2621}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:var(--ground);color:var(--ink);font-family:"Noto Sans JP",system-ui,sans-serif;font-size:15px;line-height:1.8}}
  .wrap{{max-width:1040px;margin:0 auto;padding:48px 16px 96px}}
  h1,h2,h3{{font-family:"Shippori Mincho",serif;margin:0}}
  h1{{font-size:clamp(24px,4vw,34px);line-height:1.4}}
  h2{{font-size:24px;margin-top:64px;padding-top:16px;border-top:1px solid var(--rule)}}
  h3{{font-size:17px;margin-top:32px}}
  .sub{{font-family:"Noto Sans JP",sans-serif;font-weight:400;font-size:13px;color:var(--ink-2);margin-left:10px}}
  p,li{{max-width:76ch}} .muted{{color:var(--ink-2);font-size:13.5px}}
  nav{{display:flex;flex-wrap:wrap;gap:4px 16px}} nav a{{color:var(--accent);font-weight:500}}
  .tbl{{overflow-x:auto;margin:12px 0 4px;background:var(--panel);border:1px solid var(--rule);border-radius:6px}}
  table{{border-collapse:collapse;width:100%;font-size:14px}}
  .compact table{{font-size:13px}} .compact th,.compact td{{padding:5px 10px}}
  caption{{text-align:left;padding:10px 12px 0;color:var(--ink-2);font-size:13px}}
  th,td{{padding:7px 12px;border-bottom:1px solid var(--rule-2);white-space:nowrap;text-align:left;vertical-align:top}}
  th{{font-weight:500;color:var(--ink-2);font-size:12.5px}} .th-sub{{font-weight:400;font-size:11px}}
  td.n{{text-align:right;font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}}
  td b{{color:var(--accent);font-weight:500}}
  th:not(:first-child){{text-align:right}}
  td.na,tr.na td{{color:var(--ink-2)}} td.partial{{color:var(--ink-2)}}
  .part{{display:block;font-size:11px;color:var(--ink-2);font-family:"IBM Plex Mono",monospace}}
  td.hit{{background:var(--hit)}} td.low{{background:var(--low)}}
  td.sig-neg{{color:var(--bad);font-weight:500}} td.sig-pos{{color:var(--good);font-weight:500}}
  .bar{{display:inline-block;vertical-align:middle;margin-left:8px;width:56px;height:6px;background:linear-gradient(90deg,var(--bar) var(--w),transparent var(--w));border:1px solid var(--rule)}}
</style>
</head>
<body><div class="wrap">
<h1>モデル比較の詳細：Claude・Grok・GPT</h1>
<p class="muted">{today} 集計。45問・難問・超難問・極難問の4セット。Haiku 5.5 / Sonnet 5.5 / Opus 5.5 / Sonnet 5（Claude Code）、Grok 4.7（Grok CLI）、GPT-6.1 Sol / GPT-6 Luna（Codex）。</p>
<nav><a href="#status">進み具合</a><a href="#overview">総合</a><a href="#paired">ペア比較</a><a href="#category">カテゴリ別</a><a href="#scaling">effort</a><a href="#tasks">タスク別</a><a href="#reliability">打ち切り</a><a href="#low">low</a><a href="#medium">medium</a><a href="#high">high</a><a href="#xhigh">xhigh</a></nav>
<ul class="muted">
<li>どの表も、同じタスク・同じ effort・同じ回のセルで比べている（ペア比較）。合計は low〜high のみ（Grok と Sol に xhigh が無いため）。</li>
<li>途中のモデルは、終わったセル数を小さく添えている（例 36/45）。その数字は揃ったセルだけの値なので、他モデルと完全には比べられない。</li>
<li>コストの出どころが違う。Claude は API の報告額、Grok は Grok Build の報告額、Sol と Luna は定価からの推定。</li>
<li>実行環境（Claude Code / Codex / Grok CLI）、測った日、並列数（3 または 6）が違う。時間の数十%の差は誤差のうち、2 倍以上の差は本物として読む。</li>
<li>Sol と Luna は turn を記録しない。Sol は難問・超難問を測っていない。</li>
<li>極難問 EIM2-issue-import は、隠しテストのモックに <code>setOrgPlan</code> が無いと落ちる（Sol は 6 本中 5 本がこれ）。採点はどのモデルも同じ厳格なルールのまま。</li>
<li>スコープ監査（他の実行や正解への接触）は全セットで違反 0。フラグは自分の作業ディレクトリ外への打ち間違い <code>cd</code> と自前の検証ファイルで、中身を確認済み。</li>
</ul>
{body}
<p class="muted" style="margin-top:64px">再生成：python3 scripts/report-effort-summary.py</p>
</div></body></html>
"""
OUT.write_text(page)
print(f"wrote {OUT.relative_to(ROOT)}")
