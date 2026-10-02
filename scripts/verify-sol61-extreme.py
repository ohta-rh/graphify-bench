#!/usr/bin/env python3
"""Verify preserved native usage, settings, hidden tests and matrix coverage."""
import collections
import hashlib
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'results/sol61-extreme'
tasks = {t['id']: t for t in json.loads((ROOT / 'tasks/tasks-extreme.json').read_text())['tasks']}
experiment = json.loads((OUT / 'experiment.json').read_text())
assert hashlib.sha256((ROOT / 'tasks/tasks-extreme.json').read_bytes()).hexdigest() == experiment['task_file_sha256']
assert hashlib.sha256((ROOT / 'overlays/baseline/CLAUDE.md').read_bytes()).hexdigest() == experiment['contract_sha256']
seen = set()
counts = collections.Counter()
timeouts = []
cleaned_workspaces = 0
for folder in sorted((OUT / 'runs').iterdir()):
    if not (folder / 'grade.json').exists():
        continue
    meta, metrics, grade, result = [json.loads((folder / name).read_text()) for name in ['run.meta.json', 'metrics.json', 'grade.json', 'result.json']]
    effort = meta['env']['effort']
    key = (meta['task_id'], effort, meta['rep'])
    assert key not in seen, folder
    seen.add(key); counts[effort] += 1
    assert meta['env']['model'] == 'gpt-6.1-sol', folder
    assert meta['condition'] == 'sol61-effort-' + effort, folder
    args = meta['codex']['argv']
    assert args[args.index('-m') + 1] == 'gpt-6.1-sol', folder
    for setting in ['--ignore-user-config', 'web_search="disabled"', 'features.multi_agent=false', 'model_reasoning_effort="' + effort + '"']:
        assert setting in args, (folder, setting)
    assert grade['success'] in [True, False] and not grade.get('error'), folder
    assert metrics['num_turns'] is None, folder
    assert metrics['subagents_spawned'] == 0, folder
    if result.get('terminal_reason') == 'wall_timeout':
        assert meta['codex']['timed_out'] and not grade['success'], folder
        timeouts.append(folder.name)
        continue
    task = tasks[meta['task_id']]
    assert meta['hidden'] == [h['to'] for h in task['hidden']], folder
    # The runner removes scratch clones after grading. For those runs the saved
    # installation metadata and grader log are the retained evidence.
    if Path(meta['work_dir']).exists():
        for h in task['hidden']:
            installed = Path(meta['work_dir']) / h['to']
            assert installed.read_bytes() == (ROOT / 'tasks' / h['from']).read_bytes(), (folder, h)
    else:
        cleaned_workspaces += 1
    assert meta['codex']['exit_code'] == 0 and not meta['codex']['timed_out'], folder
    assert not metrics['is_error'] and not result['is_error'], folder
    events = [json.loads(s) for s in (folder / 'events.jsonl').read_text().splitlines() if s.strip()]
    terminal = [e for e in events if e['type'] in ['turn.completed', 'turn.failed']][-1]
    assert terminal['type'] == 'turn.completed', folder
    usage = terminal['usage']
    assert usage == result['native_usage'] == metrics['native_usage'], folder
    cached, write, output = usage['cached_input_tokens'], usage.get('cache_write_input_tokens', 0), usage['output_tokens']
    uncached = usage['input_tokens'] - cached - write
    cost = (uncached * 2 + cached * .1 + write * 2.5 + output * 10) / 1e6
    assert uncached >= 0 and math.isclose(cost, metrics['total_cost_usd'], abs_tol=1e-10), folder
    assert math.isclose(cost, result['total_cost_usd'], abs_tol=1e-10), folder
    assert metrics['input_tokens'] == uncached and metrics['cache_read_input_tokens'] == cached, folder
    assert metrics['uncached_equivalent_all'] == usage['input_tokens'] and metrics['output_tokens_all'] == output, folder
    assert grade['success'] == meta['vitest']['passed'] == (meta['vitest']['exitCode'] == 0), folder
    assert metrics['duration_ms'] == meta['codex']['wall_ms'], folder
expected = {(task, effort, rep) for task in tasks for effort in ['low', 'medium', 'high'] for rep in [1, 2]}
assert seen <= expected
if '--partial' not in sys.argv:
    assert seen == expected, f'incomplete matrix: {len(seen)}/72'
print(json.dumps(dict(verified=len(seen), expected=72, per_effort=dict(counts), timed_out=timeouts, missing=len(expected - seen), cleaned_workspaces=cleaned_workspaces), indent=2))
