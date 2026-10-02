#!/usr/bin/env python3
"""Summarize completed Sol benchmark cells, labeling partial matrices provisional."""
import json
import pathlib
import statistics as st
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / (sys.argv[1] if len(sys.argv) > 1 else 'results/sol61-extreme')
exp = json.loads((OUT / 'experiment.json').read_text())
rows = []
for d in sorted((OUT / 'runs').iterdir()):
    if not d.is_dir() or not (d / 'grade.json').exists():
        continue
    g = json.loads((d / 'grade.json').read_text())
    if g.get('success') is None:
        continue
    m = json.loads((d / 'run.meta.json').read_text())
    v = json.loads((d / 'metrics.json').read_text())
    result = json.loads((d / 'result.json').read_text())
    if v['is_error'] and result.get('terminal_reason') != 'wall_timeout':
        continue
    rows.append(dict(run_id=d.name, task_id=m['task_id'], rep=m['rep'], effort=m['env']['effort'],
        success=g['success'], wall_seconds=m['codex']['wall_ms']/1000, cost_usd=v['total_cost_usd']))
expected = len(exp['tasks']) * len(exp['efforts']) * exp['reps']
expected_cells = {(t, e, r) for t in exp['tasks'] for e in exp['efforts'] for r in range(1, exp['reps'] + 1)}
observed_cells = {(r['task_id'], r['effort'], r['rep']) for r in rows}
provisional = observed_cells != expected_cells or len(rows) != expected
summary = {}
for effort in exp['efforts']:
    a = [r for r in rows if r['effort']==effort]
    costs = [r['cost_usd'] for r in a if r['cost_usd'] is not None]
    summary[effort] = dict(n=len(a), correct=sum(r['success'] for r in a),
        wall_median=st.median(r['wall_seconds'] for r in a) if a else None,
        cost_median=st.median(costs) if costs else None, known_cost_sum=sum(costs),
        unknown_cost_runs=sum(r['cost_usd'] is None for r in a))
quotas = [d for d in (OUT / 'quarantine').glob('*') if d.is_dir()]
matched = {}
if exp.get('set') == 'extreme' and rows:
    for name, prefix in [('GPT-6.1 Sol','sol61-effort'), ('Opus 5.5','opus-effort'), ('Sonnet 5','effort'), ('Sonnet 5.5','sonnet55-effort')]:
        a = []
        for row in rows:
            if prefix == 'sol61-effort':
                a.append(row); continue
            d = ROOT / 'results/models/extreme/runs' / f'{row["task_id"]}__{prefix}-{row["effort"]}__r{row["rep"]}'
            m = json.loads((d/'run.meta.json').read_text()); g = json.loads((d/'grade.json').read_text()); v = json.loads((d/'metrics.json').read_text())
            a.append(dict(success=g['success'],wall_seconds=m['claude']['wall_ms']/1000,cost_usd=v['total_cost_usd']))
        costs = [r['cost_usd'] for r in a if r['cost_usd'] is not None]
        matched[name] = dict(n=len(a), correct=sum(r['success'] for r in a), wall_median=st.median(r['wall_seconds'] for r in a),
            cost_median=st.median(costs) if costs else None, known_cost_sum=sum(costs))
data = dict(provisional=provisional, expected=expected, completed=len(rows), summaries=summary, matched_completed_cells=matched, quarantined_attempts=len(quotas), runs=rows)
(OUT / 'progress.json').write_text(json.dumps(data,indent=2)+'\n')
status = 'Provisional Sol progress' if provisional else 'Completed Sol matrix'
note = 'Incomplete, interleaved cells; effort/task composition differs. Do not treat these totals as final model/effort comparisons.' if provisional else 'All planned cells are graded. See REPORT.md and analysis.json for final paired comparisons and grading caveats.'
text = f'# {status}: {len(rows)}/{expected} graded runs\n\n{note}\n\n| effort | correct/completed | wall median | cost median | known cost subtotal |\n|---|---:|---:|---:|---:|\n'
for e,s in summary.items():
    wall=f'{s["wall_median"]:.1f}s' if s['wall_median'] is not None else 'N/A'
    cost=f'${s["cost_median"]:.4f}' if s['cost_median'] is not None else 'N/A'
    text+=f'| {e} | {s["correct"]}/{s["n"]} | {wall} | {cost} | ${s["known_cost_sum"]:.4f} |\n'
text+=f'\nQuarantined infrastructure attempts: {len(quotas)}. Cost is a base standard list-price estimate, not an invoice.\n'
if matched:
    text+='\nReference comparison on exactly the same completed task/effort/repeat cells. '+('Provisional; ' if provisional else '')+'CLI/date/limit differences apply.\n\n| model | correct/completed | wall median | cost median |\n|---|---:|---:|---:|\n'
    for name,s in matched.items():
        cost=f'${s["cost_median"]:.4f}' if s['cost_median'] is not None else 'N/A'
        text+=f'| {name} | {s["correct"]}/{s["n"]} | {s["wall_median"]:.1f}s | {cost} |\n'
(OUT / 'PROGRESS.md').write_text(text)
print(text)
