#!/usr/bin/env python3
"""Terra's independent six-set progress and paired final report.

Never writes Claude's result directories or regenerates its HTML. The final
publication inserts only a delimited Terra section into the latest shared files.
"""
import csv
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
from datetime import datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'results/terra61'
EFFORTS = ['low', 'medium', 'high', 'xhigh']
SETS = {
    'code45': (['tasks.json', 'tasks-ext.json'], 1, 'results/opus', '通常45問'),
    'hard': (['tasks-hard.json'], 2, 'results/hard', '難問'),
    'ultra': (['tasks-ultra.json'], 2, 'results/ultra', '超難問'),
    'extreme': (['tasks-extreme.json'], 2, 'results/models/extreme', '極難問'),
    'apex': (['tasks-apex.json'], 2, 'results/models/apex', 'apex'),
    'brownfield': (['tasks-brownfield.json'], 2, 'results/models/brownfield', 'brownfield'),
}
FAMILIES = {'opus-effort': 'Opus 5.5', 'effort': 'Sonnet 5', 'sonnet55-effort': 'Sonnet 5.5',
            'haiku55-effort': 'Haiku 5.5', 'grok-effort': 'Grok 4.7', 'sol61-effort': 'GPT-6.1 Sol', 'luna-effort': 'GPT-6 Luna'}


def read(path):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def load(directory, tasks, prefixes):
    rows = []
    for d in sorted((directory / 'runs').glob('*')):
        meta, result, metrics = [read(d / f) for f in ['run.meta.json', 'result.json', 'metrics.json']]
        if not meta or not result or not metrics or meta['task_id'] not in tasks:
            continue
        arm = meta['condition']
        if arm not in {p+'-'+e for p in prefixes for e in EFFORTS}:
            continue
        timeout = result.get('terminal_reason') == 'wall_timeout'
        # Turn/budget caps are scored outcomes in the Claude arms. Only an
        # infrastructure terminal is excluded; do not drop capped failures.
        if result.get('terminal_reason') == 'api_error' and not timeout:
            continue
        grade = read(d / 'grade.json') or {}
        wall = (meta.get('codex') or meta.get('claude') or {}).get('wall_ms')
        if wall is None:
            raise SystemExit(f'missing CLI wall time: {d}')
        rows.append(dict(run_id=d.name, task_id=meta['task_id'], condition=arm, rep=meta['rep'],
            effort=arm.rsplit('-', 1)[1], success=grade.get('success'), score=grade.get('score'),
            grading_error=grade.get('error'), deferred=grade.get('details', {}).get('deferred'),
            wall_seconds=wall/1000, cost_usd=metrics['total_cost_usd'],
            input_tokens=metrics['uncached_equivalent_all'], output_tokens=metrics['output_tokens_all'],
            runtime=meta.get('runtime', 'claude'), started_at=meta['started_at'], timed_out=timeout,
            cost_basis=metrics.get('cost_basis', 'cli_list_price'), num_turns=metrics.get('num_turns')))
    return rows


def summary(rows):
    def median(key):
        values = [r[key] for r in rows if r[key] is not None]
        return st.median(values) if values else None
    graded = [r for r in rows if r['success'] is not None]
    correct = sum(bool(r['success']) for r in graded)
    known = sum(r['cost_usd'] for r in rows if r['cost_usd'] is not None)
    unknown = sum(r['cost_usd'] is None for r in rows)
    return dict(solver_completed=len(rows), graded=len(graded), correct=correct,
        accuracy=correct/len(graded) if graded else None, wall_median=median('wall_seconds'),
        wall_mean=st.mean(r['wall_seconds'] for r in rows) if rows else None,
        cost_median=median('cost_usd'), known_cost_sum=known, unknown_cost_runs=unknown,
        cost_sum=None if unknown else known, timed_out=sum(r['timed_out'] for r in rows))


DRAW_CACHE = {}
def paired(a, b, tasks, reps, key):
    values = []
    for task in sorted(tasks):
        av = [a[task, rep][key] for rep in range(1, reps+1)]
        bv = [b[task, rep][key] for rep in range(1, reps+1)]
        if any(v is None for v in av+bv):
            return dict(n=len(tasks), mean=None, lo=None, hi=None, reason='unavailable metric; no task dropped')
        values.append(sum(float(v) for v in av)/reps - sum(float(v) for v in bv)/reps)
    n = len(values)
    if n not in DRAW_CACHE:
        rng = random.Random(7)
        DRAW_CACHE[n] = [rng.choices(range(n), k=n) for _ in range(10000)]
    samples = sorted(sum(values[i] for i in draw)/n for draw in DRAW_CACHE[n])
    return dict(n=n, mean=sum(values)/n, lo=samples[249], hi=samples[9750])


publish = '--publish' in sys.argv
DATA = dict(model='gpt-6.1-terra', efforts=EFFORTS, expected=596, provisional=True, sets={})
all_rows, notes = [], []
test_reviews = read(OUT / 'test-change-review.json') or {}
for name, (files, reps, reference, title) in SETS.items():
    tasks = {t['id']: t for f in files for t in read(ROOT / 'tasks' / f)['tasks']}
    own = load(OUT / name, tasks, ['terra61-effort'])
    for r in own:
        r['set'] = name
        if r['wall_seconds'] > 1800:
            notes.append(dict(set=name, run_id=r['run_id'], issue='nominal_wall_cap_overrun',
                nominal_wall_cap_seconds=1800, observed_cli_wall_seconds=r['wall_seconds'],
                observation='Recorded CLI elapsed time exceeded the nominal 30-minute timer. Cause is not established; retain original timing and score without retry.',
                score_changed=False))
        for reviewed in test_reviews.get(r['run_id'], []):
            observation = reviewed.get('review', '')
            if observation.startswith('REVIEW_ISSUE:'):
                notes.append(dict(set=name, run_id=r['run_id'], issue='visible_test_review_issue',
                    path=reviewed['path'], observation=observation.removeprefix('REVIEW_ISSUE:').strip(),
                    score_changed=False))
        log = OUT / name / 'runs' / r['run_id'] / 'vitest.txt'
        missing = sorted(set(re.findall(r'No "([^"]+)" export is defined on the "([^"]+)" mock', log.read_text() if log.exists() else '')))
        if missing:
            notes.append(dict(set=name, run_id=r['run_id'], issue='hidden_mock_missing_export',
                missing_exports=[dict(export=e, module=m) for e,m in missing], score_changed=False))
        patch = OUT / name / 'runs' / r['run_id'] / 'changes.patch'
        support = sorted(set(re.findall(r'(?m)^\+\+\+ [^\t]+/(tests/server/_support/doubles/[^\t]+)\t', patch.read_text() if patch.exists() else '')))
        if support:
            notes.append(dict(set=name, run_id=r['run_id'], issue='visible_test_support_changed', paths=support,
                observation='Solver changed visible test doubles that hidden tests may also import. Retain strict original score; inspect changes separately.', score_changed=False))
    all_rows.extend(own)
    arms = {e: summary([r for r in own if r['effort']==e]) for e in EFFORTS}
    expected_keys = {(t, r) for t in tasks for r in range(1, reps+1)}
    complete = all({(r['task_id'],r['rep']) for r in own if r['effort']==e} == expected_keys and
                   arms[e]['solver_completed'] == len(expected_keys) and arms[e]['graded'] == len(expected_keys) for e in EFFORTS)
    exp = read(OUT / name / 'experiment.json')
    if publish and not complete:
        raise SystemExit(f'incomplete/ungraded {name}; final publication deferred')
    if publish:
        for file, expected_hash in exp['input_hashes'].items():
            actual = hashlib.sha256((ROOT / file).read_bytes()).hexdigest()
            if actual != expected_hash:
                raise SystemExit(f'measured input changed: {file}')
    record = dict(title=title, tasks=len(tasks), reps=reps, expected=len(tasks)*reps*4,
                  complete=complete, experiment=exp, arms=arms, reference_results_dir=reference)
    if publish:
        ref_rows = load(ROOT / reference, tasks, list(FAMILIES))
        sol_dirs = {'code45':'results/sol61','ultra':'results/sol61-ultra','extreme':'results/sol61-extreme','apex':'results/sol61-apex','brownfield':'results/sol61-brownfield'}
        if name in sol_dirs: ref_rows += load(ROOT/sol_dirs[name],tasks,['sol61-effort'])
        ref_rows += load(ROOT/f'results/luna/{name}',tasks,['luna-effort'])
        by_arm = {}
        for r in own+ref_rows:
            arm = r['condition']; key = (r['task_id'], r['rep'])
            if key in by_arm.setdefault(arm, {}):
                raise SystemExit(f'duplicate reference cell {arm} {key}')
            by_arm[arm][key] = r
        valid = {a: rows for a, rows in by_arm.items() if set(rows)==expected_keys and all(r['success'] is not None for r in rows.values())}
        record['matched_arms'] = {a: summary(list(rows.values())) for a,rows in valid.items()}
        record['matched_arm_run_ids'] = {a: [rows[key]['run_id'] for key in sorted(rows)] for a,rows in valid.items()}
        record['unavailable_reference_arms'] = [prefix+'-'+e for prefix in FAMILIES for e in EFFORTS if prefix+'-'+e not in valid]
        pair_list = list(itertools.combinations(['terra61-effort-'+e for e in EFFORTS][::-1], 2))
        pair_list += [('terra61-effort-'+e, prefix+'-'+e) for e in EFFORTS for prefix in FAMILIES if prefix+'-'+e in valid]
        record['pairs'] = {a+'|'+b: {k: paired(valid[a],valid[b],tasks,reps,k) for k in ['success','cost_usd','wall_seconds']} for a,b in pair_list}
    DATA['sets'][name] = record
DATA['solver_completed'] = len(all_rows)
DATA['graded'] = sum(r['success'] is not None for r in all_rows)
DATA['correct'] = sum(bool(r['success']) for r in all_rows)
DATA['provisional'] = not all(s['complete'] for s in DATA['sets'].values())
DATA['quarantined_attempts'] = sum(len(list((OUT / name / 'quarantine').glob('*'))) for name in SETS)
DATA['known_cost_sum'] = sum(r['cost_usd'] for r in all_rows if r['cost_usd'] is not None)
DATA['unknown_cost_runs'] = sum(r['cost_usd'] is None for r in all_rows)
DATA['timed_out_runs'] = sum(r['timed_out'] for r in all_rows)
DATA['grading_notes'] = notes
DATA['bootstrap'] = dict(unit='task', repeats='average within task before resampling', resamples=10000, seed=7, interval='percentile 95%')
DATA['metric_definitions'] = dict(wall_seconds='Solver CLI only, excluding copying and grading.',
    success='Original graders: Vitest target spec exit 0; code45 set-F1 >= 0.9; blind Claude Haiku 4.5 explanation score >= 0.6. Wall timeouts remain failures.',
    cost_usd='Base Standard list-price estimate, not a subscription charge; long-context surcharge not identifiable from cumulative usage.',
    num_turns='Native exec user turn is not a model/API turn; recorded as null. Exact model requested with -m; backend resolved id not independently exposed.')
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'progress.json').write_text(json.dumps(DATA, indent=2, ensure_ascii=False)+'\n')

def fmt(v, kind='number'):
    if v is None: return 'N/A'
    return f'${v:.4f}' if kind=='money' else f'{v:.1f}'

HEADERS = ['セット', 'effort', '採点済み/予定', '正解', '時間中央値', '推定費用中央値']
ROWS = [[s['title'],e,f"{v['graded']}/{s['tasks']*s['reps']}",str(v['correct']),fmt(v['wall_median'])+' s',fmt(v['cost_median'],'money')+(f"（費用不明{v['unknown_cost_runs']}件）" if v['unknown_cost_runs'] else '')]
        for s in DATA['sets'].values() for e,v in s['arms'].items()]
def md_table(headers, rows):
    return '| '+' | '.join(headers)+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows)
def table(headers, rows):
    return '<div class="tbl"><table class="rep"><thead><tr>'+''.join('<th>'+html.escape(x)+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(x)+'</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table></div>'

def label(arm):
    prefix, effort = arm.rsplit('-', 1)
    return ('Terra' if prefix=='terra61-effort' else FAMILIES[prefix])+' · '+effort

text = f'# GPT-6.1 Terra: {DATA["solver_completed"]}/596 solver runs, {DATA["graded"]}/596 graded\n\n'+md_table(HEADERS,ROWS)+'\n\n'
text += f'Base-rate solver cost subtotal: ${DATA["known_cost_sum"]:.4f}; unknown cost runs: {DATA["unknown_cost_runs"]}. Quarantined infrastructure attempts: {DATA["quarantined_attempts"]}.\n'
text += '\n'+('Incomplete matrix; effort/task composition differs. Explanation judging is deferred until solver runs finish.' if DATA['provisional'] else 'Complete matrix; see REPORT.md and analysis.json for paired task comparisons.')+'\n'
(OUT / 'PROGRESS.md').write_text(text)
if not publish:
    print(f'{DATA["solver_completed"]}/596 solver runs; {DATA["graded"]}/596 graded; {DATA["correct"]} correct; base-rate subtotal ${DATA["known_cost_sum"]:.4f}')
    raise SystemExit(0)

verification=read(OUT/'native-verification.json') or {}
if verification.get('verified')!=596 or verification.get('provisional',True) or verification.get('grading_errors') or verification.get('existing_test_or_config_edits_needing_review'): raise SystemExit('native evidence or visible test review incomplete')
for name in SETS:
    audit=OUT/name/'audit.txt'
    if not audit.exists() or not re.search(r'audited '+str(DATA['sets'][name]['expected'])+r' runs,',audit.read_text()): raise SystemExit('scope audit count mismatch: '+name)
    if not re.search(r', 0 flagged,',audit.read_text()): raise SystemExit('scope audit requires review: '+name)
DATA['runs'] = all_rows
(OUT / 'analysis.json').write_text(json.dumps(DATA, indent=2, ensure_ascii=False)+'\n')
(OUT / 'grading-notes.json').write_text(json.dumps(notes,indent=2)+'\n')
with (OUT / 'runs.csv').open('w', newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(all_rows[0])); writer.writeheader(); writer.writerows(all_rows)
dates=sorted({datetime.fromisoformat(r['started_at'].replace('Z','+00:00')).astimezone(ZoneInfo('Asia/Tokyo')).date().isoformat() for r in all_rows})
limits = [
    '通常45問は1反復、難問16問・超難問12問・極難問12問・apex6問・brownfield6問は各2反復。gpt-6.1-terraをlow/medium/high/xhighで計596実行。問題・バグパッチ・hidden test・採点基準は変更していない。',
    'コードのみのcorpus-v1を各回複製し、同じbaseline契約をAGENTS.mdとCLAUDE.mdに設置。個人設定・Web検索・subagentは無効。順序はセット内でeffortと反復を混ぜて固定。並列度3。測定開始時に他のベンチマークジョブは動いていなかった。実行日やホスト負荷の違いは分離できない。',
    'CLI時間上限は名目30分。保存された経過時間が30分を超えた実行はgrading-notes.jsonに実測値とともに記録し、元の合否・時間を保持する。タイマー超過の原因は未確定。Claudeの60/120/160モデルターンと$4/$8/$12上限はnative execで同じ方法では強制できない。CLI・ツール・委譲・測定日も異なり、モデル単体の効果は分離できない。',
    'Vitest問題はモデル終了後にhidden testを設置し、対象specのexit 0を合格とする。通常45問の集合問題は既存set-F1が0.9以上、説明問題は従来のblind Claude Haiku 4.5 judgeが0.6以上で合格。説明問題はTerraの解答実行後に直列採点した。',
    '費用は基本Standard単価（入力$1/M・cache read $0.05/M・30分cache write $1.25/M・出力$5/M）換算で実請求額ではない。272K超の単一リクエストの割増は累積JSONLから識別できず含めない。reasoningは出力内で1回だけ計上。採点とインフラ中断試行は費用集計から除外。',
    'CLI時間はコピー・採点を除外。APIターン数は取得できずnull。時間切れは失敗として保持し、精度を理由に再実行しない。使用量不明の費用は小計と不明件数を表示。',
    '各実行のCLI・Nodeバージョンと測定日はexperiment.json/run.meta.jsonに保存。nativeの-m引数でgpt-6.1-terraを指定したが、JSONLはバックエンドのresolved model IDを独立したフィールドで返さない。',
    'cache write費用は30分保持の基本単価を仮定。実際の保持時間やサービス階層はnative累積使用量だけでは識別できない。',
    '対応比較は全問題を使い、2反復を問題ごとに平均してから問題単位でbootstrap（10,000回、seed 7、95% percentile CI）。0に触れる／またぐCIから差を確定しない。未完了の他モデルarmは対応比較に含めない。',
    '各95%区間は比較単独の区間で、多重比較補正はしていない。同じ1つのコードベースでの観測であり、他の仕事やコードベースへの一般化は測定していない。',
    'mock不足等の採点例外と可視テスト変更の問題はgrading-notes.jsonに記録し、元の合否を保持。合否は指定されたhidden specによるもので、可視テスト全体の成功は主張しない。テスト例外だけでは本番の正否は確定できない。',
    '参考モデルの過去の入力ハッシュは一部保存されていないため、同じ問題ID・反復による対応比較は入力バイト完全一致の証明ではない。Terraの入力は開始前に145ファイルと497コーパスファイルのハッシュを保存した。',
    'このチャットではブラウザーのfile://アクセスがポリシーで拒否されているため、描画表示は未確認。別プロトコル等による迂回は行わず、HTML構造・データ・リンクを検証する。',
]
timeout_by_set = '、'.join(name+str(sum(v['timed_out'] for v in s['arms'].values()))+'件' for name,s in DATA['sets'].items() if any(v['timed_out'] for v in s['arms'].values()))
limits.append(f'時間切れは合計{DATA["timed_out_runs"]}件（{timeout_by_set}）。これらを除外した正答率や、推定費用不明分を0扱いした総額は示さない。ホスト停止や通信との切り分けは確定しておらず、特にultra/apexの合否・時間をモデル能力だけに帰属できない。')
review_issues = [n for n in notes if n['issue']=='visible_test_review_issue']
if review_issues:
    limits.append('可視テストレビューで要注意の変更: '+ '、'.join(n['run_id'] for n in review_issues)+'。既存digestの件数上限を外し、テスト期待値も上限+5件に変更。タスクの全ウィンドウ取得という文言との解釈の余地があるが、上限撤廃は明示されていない。元のhidden合格を維持し、問題点をgrading-notes.jsonに開示した。')
unknown_note=f' 使用量不明の{DATA["unknown_cost_runs"]}実行を費用小計から除外。' if DATA['unknown_cost_runs'] else ''
section='<!-- TERRA61-START -->\n<section id="terra61"><h2 class="col">GPT-6.1 Terra: 全6セット</h2><p class="col">測定日（JST）: '+html.escape('〜'.join([dates[0],dates[-1]]) if len(dates)>1 else dates[0])+f'。596実行の採点完了。基本単価換算の小計 ${DATA["known_cost_sum"]:.4f}。{unknown_note}</p>'+table(HEADERS,ROWS)
section=section.replace('<section id="terra61">', '<section id="terra61"><style>#terra61 table.rep{min-width:720px}#terra61 table.rep th,#terra61 table.rep td{white-space:nowrap}.terra61-scroll-hint{display:none}@media(max-width:760px){.terra61-scroll-hint{display:block;font-size:12px;color:var(--ink-2)}}</style>')
section=section.replace('<div class="tbl">', '<p class="terra61-scroll-hint col">表は横にスクロールして全項目を確認できます。</p><div class="tbl">', 1)
for name,s in DATA['sets'].items():
    ref_headers=['条件','正解','時間中央値','推定費用中央値']
    arm_order=lambda item: (['terra61-effort',*FAMILIES].index(item[0].rsplit('-',1)[0]), EFFORTS.index(item[0].rsplit('-',1)[1]))
    ref_rows=[[label(a),f"{v['correct']}/{v['graded']}",fmt(v['wall_median'])+' s',fmt(v['cost_median'],'money')] for a,v in sorted(s['matched_arms'].items(),key=arm_order)]
    pair_headers=['先 − 後','正答率差 [95% CI]','費用差 [95% CI]','時間差 [95% CI]']
    pair_rows=[]
    for pair,metrics in s['pairs'].items():
        row=[' − '.join(label(a) for a in pair.split('|'))]
        for key in ['success','cost_usd','wall_seconds']:
            v=metrics[key]; scale=100 if key=='success' else 1
            digits=4 if key=='cost_usd' else 1
            row.append('N/A' if v['mean'] is None else f"{v['mean']*scale:+.{digits}f} [{v['lo']*scale:+.{digits}f}, {v['hi']*scale:+.{digits}f}]"+(' pt' if key=='success' else ' USD' if key=='cost_usd' else ' s'))
        pair_rows.append(row)
    text+='\n## '+s['title']+'\n\n'+md_table(ref_headers,ref_rows)+'\n\n'+md_table(pair_headers,pair_rows)+'\n'
    section+='<h3 id="terra61-'+name+'">'+s['title']+'の同じ問題・反復での比較</h3>'+table(ref_headers,ref_rows)+'<p class="col">同じeffortの対応比較。正答率差はプラス、費用・時間差はマイナスが先の条件に有利。</p>'+table(pair_headers,pair_rows)
text+='\n'+ '\n'.join('- '+x for x in limits)+'\n\nPricing: https://developers.openai.com/api/docs/models/gpt-6.1-terra\nResume command: bash scripts/run-terra61.sh (preserves completed cells; frozen input-manifest.json and matching snapshot required).\n'
(OUT / 'REPORT.md').write_text(text)
section+='<h3>測定条件と限界</h3><ul class="col">'+''.join('<li>'+html.escape(x)+'</li>' for x in limits)+'</ul><p class="col"><a href="https://developers.openai.com/api/docs/models/gpt-6.1-terra">公式モデル単価</a> · <a href="../results/terra61/analysis.json">JSON</a> · <a href="../results/terra61/runs.csv">CSV</a> · <a href="../results/terra61/REPORT.md">REPORT.md</a> · <a href="../results/terra61/grading-notes.json">採点・監査注記</a> · <a href="../results/terra61/test-change-review.json">可視テスト差分レビュー</a></p></section>\n<!-- TERRA61-END -->'
head=(ROOT/'scripts/report-opus/head.html').read_text().replace('<title>Opus 5.5 対 Sonnet 5</title>','<title>GPT-6.1 Terra ベンチマーク</title>')
(ROOT/'docs/report-terra61-ja.html').write_text(head+'<body><div class="wrap"><h1>GPT-6.1 Terra の全ベンチマーク</h1>'+section+'</div></body></html>\n')
# Read the latest version immediately before each delimited insertion. Do not
# rebuild the concurrent Haiku report from an earlier snapshot.
page_path=ROOT/'docs/report-opus-ja.html'; original_page=page_path.read_text(); page=original_page
page=re.sub(r'<!-- TERRA61-START -->.*?<!-- TERRA61-END -->\n{0,2}','',page,flags=re.S)
anchor='  <p class="tag col">測定された事実</p>'
if page.count(anchor)!=1: raise SystemExit('shared HTML anchor changed; standalone Terra report preserved')
if page_path.read_text()!=original_page: raise SystemExit('shared HTML was concurrently edited; standalone Terra report preserved, retry only the report')
page_path.write_text(re.sub(r'<!-- TERRA61-START -->.*?<!-- TERRA61-END -->\n{0,2}',lambda m:section+'\n\n',original_page,flags=re.S) if '<!-- TERRA61-START -->' in original_page else page.replace(anchor,section+'\n\n'+anchor))
readme=ROOT/'README.md'; original_readme=readme.read_text(); content=original_readme
content=re.sub(r'<!-- TERRA61-README-START -->.*?<!-- TERRA61-README-END -->\n{0,2}','',content,flags=re.S)
block='<!-- TERRA61-README-START -->\n**GPT-6.1 Terra, all six sets:** 596 solver and graded runs at low/medium/high/xhigh. Independent Codex runtime; Claude turn/budget caps cannot be enforced identically. Runtime, host load and date differences apply. Base Standard solver cost subtotal $'+f'{DATA["known_cost_sum"]:.4f}'+', not an invoice. [Data and paired task CIs](results/terra61/REPORT.md), [JSON](results/terra61/analysis.json), [CSV](results/terra61/runs.csv), [Japanese HTML](docs/report-terra61-ja.html).\n\n'+md_table(HEADERS,ROWS)+'\n<!-- TERRA61-README-END -->\n\n'
anchor='Paired mean differences over tasks with 95% bootstrap CIs.'
if content.count(anchor)!=1: raise SystemExit('README anchor changed; standalone Terra data preserved')
if readme.read_text()!=original_readme: raise SystemExit('README was concurrently edited; standalone Terra data preserved, retry only the report')
readme.write_text(re.sub(r'<!-- TERRA61-README-START -->.*?<!-- TERRA61-README-END -->\n{0,2}',lambda m:block,original_readme,flags=re.S) if '<!-- TERRA61-README-START -->' in original_readme else content.replace(anchor,block+anchor))
print('Published Terra data and delimited HTML/README addition; other model data untouched.')
