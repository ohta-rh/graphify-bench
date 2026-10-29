#!/usr/bin/env python3
"""Aggregate the 12 ultra tasks x 2 reps x 4 Sol efforts; preserve Claude data.

Bootstrap tasks, averaging the two repeats before drawing each of 12 tasks.
Usage: report-sol61-ultra.py [--partial | --publish]
"""
import collections
import csv
import datetime as dt
import hashlib
import html
import itertools
import json
import pathlib
import random
import re
import statistics as st
import sys
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'results/sol61-ultra'
PUBLISH = '--publish' in sys.argv
PARTIAL = '--partial' in sys.argv
TASK_FILE = ROOT / 'tasks/tasks-ultra.json'
TASKS = {t['id']: t for t in json.loads(TASK_FILE.read_text())['tasks']}
EFFORTS = ['low', 'medium', 'high', 'xhigh']
ARMS = [f'sol61-effort-{e}' for e in EFFORTS]
EXPERIMENT = json.loads((OUT / 'experiment.json').read_text())
if len(TASKS) != 12 or EXPERIMENT['reps'] != 2:
    raise SystemExit('expected 12 ultra tasks and 2 repeats')
EXPECTED = {(t, r) for t in TASKS for r in [1, 2]}
for file, expected in EXPERIMENT['input_hashes'].items():
    if hashlib.sha256((ROOT/file).read_bytes()).hexdigest() != expected:
        raise SystemExit(f'frozen benchmark input changed: {file}')
snapshot = pathlib.Path(EXPERIMENT['corpus'])
files = sorted(p for top in ['src','tests'] for p in (snapshot/top).rglob('*') if p.is_file())
digest = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(snapshot)}\n' for p in files)
if hashlib.sha256(digest.encode()).hexdigest() != EXPERIMENT['corpus_tree_hash']:
    raise SystemExit('frozen corpus changed')


def load_runs(directory):
    arms = collections.defaultdict(dict)
    for d in sorted((directory / 'runs').iterdir()):
        if not d.is_dir() or not (d / 'run.meta.json').exists():
            continue
        meta = json.loads((d / 'run.meta.json').read_text())
        arm = meta['condition']
        allowed = ARMS + [f'{p}-{e}' for p in ['opus-effort','effort','sonnet55-effort','haiku55-effort','grok-effort','luna-effort'] for e in EFFORTS]
        if meta['task_id'] not in TASKS or arm not in allowed:
            continue
        metrics = json.loads((d / 'metrics.json').read_text())
        if not (d/'grade.json').exists(): continue
        grade = json.loads((d / 'grade.json').read_text())
        result = json.loads((d / 'result.json').read_text())
        task, arm, rep = meta['task_id'], meta['condition'], meta['rep']
        key = (task, rep)
        if key in arms[arm]:
            raise SystemExit(f'duplicate task/repeat: {d}')
        timed_out = result.get('terminal_reason') == 'wall_timeout'
        if result.get('terminal_reason') == 'api_error': continue
        arms[arm][key] = dict(run_id=d.name, task_id=task, rep=rep, condition=arm, category=meta['category'],
            started_at=meta['started_at'], finished_at=meta['finished_at'],
            success=grade.get('success'), score=grade.get('score'), error=grade.get('error'),
            input_tokens=metrics['uncached_equivalent_all'], output_tokens=metrics['output_tokens_all'],
            cached_input_tokens=metrics['cache_read_input_tokens'], thinking_tokens=metrics.get('thinking_tokens'),
            cost_usd=metrics['total_cost_usd'], wall_seconds=(meta.get('codex') or meta['claude'])['wall_ms'] / 1000,
            tool_calls=sum(metrics['tool_calls'].values()), num_turns=metrics.get('num_turns'),
            runtime=meta.get('runtime', 'claude'), cost_basis=metrics.get('cost_basis', 'cli_list_price'),
            is_error=metrics['is_error'], timed_out=timed_out)
    return arms


R = load_runs(OUT)
if PARTIAL:
    progress = {}
    for a in ARMS:
        rows = list(R[a].values())
        costs = [r['cost_usd'] for r in rows if r['cost_usd'] is not None]
        walls = [r['wall_seconds'] for r in rows]
        progress[a] = dict(graded=sum(r['success'] is not None for r in rows),
            correct=sum(bool(r['success']) for r in rows), expected=24,
            known_cost_sum=sum(costs), unknown_cost_runs=len(rows)-len(costs),
            wall_median=st.median(walls) if walls else None)
    updated = dt.datetime.now(ZoneInfo('Asia/Tokyo')).isoformat()
    (OUT/'progress.json').write_text(json.dumps(dict(updated_at=updated,arms=progress,expected=96),indent=2)+'\n')
    complete = all(v['graded']==24 for v in progress.values())
    lines = ['# GPT-6.1 Sol ultra — ' + ('completed measurements' if complete else 'provisional progress'), '', f'Updated {updated}.', '',
        '12 tasks × 2 repetitions × 4 efforts = 96 planned runs. Incomplete arms cannot establish a model ranking.', '',
        '| Effort | Graded | Correct | Known base-rate solver cost | Solver wall median |',
        '|---|---:|---:|---:|---:|']
    for a,s in progress.items():
        wall = f"{s['wall_median']:.1f} s" if s['wall_median'] is not None else 'N/A'
        lines.append(f"| {a.removeprefix('sol61-effort-')} | {s['graded']}/24 | {s['correct']} | ${s['known_cost_sum']:.4f} | {wall} |")
    lines += ['', 'Cost is a base Standard list-price equivalent for completed solver runs, not a subscription invoice. Infrastructure failures and grading are excluded. Native cumulative usage cannot identify per-request long-context surcharges.', '', 'Finished accuracy failures remain scored. Only incomplete transport/quota attempts are quarantined and resumed. ' + ('All 96 runs are graded. Final artifacts: REPORT.md, analysis.json, runs.csv and ../../docs/report-sol61-ultra-ja.html. See html-verification.json for QA status.' if complete else 'Full data and HTML will be published after all 96 runs and evidence review.'), '']
    (OUT/'PROGRESS.md').write_text('\n'.join(lines))
    print(json.dumps(progress,indent=2))
    sys.exit(0)
for arm in ARMS:
    if set(R[arm]) != EXPECTED:
        raise SystemExit(f'incomplete {arm}: {len(R[arm])}/24')
    for row in R[arm].values():
        if row['success'] is None or row['error'] or (row['is_error'] and not row['timed_out']):
            raise SystemExit(f'invalid or ungraded run: {row["run_id"]}')
        if not row['timed_out'] and any(row[k] is None for k in ['cost_usd', 'input_tokens', 'output_tokens']):
            raise SystemExit(f'completed run missing usage: {row["run_id"]}')


def summary(rows):
    rows = list(rows)
    def med(key):
        values = [r[key] for r in rows if r[key] is not None]
        return st.median(values) if values else None
    categories = collections.defaultdict(lambda: [0, 0])
    for r in rows:
        categories[r['category']][0] += int(r['success'])
        categories[r['category']][1] += 1
    correct = sum(int(r['success']) for r in rows)
    unknown = sum(r['cost_usd'] is None for r in rows)
    cost = sum(r['cost_usd'] for r in rows if r['cost_usd'] is not None)
    return dict(n=len(rows), correct=correct, accuracy=correct / len(rows), cost_sum=cost if not unknown else None,
        known_cost_sum=cost, unknown_cost_runs=unknown, cost_median=med('cost_usd'),
        cost_per_correct=cost / correct if correct and not unknown else None,
        wall_median=med('wall_seconds'), wall_mean=st.mean(r['wall_seconds'] for r in rows),
        input_median=med('input_tokens'), output_median=med('output_tokens'), thinking_median=med('thinking_tokens'),
        timed_out=sum(r['timed_out'] for r in rows), by_category=dict(categories))


DRAW_CACHE = {}
def bootstrap(x, y, key):
    # All tasks must contribute; do not drop failures or unknown costs selectively.
    values = []
    for t in sorted(TASKS):
        a, b = [R[x][t, r][key] for r in [1, 2]], [R[y][t, r][key] for r in [1, 2]]
        if any(v is None for v in a + b):
            return dict(n=12, mean=None, lo=None, hi=None, reason='usage unavailable; no task dropped')
        values.append(st.mean(float(v) for v in a) - st.mean(float(v) for v in b))
    if 12 not in DRAW_CACHE:
        rng = random.Random(7)
        DRAW_CACHE[12] = [rng.choices(range(12), k=12) for _ in range(10000)]
    samples = sorted(sum(values[i] for i in draw)/12 for draw in DRAW_CACHE[12])
    return dict(n=12, mean=st.mean(values), lo=samples[249], hi=samples[9750])


S = {a: summary(R[a].values()) for a in ARMS}
old = load_runs(ROOT / 'results/ultra')
R.update({arm: runs for arm, runs in old.items() if arm not in ARMS})
R.update(load_runs(ROOT/'results/luna/ultra'))
FAMILIES = {'GPT-6.1 Sol': 'sol61-effort', 'Opus 5.5': 'opus-effort', 'Sonnet 5': 'effort', 'Sonnet 5.5': 'sonnet55-effort', 'Haiku 5.5': 'haiku55-effort', 'GPT-6 Luna': 'luna-effort'}
for prefix in FAMILIES.values():
    for e in EFFORTS:
        if set(R[f'{prefix}-{e}']) != EXPECTED:
            raise SystemExit(f'unmatched reference arm: {prefix}-{e}')
MODELS = {name: summary(R[f'{prefix}-{e}'][key] for e in EFFORTS for key in sorted(EXPECTED)) for name, prefix in FAMILIES.items()}
MODEL_DATES = {}
for name,prefix in FAMILIES.items():
    days = sorted({dt.datetime.fromisoformat(R[f'{prefix}-{e}'][key]['started_at'].replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Tokyo')).date().isoformat()
                   for e in EFFORTS for key in EXPECTED})
    MODEL_DATES[name] = days
PAIR_LIST = list(itertools.combinations(ARMS[::-1], 2)) + [(f'sol61-effort-{e}', f'{p}-{e}') for e in EFFORTS for p in ['opus-effort', 'effort', 'sonnet55-effort', 'haiku55-effort', 'luna-effort']]
PAIRS = {f'{x}|{y}': {k: bootstrap(x, y, k) for k in ['success', 'cost_usd', 'wall_seconds', 'input_tokens']} for x, y in PAIR_LIST}
ROWS = [R[a][key] for a in ARMS for key in sorted(EXPECTED)]
dates = sorted({dt.datetime.fromisoformat(r['started_at'].replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Tokyo')).date().isoformat() for r in ROWS})
date_label = '〜'.join([dates[0], dates[-1]]) if len(dates) > 1 else dates[0]
EXPERIMENT['measurement_dates_jst'] = dates
EXPERIMENT['quarantined_attempts'] = len(list((OUT / 'quarantine').glob('*')))
(OUT / 'experiment.json').write_text(json.dumps(EXPERIMENT, indent=2) + '\n')
DATA = dict(experiment=EXPERIMENT, arms=S, matched_models=MODELS, pairs=PAIRS, runs=ROWS,
    matched_model_dates_jst=MODEL_DATES,
    reference_artifact_hashes='reference-artifact-hashes.json',
    native_verification='native-verification.json',
    visible_test_change_review='test-change-review.json',
    bootstrap=dict(unit='task', tasks=12, repeats_averaged=2, resamples=10000, seed=7, interval='percentile 95%'),
    metric_definitions=dict(input_tokens='Total input including cached input; cumulative across solver requests.',
        output_tokens='All output, including reasoning once.', cost_usd='Base standard list-price estimate for solver only; not an invoice.',
        wall_seconds='Solver CLI wall time; copying and hidden grading excluded.',
        num_turns='Unavailable for Codex native exec; null, not 1.'),
    comparison_scope='Same tasks/repeats/effort labels; Claude comparisons include different runtime, tooling, limits and dates.')
notes_file = OUT / 'grading-notes.json'
notes = {n['run_id']: n for n in json.loads(notes_file.read_text())} if notes_file.exists() else {}
for row in ROWS:
    if row['success']:
        continue
    log_file = OUT / 'runs' / row['run_id'] / 'vitest.txt'
    log = log_file.read_text() if log_file.exists() else ''
    missing = sorted(set(re.findall(r'No "([^"]+)" export is defined on the "([^"]+)" mock', log)))
    if missing and row['run_id'] not in notes:
        notes[row['run_id']] = dict(run_id=row['run_id'], issue='hidden_mock_missing_export',
            missing_exports=[dict(export=e, module=m) for e, m in missing],
            observation='Strict hidden-test failure retained. Mock omission can block an implementation choice; production correctness has not been independently verified.',
            score_changed=False, task_or_test_changed=False)
DATA['grading_notes'] = [notes[k] for k in sorted(notes)]
notes_file.write_text(json.dumps(DATA['grading_notes'], indent=2) + '\n')
(OUT / 'analysis.json').write_text(json.dumps(DATA, indent=2, ensure_ascii=False) + '\n')
with (OUT / 'runs.csv').open('w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=list(ROWS[0])); writer.writeheader(); writer.writerows(ROWS)


def money(value):
    return 'N/A' if value is None else f'${value:.4f}'


def label(arm):
    for name, prefix in FAMILIES.items():
        if arm.startswith(prefix + '-'):
            return name.replace('GPT-6.1 ', '') + ' · ' + arm.removeprefix(prefix + '-')
    return arm


def ci(pair, key):
    v = pair[key]
    if v['mean'] is None:
        return 'N/A'
    scale = 100 if key == 'success' else 1
    unit = ' pt' if key == 'success' else ' s' if key == 'wall_seconds' else ''
    digits = 4 if key == 'cost_usd' else 1
    prefix = '$' if key == 'cost_usd' else ''
    return f"{prefix}{v['mean']*scale:+.{digits}f}{unit} [{v['lo']*scale:+.{digits}f}, {v['hi']*scale:+.{digits}f}]"


def md_table(headers, rows):
    return '| ' + ' | '.join(headers) + ' |\n|' + '|'.join(['---'] + ['---:'] * (len(headers)-1)) + '|\n' + '\n'.join('| ' + ' | '.join(row) + ' |' for row in rows)


TASK_JA = json.loads((ROOT / 'scripts' / 'task-names-ja.json').read_text())


def html_table(headers, rows):
    def cell(value, tag, index):
        content = html.escape(value)
        if tag == 'td' and index == 0 and value in TASK_JA:
            content = (html.escape(TASK_JA[value]) + '<span class="q" style="display:block;font-family:\'IBM Plex Mono\',monospace;font-size:11px">'
                       + html.escape(value) + '</span>')
        if tag == 'td' and ' [' in value:
            first, rest = value.split(' ['); content = html.escape(first) + '<span class="q">[' + html.escape(rest) + '</span>'
        return f'<{tag}' + (' class="n"' if index else '') + '>' + content + f'</{tag}>'
    return '<div class="tbl"><table class="rep"><thead><tr>' + ''.join(cell(v, 'th', i) for i, v in enumerate(headers)) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(cell(v, 'td', i) for i, v in enumerate(row)) + '</tr>' for row in rows) + '</tbody></table></div>'


HEADERS = ['effort', '正解', '費用中央値/実行', '費用/正解', 'wall 中央値', 'wall 平均']
TABLE_ROWS = [[a.removeprefix('sol61-effort-'), f"{s['correct']}/24 ({s['accuracy']:.1%})", money(s['cost_median']), money(s['cost_per_correct']), f"{s['wall_median']:.1f} s", f"{s['wall_mean']:.1f} s"] for a, s in S.items()]
MODEL_HEADERS = ['モデル', '正解', '費用中央値/実行', '費用/正解', 'wall 中央値', 'wall 平均', '測定日（JST）']
MODEL_ROWS = [[name, f"{s['correct']}/96 ({s['accuracy']:.1%})", money(s['cost_median']), money(s['cost_per_correct']), f"{s['wall_median']:.1f} s", f"{s['wall_mean']:.1f} s",
               '〜'.join([MODEL_DATES[name][0],MODEL_DATES[name][-1]]) if len(MODEL_DATES[name])>1 else MODEL_DATES[name][0]] for name, s in MODELS.items()]
PAIR_HEADERS = ['比較（先 − 後）', '正答率差 [95% CI]', '費用差 [95% CI]', 'wall 差 [95% CI]']
PAIR_ROWS = [[label(x) + ' − ' + label(y)] + [ci(PAIRS[x+'|'+y], k) for k in ['success', 'cost_usd', 'wall_seconds']] for x, y in PAIR_LIST]
TASK_HEADERS = ['問題', *EFFORTS]
TASK_ROWS = [[t] + [f"{sum(R[a][t, r]['success'] for r in [1,2])}/2" for a in ARMS] for t in sorted(TASKS)]
unknown = sum(s['unknown_cost_runs'] for s in S.values())
total = sum(s['known_cost_sum'] for s in S.values())
total_text = money(total) + ('（使用量不明の実行を除いた小計）' if unknown else '')
best = max(s['correct'] for s in S.values())
best_names = '・'.join(a.removeprefix('sol61-effort-') for a,s in S.items() if s['correct']==best)
interpretation = f'今回の最多正解は {best_names} の {best}/24。各effortは12問を2回ずつ測った観測値で、差の確かさは12問を単位にした対応比較で判断する。'
limits = [
    '既存の超難問12問（fix 6・implement 6）を各2反復。問題・回答契約・バグパッチ・hidden test・採点基準は変更していない。hidden testはモデル終了後にインストールし、そのspec全体がexit 0なら正解。',
    '毎回コードのみのcorpus-v1を複製。baselineの回答契約をAGENTS.mdとCLAUDE.mdに置いた。順序は問題・effort・反復を混ぜて固定。個人設定・Web検索・subagentは無効。',
    'Grokはultra xhighの既存測定が揃っていないため、4設定合計の参考比較には含めていない。',
    '比較モデルの参考行は同じ12問×2反復×low/medium/high/xhighの96実行だけを集計し、CLI・ツール・システムプロンプト・委譲・並列度・測定日が異なるため、モデル単体の効果は分離できない。',
    '同じeffort名はモデル間の同じ計算量・費用を意味しない。信頼区間はこの12問の再標本化によるもので、他のコードベースへの一般化を保証しない。多数の比較に対する補正は行っていない。',
    'Solは30分のwall上限。従来のClaudeの120モデルターン/$8上限はCodex exec JSONLでは同じ方法で強制できない。時間上限に達した実行は失敗として保持し、精度を理由にやり直さない。',
    '費用は基本Standard単価（入力$2/M、キャッシュ入力$0.10/M、書き込み$2.50/M、出力$10/M）で推定し、採点・インフラ失敗試行を除外。サブスクの実請求額ではない。272K超の単一リクエストの割増は累積JSONL使用量から識別できず、この推定に含められない。reasoningを出力に二重加算しない。',
    '時間は問題を解くCLI実行だけを計測し、コピー・採点を除外。API/モデルターン数は取得できないためnull。入力はキャッシュを含む累積量。費用が不明な時間切れは小計と不明件数を明示し、費用の対応比較から問題を選別しない。',
    f'測定日（Asia/Tokyo）: {date_label}。インフラ失敗は{EXPERIMENT["quarantined_attempts"]}試行をquarantineに保持。完了済み結果は保持し、利用枠回復後に未完了セルだけ再開する。日付・キャッシュの影響は分離していない。',
]
if DATA['grading_notes']:
    limits.append('採点上の注意: grading-notes.jsonにhidden testのmock不足などの例外を記録した。mock不足による失敗も元の採点を変更せず不合格として集計しているが、テストの例外だけでは本番の動作不良を確定できない。')
review = json.loads((OUT/'test-change-review.json').read_text()) if (OUT/'test-change-review.json').exists() else {}
for run, changes in review.items():
    for change in changes:
        if change.get('review','').startswith('REVIEW_ISSUE:'):
            limits.append(run + ': ' + change['review'])
report = f'# GPT-6.1 Sol: ultra, low / medium / high / xhigh\n\n12 unchanged tasks × 2 repetitions × 4 efforts = 96 graded runs. Measured {date_label}, {EXPERIMENT["versions"]["codex"]}, concurrency {EXPERIMENT["concurrency"]}. Estimated base standard list-price total: {total_text}.\n\n'
report += md_table(HEADERS, TABLE_ROWS) + '\n\n' + interpretation + '\n\n'
report += 'Reference models: matched low/medium/high/xhigh cells only, 96 runs per model. Runtime, limits and dates differ.\n\n' + md_table(MODEL_HEADERS, MODEL_ROWS) + '\n\n'
report += 'Paired task means: average the two repetitions per task, bootstrap the 12 tasks (10,000 resamples, seed 7, percentile 95% CI). Positive accuracy favors the first arm; negative cost/time favors the first arm. Intervals touching/crossing zero do not establish a difference.\n\n' + md_table(PAIR_HEADERS, PAIR_ROWS) + '\n\n'
report += md_table(TASK_HEADERS, TASK_ROWS) + '\n\n' + '\n'.join('- '+x for x in limits) + '\n\nOfficial pricing: https://developers.openai.com/api/docs/models/gpt-6.1-sol\nReproduce: BENCH_CORPUS_V1=<code-only snapshot> bash scripts/run-sol61-ultra.sh\n'
(OUT / 'REPORT.md').write_text(report)
if not PUBLISH:
    print(f'wrote final data: {OUT}/analysis.json, runs.csv, REPORT.md; HTML publication deferred to --publish')
    sys.exit(0)
verification = json.loads((OUT/'native-verification.json').read_text())
if verification['verified'] != 96 or verification['provisional'] or verification['grading_errors'] or verification['existing_test_or_config_edits_needing_review']:
    raise SystemExit('native evidence / test change review incomplete; refusing publication')
if not (OUT/'audit.txt').exists():
    raise SystemExit('scope audit missing')
section = f'''<!-- SOL61-ULTRA-START -->
<section id="sol61-ultra">
<style>#sol61-ultra table.rep{{min-width:720px}}#sol61-ultra .tbl{{overflow-x:auto}}#sol61-ultra th,#sol61-ultra td{{white-space:nowrap}}@media(max-width:700px){{#sol61-ultra .tbl:before{{content:"表は横にスクロールできます";display:block;font-size:12px;padding:8px}}}}</style>
<h2 class="col">追記: GPT-6.1 Sol の超難問（{date_label}）</h2>
<p class="col">既存の超難問12問を reasoning low・medium・high・xhigh で各2回、計96実行した。{html.escape(EXPERIMENT['versions']['codex'])}、並列度{EXPERIMENT['concurrency']}。費用は基本Standard単価換算で {total_text}。</p>
{html_table(HEADERS,TABLE_ROWS)}
<p class="col">{interpretation}</p>
<h3 id="sol61-ultra-claude">既存モデルとの参考比較</h3>
<p class="col">同じ12問×2反復×low/medium/high/xhighの96実行を比較する。CLI・実行上限・測定時期の違いも含む参考比較。</p>
{html_table(MODEL_HEADERS,MODEL_ROWS)}
<h3 id="sol61-ultra-pairs">同じ問題どうしの対応比較</h3>
<p class="col">2反復を問題ごとに平均し、12問を単位にbootstrapした平均差と95% CI（10,000回、seed 7）。正答率差はプラス、費用・時間差はマイナスが先の条件に有利。0に触れる／またぐ区間からは差を確定できない。</p>
{html_table(PAIR_HEADERS,PAIR_ROWS)}
<h3>問題ごとの正解（2反復）</h3>{html_table(TASK_HEADERS,TASK_ROWS)}
<h3>比較の条件と限界</h3>
<ul class="col">{''.join('<li>'+html.escape(x)+'</li>' for x in limits)}</ul>
<p class="col">単価の出典: <a href="https://developers.openai.com/api/docs/models/gpt-6.1-sol">公式OpenAIモデル情報</a>。</p>
<p class="foot">生データ: <a href="../results/sol61-ultra/analysis.json">analysis.json</a> · <a href="../results/sol61-ultra/runs.csv">runs.csv</a> · <a href="../results/sol61-ultra/REPORT.md">REPORT.md</a>。全実行のnative events・回答・使用量・採点・変更差分を保存。再実行: <code>bash scripts/run-sol61-ultra.sh</code>。</p>
</section>
<!-- SOL61-ULTRA-END -->'''
head = (ROOT / 'scripts/report-opus/head.html').read_text().replace('<title>Opus 5.5 対 Sonnet 5</title>', '<title>GPT-6.1 Sol · 超難問ベンチマーク</title>')
(ROOT / 'docs/report-sol61-ultra-ja.html').write_text(head + '<body><div class="wrap"><p class="eyebrow">graphify-bench · GPT-6.1 Sol · ultra</p><h1>GPT-6.1 Sol の超難問をlow・medium・high・xhighで比較</h1>' + section + '</div></body></html>\n')
existing = ROOT / 'docs/report-opus-ja.html'
original_page = existing.read_text()
page = re.sub(r'<!-- SOL61-ULTRA-START -->.*?<!-- SOL61-ULTRA-END -->\n{0,2}', '', original_page, flags=re.S)
anchor = '  <p class="tag col">測定された事実</p>'
if page.count(anchor)!=1:
    raise SystemExit('cannot find unique existing HTML insertion anchor')
if existing.read_text() != original_page: raise SystemExit('shared HTML changed concurrently; retry publication')
existing.write_text(page.replace(anchor, section+'\n\n'+anchor))
readme = ROOT / 'README.md'
original_readme = readme.read_text()
text = re.sub(r'<!-- SOL61-ULTRA-README-START -->.*?<!-- SOL61-ULTRA-README-END -->\n{0,2}', '', original_readme, flags=re.S)
block = f'<!-- SOL61-ULTRA-README-START -->\n**GPT-6.1 Sol, ultra addition** ({date_label}, Asia/Tokyo): the 12 original ultra tasks, 2 repetitions at low/medium/high/xhigh, 96 graded runs. Existing hidden tests are installed only after the agent exits. Estimated base standard list-price total: {total_text}.\n\n'
block += md_table(HEADERS,TABLE_ROWS) + '\n\n'
block += 'Paired comparisons average repeats per task and bootstrap all 12 tasks. Reference model totals use the same 96 low/medium/high/xhigh cells. The runtime, delegation, execution dates and caps differ: Sol uses a 30-minute wall cap and cannot enforce the Claude 120-turn/$8 cap. Base-rate cost estimates cannot identify per-request long-context surcharges from cumulative usage. Data and CIs: [`results/sol61-ultra`](results/sol61-ultra/REPORT.md), [`analysis.json`](results/sol61-ultra/analysis.json), [`runs.csv`](results/sol61-ultra/runs.csv). Japanese HTML: [`report-sol61-ultra-ja.html`](docs/report-sol61-ultra-ja.html), also appended to the [model comparison](docs/report-opus-ja.html). Reproduce: `BENCH_CORPUS_V1=<code-only snapshot> bash scripts/run-sol61-ultra.sh`.\n<!-- SOL61-ULTRA-README-END -->\n\n'
anchor = 'Paired mean differences over tasks with 95% bootstrap CIs.'
if text.count(anchor)!=1:
    raise SystemExit('cannot find unique README insertion anchor')
if readme.read_text() != original_readme: raise SystemExit('README changed concurrently; retry publication')
readme.write_text(text.replace(anchor, block+anchor))
print(f'wrote {OUT}/analysis.json, runs.csv, REPORT.md and ultra HTML addition')
