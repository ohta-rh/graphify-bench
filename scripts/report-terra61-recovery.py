#!/usr/bin/env python3
"""Keep selected timeout recovery separate from the original full experiment."""
import json,html,csv,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/terra61-recovery'
targets=json.loads((OUT/'targets.json').read_text())['targets']
rows=[]
for t in targets:
    folder=OUT/t['set']/'runs'/t['run_id']
    if not (folder/'grade.json').exists():continue
    grade=json.loads((folder/'grade.json').read_text());meta=json.loads((folder/'run.meta.json').read_text());metrics=json.loads((folder/'metrics.json').read_text())
    rows.append(dict(**t,success=grade['success'],wall_seconds=meta['codex']['wall_ms']/1000,cost_usd=metrics['total_cost_usd']))
data=dict(expected=40,graded=len(rows),correct=sum(bool(r['success']) for r in rows),provisional=len(rows)!=40,
          protocol='No solver wall deadline; caffeinate -i -s; native stdout/stderr streamed; same frozen task/effort/rep/model/grader.',
          caveat='Selected40 prior timeouts only. Original596 retained in original-publication archive; user authorized promotion of recovered40 to main results. Different deadline and selected sample; not a uniform-deadline model ranking.',runs=rows)
reviews=json.loads((OUT/'test-change-review.json').read_text()) if (OUT/'test-change-review.json').exists() else {}
data['review_issues']=[dict(run_id=run,path=r['path'],observation=r['review'],score_changed=False) for run,rs in reviews.items() for r in rs if r.get('review','').startswith('REVIEW_ISSUE:')]
data['rendered_visual_check']='UNVERIFIED: prior file:// browser access denied; no bypass attempted.'
(OUT/'progress.json').write_text(json.dumps(data,indent=2)+'\n')
table=['| セット | 元の時間切れ | 再採点済み | 合格 |','|---|---:|---:|---:|']
for name in ['hard','ultra','apex']:
    rs=[r for r in rows if r['set']==name]
    table.append(f'| {name} | {sum(t["set"]==name for t in targets)} | {len(rs)} | {sum(bool(r["success"]) for r in rs)} |')
text=f'# Terra 時間切れ40件の再測定\n\n{len(rows)}/40件採点済み、{data["correct"]}件合格。\n\n'+'\n'.join(table)+'\n\n30分でのsolver強制終了を外し、実行中のidle/system sleepをcaffeinateで抑止。ログを逐次保存する。手動スリープや蓋を閉じる操作を防げる保証はない。通信・利用上限による不完全試行のみ隔離して再開し、採点済みの精度失敗は再試行しない。\n\n元の596件・462件合格の成果物はoriginal-publicationに退避保存。ユーザー許可により再測定40件を主結果へ反映する。時間切れだけを選び時間上限も変更した追加実験なので、更新した596件は時間条件が混在する。均一条件のモデル順位とは解釈しない。\n'
(OUT/'PROGRESS.md').write_text(text)
if data['review_issues']:
    text+='\n可視テスト差分の要注意事項（元のhidden採点を保持）:\n'+''.join('- '+r['run_id']+' / '+r['path']+': '+r['observation']+'\n' for r in data['review_issues'])
text+='\nHTML構造・データ・リンクを検証する。ブラウザー描画は既存file://アクセス制限により未確認。迂回しない。\n'
if len(rows)==40:
    v=json.loads((OUT/'native-verification.json').read_text())
    assert v['verified']==40 and not v['provisional'] and not v['grading_errors'] and not v['existing_test_or_config_edits_needing_review']
    (OUT/'analysis.json').write_text(json.dumps(data,indent=2)+'\n')
    (OUT/'REPORT.md').write_text(text)
    with (OUT/'runs.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    body='<h1>Terra 時間切れ40件の再測定</h1><p>'+html.escape(f'40件採点済み、{data["correct"]}件合格。')+'</p><pre>'+html.escape(text)+'</pre><p><a href="../results/terra61-recovery/analysis.json">JSON</a> · <a href="../results/terra61-recovery/REPORT.md">REPORT</a> · <a href="report-terra61-ja.html">主結果596件</a> · <a href="../results/terra61-recovery/original-publication/docs/report-terra61-ja.html">変更前の596件</a></p>'
    (ROOT/'docs/report-terra61-recovery-ja.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><title>Terra timeout recovery</title><style>body{max-width:1000px;margin:40px auto;padding:20px;font:16px/1.7 system-ui}pre{white-space:pre-wrap}</style><body>'+body+'</body></html>\n')
print(f'{len(rows)}/40 graded; {data["correct"]} correct; original596 preserved in verified archive')
