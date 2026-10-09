#!/usr/bin/env python3
"""Write two SVG heatmaps of model accuracy and cost by task set and effort.

Usage (from repo root):
  python3 scripts/plot-model-heatmaps.py

Writes:
  docs/img/model-accuracy-by-set.svg
  docs/img/model-cost-by-set.svg

Standard library only. Output is deterministic for the same graded runs.
"""

from __future__ import annotations

import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

EFFORTS = ("low", "medium", "high", "xhigh")

# Models that do not offer xhigh; their xhigh rows always render as "not offered".
NO_XHIGH_PREFIXES = frozenset({"grok-effort", "sol61-effort"})

SETS = [
    ("code-45", ["results/opus", "results/sol61", "results/luna/code45"], 45),
    ("hard", ["results/hard", "results/luna/hard"], 32),
    ("ultra", ["results/ultra", "results/luna/ultra"], 24),
    ("extreme", ["results/models/extreme", "results/sol61-extreme", "results/luna/extreme"], 24),
    ("apex", ["results/models/apex"], 12),
    ("brownfield", ["results/models/brownfield", "results/luna/brownfield", "results/sol61-brownfield"], 12),
]

MODELS = [
    ("Opus 5.5", "opus-effort"),
    ("Sonnet 5.5", "sonnet55-effort"),
    ("Haiku 5.5", "haiku55-effort"),
    ("Sonnet 5", "effort"),
    ("Grok 4.7", "grok-effort"),
    ("GPT-6.1 Sol", "sol61-effort"),
    ("GPT-6 Luna", "luna-effort"),
]

BLUE_STEPS = {
    100: "#cde2fb",
    150: "#b7d3f6",
    200: "#9ec5f4",
    250: "#86b6ef",
    300: "#6da7ec",
    350: "#5598e7",
    400: "#3987e5",
    450: "#2a78d6",
    500: "#256abf",
    550: "#1c5cab",
    600: "#184f95",
    650: "#104281",
    700: "#0d366b",
}
STEP_VALUES = tuple(BLUE_STEPS.keys())

CELL_W = 104
CELL_H = 28
GAP = 2
GROUP_GAP = 10
CORNER = 4
PAD = 24
MODEL_LABEL_W = 100
EFFORT_LABEL_W = 48
LABEL_GAP = 10
ROW_LABEL_W = MODEL_LABEL_W + LABEL_GAP + EFFORT_LABEL_W

CAPTION = (
    "Data: results/ (graphify-bench). Claude costs from Claude Code; "
    "Grok from Grok Build; Sol and Luna are list-price estimates."
)


def xml_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def load_runs(dirs: list[str]) -> dict[tuple[str, str, int], dict]:
    """Load graded runs; earlier directory wins for a duplicate (condition, task, rep)."""
    runs: dict[tuple[str, str, int], dict] = {}
    for d in dirs:
        base = ROOT / d / "runs"
        if not base.is_dir():
            continue
        for run_dir in sorted(p for p in base.iterdir() if p.is_dir()):
            try:
                meta = json.loads((run_dir / "run.meta.json").read_text(encoding="utf-8"))
                metrics = json.loads((run_dir / "metrics.json").read_text(encoding="utf-8"))
                grade = json.loads((run_dir / "grade.json").read_text(encoding="utf-8"))
            except (FileNotFoundError, json.JSONDecodeError, OSError):
                continue
            if grade.get("success") is None:
                continue
            key = (meta["condition"], meta["task_id"], meta.get("rep", 1))
            if key in runs:
                continue
            runs[key] = {
                "ok": bool(grade["success"]),
                "cost": metrics.get("total_cost_usd") or 0.0,
            }
    return runs


def aggregate(runs: dict, prefix: str, effort: str, expected: int) -> dict:
    # Exact whole-string match so prefix "effort" does not catch "sonnet55-effort-*".
    cond = f"{prefix}-{effort}"
    rows = [v for (c, _task, _rep), v in runs.items() if c == cond]
    n = len(rows)
    if n == 0:
        return {"kind": "empty", "n": 0, "expected": expected, "correct": 0,
                "accuracy": None, "cost_per_correct": None}
    correct = sum(1 for r in rows if r["ok"])
    cost_sum = sum(r["cost"] for r in rows)
    return {
        "kind": "partial" if n < expected else "full",
        "n": n,
        "expected": expected,
        "correct": correct,
        "accuracy": correct / n,
        "cost_per_correct": (cost_sum / correct) if correct else None,
    }


def not_offered_cell(expected: int) -> dict:
    return {
        "kind": "not_offered",
        "n": 0,
        "expected": expected,
        "correct": 0,
        "accuracy": None,
        "cost_per_correct": None,
    }


def snap_step(raw: float) -> int:
    clamped = max(100.0, min(700.0, raw))
    return min(STEP_VALUES, key=lambda s: abs(s - clamped))


def accuracy_step(acc: float) -> int:
    if acc < 0.4:
        raw = 100.0
    else:
        raw = 100.0 + (acc - 0.4) / 0.6 * 600.0
    return snap_step(raw)


def cost_step(cost_per_correct: float) -> int:
    log_v = math.log10(cost_per_correct)
    log_min = math.log10(0.003)
    log_max = math.log10(3.0)
    raw = 100.0 + (log_v - log_min) / (log_max - log_min) * 600.0
    return snap_step(raw)


def format_pct(acc: float) -> str:
    return f"{int(round(acc * 100))}%"


def format_cost(value: float) -> str:
    if value >= 1.0:
        return f"${value:.2f}"
    text = f"{value:.3g}"
    if "e" in text.lower():
        exp = math.floor(math.log10(value)) if value > 0 else 0
        decimals = max(0, 2 - exp)
        text = f"{value:.{decimals}f}"
    return f"${text}"


def text_class_for_step(step: int) -> str:
    return "txt-dark" if step <= 350 else "txt-light"


def style_block() -> str:
    step_rules = "\n".join(
        f"    .step-{step}{{fill:{color}}}" for step, color in BLUE_STEPS.items()
    )
    return f"""  <style>
    svg{{
      --surface:#fcfcfb;
      --ink:#0b0b0b;
      --ink-secondary:#52514e;
      --empty:#ecebe7;
    }}
    @media (prefers-color-scheme:dark){{
      svg{{
        --surface:#1a1a19;
        --ink:#ffffff;
        --ink-secondary:#c3c2b7;
        --empty:#2a2a28;
      }}
    }}
    .bg{{fill:var(--surface)}}
    .ink{{fill:var(--ink)}}
    .ink-sec{{fill:var(--ink-secondary)}}
    .empty{{fill:var(--empty)}}
{step_rules}
    .txt-dark{{fill:#0b0b0b}}
    .txt-light{{fill:#ffffff}}
    text{{
      font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
    }}
    .num{{font-variant-numeric:tabular-nums}}
    .title{{font-size:16px;font-weight:600}}
    .subtitle{{font-size:13px}}
    .label{{font-size:13px}}
    .effort{{font-size:12px}}
    .cell-main{{font-size:12px}}
    .cell-sub{{font-size:10px}}
    .caption{{font-size:12px}}
  </style>"""


def cell_rect(x: int, y: int, fill_class: str, title: str) -> str:
    return (
        f'      <g>\n'
        f'        <title>{xml_escape(title)}</title>\n'
        f'        <rect class="{fill_class}" x="{x}" y="{y}" width="{CELL_W}" '
        f'height="{CELL_H}" rx="{CORNER}" ry="{CORNER}"/>\n'
    )


def cell_texts(cx: float, cy: float, main: str, sub: str | None, text_class: str) -> str:
    lines = []
    if sub is None:
        lines.append(
            f'        <text class="cell-main num {text_class}" x="{cx:g}" y="{cy:g}" '
            f'text-anchor="middle" dominant-baseline="central">{xml_escape(main)}</text>'
        )
    else:
        lines.append(
            f'        <text class="cell-main num {text_class}" x="{cx:g}" y="{cy - 6:g}" '
            f'text-anchor="middle" dominant-baseline="central">{xml_escape(main)}</text>'
        )
        lines.append(
            f'        <text class="cell-sub num {text_class}" x="{cx:g}" y="{cy + 7:g}" '
            f'text-anchor="middle" dominant-baseline="central">{xml_escape(sub)}</text>'
        )
    lines.append("      </g>")
    return "\n".join(lines)


def group_height() -> int:
    return len(EFFORTS) * CELL_H + (len(EFFORTS) - 1) * GAP


def row_y(grid_top: int, model_idx: int, effort_idx: int) -> int:
    return grid_top + model_idx * (group_height() + GROUP_GAP) + effort_idx * (CELL_H + GAP)


def render_svg(kind: str, matrix: list[list[list[dict]]], title: str, subtitle: str) -> str:
    n_models = len(MODELS)
    n_cols = len(SETS)
    grid_w = n_cols * CELL_W + (n_cols - 1) * GAP
    grid_h = n_models * group_height() + (n_models - 1) * GROUP_GAP

    title_y = PAD
    subtitle_y = PAD + 16 + 8
    col_label_y = subtitle_y + 13 + 18
    grid_top = col_label_y + 13 + 6
    grid_left = PAD + ROW_LABEL_W + LABEL_GAP
    caption_y = grid_top + grid_h + 16
    # Keep the caption on one line inside the viewBox (~6.6px/char at 12px).
    # Fit the widest text line: caption (~6.6 px/char at 12px) and subtitle (~6.4 px/char at 13px).
    width = max(grid_left + grid_w + PAD,
                PAD + (len(CAPTION) * 66 + 5) // 10 + PAD,
                PAD + (len(subtitle) * 64 + 5) // 10 + PAD)
    height = caption_y + 12 + PAD

    parts: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" role="img" aria-label="{xml_escape(title)}">',
        f"  <title>{xml_escape(title)}</title>",
        style_block(),
        f'  <rect class="bg" width="{width}" height="{height}"/>',
        f'  <text class="title ink" x="{PAD}" y="{title_y}" dominant-baseline="hanging">'
        f"{xml_escape(title)}</text>",
        f'  <text class="subtitle ink-sec" x="{PAD}" y="{subtitle_y}" dominant-baseline="hanging">'
        f"{xml_escape(subtitle)}</text>",
    ]

    for col, (set_label, _dirs, _expected) in enumerate(SETS):
        cx = grid_left + col * (CELL_W + GAP) + CELL_W / 2
        parts.append(
            f'  <text class="label ink" x="{cx:g}" y="{col_label_y}" text-anchor="middle" '
            f'dominant-baseline="hanging">{xml_escape(set_label)}</text>'
        )

    for model_idx, (model_label, _prefix) in enumerate(MODELS):
        g_h = group_height()
        group_top = grid_top + model_idx * (g_h + GROUP_GAP)
        model_cy = group_top + g_h / 2
        parts.append(
            f'  <text class="label ink" x="{PAD + MODEL_LABEL_W}" y="{model_cy:g}" '
            f'text-anchor="end" dominant-baseline="central">{xml_escape(model_label)}</text>'
        )

        for effort_idx, effort in enumerate(EFFORTS):
            y = row_y(grid_top, model_idx, effort_idx)
            effort_cy = y + CELL_H / 2
            parts.append(
                f'  <text class="effort ink-sec" x="{grid_left - LABEL_GAP}" y="{effort_cy:g}" '
                f'text-anchor="end" dominant-baseline="central">{xml_escape(effort)}</text>'
            )
            for col, (set_label, _dirs, _expected) in enumerate(SETS):
                cell = matrix[model_idx][effort_idx][col]
                x = grid_left + col * (CELL_W + GAP)
                cx = x + CELL_W / 2
                cy = y + CELL_H / 2

                if cell["kind"] == "not_offered":
                    title_tip = f"{model_label} · {effort}: not offered"
                    parts.append(cell_rect(x, y, "empty", title_tip))
                    parts.append(cell_texts(cx, cy, "n/a", None, "ink-sec"))
                    continue

                if cell["kind"] == "empty":
                    title_tip = f"{model_label} · {effort} · {set_label}: not measured"
                    parts.append(cell_rect(x, y, "empty", title_tip))
                    parts.append(cell_texts(cx, cy, "—", None, "ink-sec"))
                    continue

                partial = cell["kind"] == "partial"
                sub = f'{cell["n"]}/{cell["expected"]}' if partial else None

                if kind == "accuracy":
                    acc = cell["accuracy"]
                    step = accuracy_step(acc)
                    pct = format_pct(acc)
                    title_tip = (
                        f'{model_label} · {effort} · {set_label}: '
                        f'{cell["correct"]}/{cell["n"]} ({pct})'
                    )
                    parts.append(cell_rect(x, y, f"step-{step}", title_tip))
                    parts.append(cell_texts(cx, cy, pct, sub, text_class_for_step(step)))
                else:
                    cpc = cell["cost_per_correct"]
                    if cpc is None:
                        title_tip = (
                            f'{model_label} · {effort} · {set_label}: '
                            f'{cell["correct"]}/{cell["n"]} (no pass)'
                        )
                        parts.append(cell_rect(x, y, "empty", title_tip))
                        parts.append(cell_texts(cx, cy, "no pass", sub, "ink-sec"))
                    else:
                        step = cost_step(cpc)
                        cost_text = format_cost(cpc)
                        title_tip = (
                            f'{model_label} · {effort} · {set_label}: {cost_text} · '
                            f'{cell["correct"]}/{cell["n"]}'
                        )
                        parts.append(cell_rect(x, y, f"step-{step}", title_tip))
                        parts.append(
                            cell_texts(cx, cy, cost_text, sub, text_class_for_step(step))
                        )

    parts.append(
        f'  <text class="caption ink-sec" x="{PAD}" y="{caption_y}" '
        f'dominant-baseline="hanging">{xml_escape(CAPTION)}</text>'
    )
    parts.append("</svg>")
    return "\n".join(parts) + "\n"


def main() -> None:
    data = {label: load_runs(dirs) for label, dirs, _expected in SETS}
    matrix: list[list[list[dict]]] = []
    for _model, prefix in MODELS:
        model_rows: list[list[dict]] = []
        for effort in EFFORTS:
            if effort == "xhigh" and prefix in NO_XHIGH_PREFIXES:
                row = [not_offered_cell(expected) for _label, _dirs, expected in SETS]
            else:
                row = [
                    aggregate(data[set_label], prefix, effort, expected)
                    for set_label, _dirs, expected in SETS
                ]
            model_rows.append(row)
        matrix.append(model_rows)

    out_dir = ROOT / "docs" / "img"
    out_dir.mkdir(parents=True, exist_ok=True)

    accuracy_path = out_dir / "model-accuracy-by-set.svg"
    cost_path = out_dir / "model-cost-by-set.svg"

    accuracy_svg = render_svg(
        "accuracy",
        matrix,
        "Accuracy by task set and effort",
        "Share of graded runs that passed the hidden test. Darker = higher. "
        "— = not measured; n/N = still running; n/a = effort not offered.",
    )
    cost_svg = render_svg(
        "cost",
        matrix,
        "List-price cost per correct answer by task set and effort",
        "USD per passed run; darker = more expensive (log scale). "
        "— = not measured; n/N = still running; n/a = effort not offered. "
        "Codex and Grok costs are estimates.",
    )

    accuracy_path.write_text(accuracy_svg, encoding="utf-8")
    cost_path.write_text(cost_svg, encoding="utf-8")

    print("docs/img/model-accuracy-by-set.svg")
    print("docs/img/model-cost-by-set.svg")


if __name__ == "__main__":
    main()
