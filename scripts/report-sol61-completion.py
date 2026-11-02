#!/usr/bin/env python3
"""Combine retained399 with new197 without modifying historical raw results."""
import csv,hashlib,html,itertools,json,random,re,statistics as st,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/sol61-completion'
PUBLISH='--publish' in sys.argv
EFFORTS=['low','medium','high','xhigh']
SETS={'code45':(['tasks.json','tasks-ext.json'],1,'results/opus'),
      'hard':(['tasks-hard.json'],2,'results/hard'),'ultra':(['tasks-ultra.json'],2,'results/ultra'),
      'extreme':(['tasks-extreme.json'],2,'results/models/extreme'),
      'apex':(['tasks-apex.json'],2,'results/models/apex'),'brownfield':(['tasks-brownfield.json'],2,'results/models/brownfield')}
FAMILIES={'sol61-effort':'GPT-6.1 Sol','terra61-effort':'GPT-6.1 Terra','opus-effort':'Opus 5.5',
          'effort':'Sonnet 5','sonnet55-effort':'Sonnet 5.5','haiku55-effort':'Haiku 5.5',
          'grok-effort':'Grok 4.7','luna-effort':'GPT-6 Luna'}
selection=json.loads((OUT/'targets.json').read_text())
def read(p):return json.loads(p.read_text()) if p.exists() else None
def row(folder,name,phase):
    m,r,k,g=[read(folder/f) for f in ['run.meta.json','result.json','metrics.json','grade.json']]
    if not m or not r or not k:return None
    if r.get('is_error') and r.get('terminal_reason')!='wall_timeout':return None
    return dict(set=name,run_id=folder.name,task_id=m['task_id'],effort=m['condition'].rsplit('-',1)[-1],
                condition=m['condition'],rep=m['rep'],success=(g or {}).get('success'),score=(g or {}).get('score'),
                grading_error=(g or {}).get('error'),wall_seconds=(m.get('codex') or m.get('claude'))['wall_ms']/1000,
                cost_usd=k['total_cost_usd'],timed_out=r.get('terminal_reason')=='wall_timeout',
                started_at=m['started_at'],versions=m.get('versions'),phase=phase,source=str(folder.relative_to(ROOT)))
rows=[]
for t in selection['retained']:
    v=row(ROOT/t['source'],t['set'],'retained399');assert v and v['success'] is not None;rows.append(v)
for t in selection['targets']:
    v=row(OUT/t['set']/'runs'/t['run_id'],t['set'],'new197')
    if v:rows.append(v)
assert len({(v['set'],v['task_id'],v['effort'],v['rep']) for v in rows})==len(rows)
new=[v for v in rows if v['phase']=='new197']
def summary(rs):
    graded=[r for r in rs if r['success'] is not None];known=[r['cost_usd'] for r in rs if r['cost_usd'] is not None]
    return dict(completed=len(rs),graded=len(graded),correct=sum(bool(r['success']) for r in graded),
                accuracy=sum(bool(r['success']) for r in graded)/len(graded) if graded else None,
                wall_median=st.median(r['wall_seconds'] for r in rs) if rs else None,
                known_cost_sum=sum(known),unknown_cost_runs=len(rs)-len(known))
data=dict(expected=596,new_expected=197,retained=399,**summary(rows),new=summary(new),
          provisional=len(rows)!=596 or any(r['success'] is None for r in rows),sets={},runs=rows,
          protocol='Historical399 untouched; new197 missing cells only, no solver wall deadline, caffeinate, live output. Exact gpt-6.1-sol.',
          caveats=['Mixed historical/new dates, CLI versions and wall caps; effort differences cannot separate these confounds.',
                   'Historical9 brownfield timeouts remain failures. No completed failure is rerun.',
                   'New cost estimates use historical Sol Standard rates pinned 2026-10-14, not a claim about current prices or invoices.',
                   'Native argv identifies requested model, but native JSONL does not independently provide resolved backend model ID.',
                   'Rendered visual QA unverified due prior file:// policy denial; no alternate-protocol bypass.'])
for name,(files,reps,reference) in SETS.items():
    rs=[r for r in rows if r['set']==name]
    data['sets'][name]=dict(expected=sum(len(read(ROOT/'tasks'/f)['tasks']) for f in files)*reps*4,
                           **summary(rs),arms={e:summary([r for r in rs if r['effort']==e]) for e in EFFORTS})
reviews=read(OUT/'test-change-review.json') or {};notes=[]
for name,source in selection['source_dirs'].items():
    for k,v in (read(ROOT/source/'test-change-review.json') or {}).items():reviews.setdefault(k,v)
for r in rows:
    if r['timed_out']:notes.append(dict(run_id=r['run_id'],issue='historical_timeout_retained',score_changed=False))
    live=read(ROOT/r['source']/'live-status.json') or {}
    if live.get('host_scheduling_gaps'):
        notes.append(dict(run_id=r['run_id'],issue='host_scheduling_gap',gaps=live['host_scheduling_gaps'],
                          observation='Wall time includes an observed process scheduling gap; cause is not established. No elapsed-time kill or score adjustment.',score_changed=False))
    for edit in reviews.get(r['run_id'],[]):
        if edit.get('review','').startswith('REVIEW_ISSUE:'):notes.append(dict(run_id=r['run_id'],issue='visible_test_review_issue',edit=edit,score_changed=False))
    log=ROOT/r['source']/'vitest.txt'
    missing=sorted(set(re.findall(r'No "([^"]+)" export is defined on the "([^"]+)" mock',log.read_text() if log.exists() else '')))
    if missing:notes.append(dict(run_id=r['run_id'],issue='hidden_mock_missing_export',missing=missing,score_changed=False))
data['grading_notes']=notes
(OUT/'progress.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
headers=['セット','effort','採点済み/予定','合格','時間中央値(s)','既知費用小計(USD)']
table_rows=[[name,e,f"{s['graded']}/{v['expected']//4}",s['correct'],f"{s['wall_median']:.1f}" if s['wall_median'] is not None else 'N/A',f"{s['known_cost_sum']:.4f}"] for name,v in data['sets'].items() for e,s in v['arms'].items()]
def md(headers,rs):return '| '+' | '.join(headers)+' |\n| '+' | '.join('---' for _ in headers)+' |\n'+''.join('| '+' | '.join(map(str,r))+' |\n' for r in rs)
def table(headers,rs):return '<div class="tbl"><table><thead><tr>'+''.join('<th>'+html.escape(str(x))+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in r)+'</tr>' for r in rs)+'</tbody></table></div>'
notice='既存399件を保持し、未実施197件（hard128、code45 xhigh45、extreme xhigh24）だけを追加。旧測定は名目30分、新規測定はsolver総時間の強制終了なし・caffeinateによるスリープ抑止。測定日とCLIバージョンも異なる混合条件であり、effortやモデル単独の効果は分離できない。過去のbrownfield時間切れ9件は失敗のまま保持。'
text=f"# GPT-6.1 Sol 全6セット\n\n{data['graded']}/596件採点、{data['correct']}件合格。新規197件中{data['new']['graded']}件採点。\n\n{notice}\n\n"+md(headers,table_rows)
(OUT/'PROGRESS.md').write_text(text)
if not PUBLISH:
    print(f"Sol {data['graded']}/596 graded; new {data['new']['graded']}/197 graded; {data['correct']} correct")
    raise SystemExit(0)
v=read(OUT/'native-verification.json') or {}
assert not data['provisional'] and v.get('verified')==197 and not v.get('provisional',True) and not v.get('grading_errors') and not v.get('existing_test_or_config_edits_needing_review')
for name,count in [('hard',128),('extreme',24),('code45',45)]:
    audit=(OUT/name/'audit.txt').read_text();assert f'audited {count} runs, 0 flagged,' in audit
draws={}
def paired(a,b,tasks,reps,key):
    values=[]
    for task in sorted(tasks):
        av=[a[task,r][key] for r in range(1,reps+1)];bv=[b[task,r][key] for r in range(1,reps+1)]
        if any(x is None for x in av+bv):return dict(n=len(tasks),mean=None,lo=None,hi=None)
        values.append(st.mean(av)-st.mean(bv))
    n=len(values)
    if n not in draws:
        rng=random.Random(7);draws[n]=[[rng.randrange(n) for _ in range(n)] for _ in range(10000)]
    samples=sorted(sum(values[i] for i in d)/n for d in draws[n])
    return dict(n=n,mean=st.mean(values),lo=samples[249],hi=samples[9749])
label=lambda arm:FAMILIES[arm.rsplit('-',1)[0]]+' '+arm.rsplit('-',1)[1]
section='<!-- SOL61-COMPLETION-START -->\n<section id="sol61-completion"><h2>GPT-6.1 Sol 全6セット・未実施分補完</h2><p>'+html.escape(notice)+f"</p><p>{data['graded']}/596件採点、{data['correct']}件合格。</p>"+table(headers,table_rows)
for name,(files,reps,reference) in SETS.items():
    tasks={t['id'] for f in files for t in read(ROOT/'tasks'/f)['tasks']};expected={(t,r) for t in tasks for r in range(1,reps+1)}
    ref=[]
    for directory in [ROOT/reference,ROOT/'results/terra61'/name,ROOT/'results/luna'/name]:
        for p in sorted((directory/'runs').glob('*')):
            if not (p/'grade.json').exists():continue
            m=read(p/'run.meta.json')
            if m['task_id'] in tasks and m['condition'].rsplit('-',1)[0] in FAMILIES and not m['condition'].startswith('sol61-'):
                rr=row(p,name,'reference')
                if rr:ref.append(rr)
    by={}
    for r in [v for v in rows if v['set']==name]+ref:
        arm=r['condition'];key=(r['task_id'],r['rep']);assert key not in by.setdefault(arm,{})
        by[arm][key]=r
    valid={a:rs for a,rs in by.items() if set(rs)==expected and all(r['success'] is not None for r in rs.values())}
    own=['sol61-effort-'+e for e in EFFORTS];assert all(a in valid for a in own)
    pairs=list(itertools.combinations(own[::-1],2))+[(a,p+'-'+a.rsplit('-',1)[1]) for a in own for p in FAMILIES if p!='sol61-effort' and p+'-'+a.rsplit('-',1)[1] in valid]
    result={a+'|'+b:{k:paired(valid[a],valid[b],tasks,reps,k) for k in ['success','wall_seconds','cost_usd']} for a,b in pairs}
    data['sets'][name].update(pairs=result,matched_arms={a:summary(list(rs.values())) for a,rs in valid.items()},tasks=len(tasks),reps=reps)
    ph=['先 − 後','正答率差(pt) [95% CI]','時間差(s) [95% CI]','費用差(USD) [95% CI]'];pr=[]
    for pair,metrics in result.items():
        line=[' − '.join(label(a) for a in pair.split('|'))]
        for k in ['success','wall_seconds','cost_usd']:
            x=metrics[k];scale=100 if k=='success' else 1;digits=4 if k=='cost_usd' else 1
            line.append('N/A' if x['mean'] is None else f"{x['mean']*scale:+.{digits}f} [{x['lo']*scale:+.{digits}f}, {x['hi']*scale:+.{digits}f}]")
        pr.append(line)
    text+='\n## '+name+'\n\n'+md(ph,pr)
    section+='<h3>'+name+' 対応問題比較</h3>'+table(ph,pr)
limits=[notice,'同一のbaseline契約・元の問題・hidden test・採点基準。code45説明は既存blind Claude Haiku4.5 judge、集合問題set-F1>=0.9、Vitest問題は指定spec exit0。新規説明解答のみ直列採点。',
        '新規コードスナップショットのsrc/tests477ファイルは旧Solの記録済みツリーハッシュと一致。旧config全体の事前凍結記録がない測定について、完全同一入力とは主張しない。',
        '同じ問題・反復だけの対応比較。2反復を問題ごとに平均し、全問題単位bootstrap10000回、seed7、95%percentile CI。欠損費用のある比較はN/A。多重比較補正なし。',
        'Claude側のターン/予算上限はnative Codexで同等に強制できない。個人設定・Web・multi-agent無効、並列3。新規CLI/Nodeは各run.meta.jsonに保存。nativeはresolved backend model IDを独立して返さない。',
        'caffeinateは手動スリープやホスト停止を完全に防げる保証はない。観測されたheartbeatのスケジューリング間隔超過はgrading-notes.jsonに記録し、CLI経過時間に含める。原因を確定せず、経過時間だけでkillや採点変更をしない。',
        '費用は2026-10-14に固定したSol基本Standard単価（入力$2/M、cache read$0.1/M、30分write$2.5/M、出力$10/M）による歴史的参考推定。現在の価格や請求額ではない。単一リクエストのlong-context割増やcache保持階層を累積JSONLから識別できず、採点・未完了インフラ試行・不明費用を除く。',
        '可視テスト/fixture/設定差分を手動レビューし問題点をgrading-notes.jsonに記録。採点済み不合格を再実行しない。',
        'このチャットのfile://アクセス拒否によりブラウザー描画は未確認。別プロトコル等で迂回しない。HTML構造・データ・リンク・非Sol部分保持と再生成の冪等性を別途検証する。']
data['bootstrap']=dict(unit='task',repeats='mean within task',resamples=10000,seed=7)
data['limits']=limits;data['rendered_visual_check']='UNVERIFIED: existing file:// policy denial; no bypass.'
for f,obj in [('analysis.json',data),('grading-notes.json',notes)]: (OUT/f).write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n')
with (OUT/'runs.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
text+='\n## 測定条件と限界\n\n'+'\n'.join('- '+s for s in limits)+'\n'
(OUT/'REPORT.md').write_text(text)
section+='<h3>測定条件と限界</h3><ul>'+''.join('<li>'+html.escape(x)+'</li>' for x in limits)+'</ul><p><a href="../results/sol61-completion/analysis.json">JSON</a> · <a href="../results/sol61-completion/runs.csv">CSV</a> · <a href="../results/sol61-completion/REPORT.md">REPORT</a> · <a href="../results/sol61-completion/grading-notes.json">採点注記</a></p></section>\n<!-- SOL61-COMPLETION-END -->'
style='body{font:16px/1.6 system-ui;max-width:1200px;margin:2rem auto;padding:1rem}table{border-collapse:collapse;white-space:nowrap}th,td{border:1px solid #888;padding:.4rem;text-align:left}.tbl{overflow-x:auto}a{color:#1670ce}@media(prefers-color-scheme:dark){body{background:#171b24;color:#e2e5ec}a{color:#83b6ff}}'
(ROOT/'docs/report-sol61-completion-ja.html').write_text('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GPT-6.1 Sol 全6セット</title><style>'+style+'</style></head><body>'+section+'</body></html>\n')
block='<!-- SOL61-COMPLETION-README-START -->\n**GPT-6.1 Sol full six-set completion:** '+f"{data['correct']}/596 correct; historical399 retained and missing197 added. Mixed dates/CLI/deadline conditions; old9timeouts retained. [Japanese HTML](docs/report-sol61-completion-ja.html), [data and task-bootstrap comparisons](results/sol61-completion/REPORT.md).\n\n"+md(headers,table_rows)+'\n<!-- SOL61-COMPLETION-README-END -->\n\n'
baseline=OUT/'publication-baseline';baseline.mkdir(exist_ok=True)
for f,tag,content,anchor in [('README.md','SOL61-COMPLETION-README',block,'Paired mean differences over tasks with 95% bootstrap CIs.'),('docs/report-opus-ja.html','SOL61-COMPLETION',section+'\n\n','  <p class="tag col">測定された事実</p>')]:
    p=ROOT/f;before=p.read_text();saved=baseline/f
    if not saved.exists():saved.parent.mkdir(parents=True,exist_ok=True);saved.write_text(before)
    pattern=r'<!-- '+tag+r'-START -->.*?<!-- '+tag+r'-END -->\n{0,2}'
    if '<!-- '+tag+'-START -->' in before:after=re.sub(pattern,lambda m:content,before,flags=re.S)
    else:assert before.count(anchor)==1;after=before.replace(anchor,content+anchor)
    assert p.read_text()==before,'concurrent publication edit';p.write_text(after)
print('Published Sol completion596; historical raw results and other shared sections preserved.')
