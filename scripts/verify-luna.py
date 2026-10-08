#!/usr/bin/env python3
"""Verify native Luna matrix evidence and inventory test/config modifications."""
import collections
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'results/luna'
partial = '--partial' in sys.argv
sets = {'code45': (['tasks.json','tasks-ext.json'],1), 'hard': (['tasks-hard.json'],2),
        'ultra': (['tasks-ultra.json'],2), 'extreme': (['tasks-extreme.json'],2)}
counts, reviews, issues = {}, {}, []
prev_path = OUT / 'test-change-review.json'
previous = json.loads(prev_path.read_text()) if prev_path.exists() else {}
for name,(files,reps) in sets.items():
    tasks={t['id']:t for file in files for t in json.loads((ROOT/'tasks'/file).read_text())['tasks']}
    exp_path=OUT/name/'experiment.json'
    if not exp_path.exists():
        assert partial, f'{name} not started'
        counts[name]=dict(verified=0,expected=len(tasks)*reps*4,graded=0)
        continue
    exp=json.loads(exp_path.read_text())
    for file,sha in exp['input_hashes'].items():
        assert hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==sha, f'{name}: input changed {file}'
    corpus=pathlib.Path(exp['corpus'])
    files=sorted(p for top in ['src','tests'] for p in (corpus/top).rglob('*') if p.is_file())
    digest=''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(corpus)}\n' for p in files)
    assert hashlib.sha256(digest.encode()).hexdigest()==exp['corpus_tree_hash'], name
    seen=set(); graded=0
    for folder in sorted((OUT/name/'runs').glob('*')):
        if not (folder/'grade.json').exists(): continue
        meta,result,metrics,grade=[json.loads((folder/f).read_text()) for f in ['run.meta.json','result.json','metrics.json','grade.json']]
        key=(meta['task_id'],meta['env']['effort'],meta['rep'])
        assert key not in seen, folder
        seen.add(key); graded+=grade['success'] is not None
        assert meta['env']['model']=='gpt-6-luna',folder
        args=meta['codex']['argv']
        assert args[args.index('-m')+1]=='gpt-6-luna',folder
        for arg in ['--ignore-user-config','web_search="disabled"','features.multi_agent=false',f'model_reasoning_effort="{key[1]}"']:
            assert arg in args,(folder,arg)
        assert metrics['num_turns'] is None and metrics['subagents_spawned']==0,folder
        if result['terminal_reason']=='wall_timeout':
            assert meta['codex']['timed_out'] and grade['success'] is False,folder
        else:
            assert meta['codex']['exit_code']==0 and not meta['codex']['timed_out'] and not result['is_error'],folder
            events=[json.loads(s) for s in (folder/'events.jsonl').read_text().splitlines() if s.strip()]
            terminal=[e for e in events if e['type'] in ['turn.completed','turn.failed']][-1]
            assert terminal['type']=='turn.completed',folder
            u=terminal['usage']; assert u==metrics['native_usage']==result['native_usage'],folder
            cached,write,output=u['cached_input_tokens'],u.get('cache_write_input_tokens',0),u['output_tokens']
            uncached=u['input_tokens']-cached-write
            cost=(uncached*.1+cached*.01+write*.125+output*.5)/1e6
            assert uncached>=0 and abs(cost-metrics['total_cost_usd'])<1e-10,folder
            assert abs(cost-result['total_cost_usd'])<1e-10,folder
            assert metrics['uncached_equivalent_all']==u['input_tokens'] and metrics['output_tokens_all']==output,folder
            if tasks[key[0]]['grader']=='vitest':
                assert grade['success']==meta['vitest']['passed']==(meta['vitest']['exitCode']==0),folder
                assert meta['hidden']==[f['to'] for f in tasks[key[0]].get('hidden',[]) ] or not tasks[key[0]].get('hidden'),folder
        if grade.get('error'): issues.append(dict(run_id=folder.name,grading_error=grade['error']))
        if not partial: assert grade['success'] is not None and not grade.get('error'),folder
        changes=[]; patch=folder/'changes.patch'
        for block in re.split(r'(?m)^diff ',patch.read_text() if patch.exists() else '')[1:]:
            m=re.search(r'(?m)^\+\+\+ (.+?)\t',block)
            if not m: continue
            path=m[1].removeprefix(meta['work_dir']+'/')
            if not (path.startswith('tests/') or path in ['package.json','vitest.config.ts','tsconfig.json','AGENTS.md','CLAUDE.md']): continue
            body=block.split('@@',1)[1] if '@@' in block else ''
            row=dict(path=path,added_only=not any(line.startswith('-') for line in body.splitlines()),
                new_file=bool(re.search(r'(?m)^--- .*\t1970-',block)))
            for old in previous.get(folder.name,[]):
                if old['path']==path and old.get('review'): row['review']=old['review']
            changes.append(row)
        reviews[folder.name]=changes
    expected={(t,e,r) for t in tasks for e in ['low','medium','high','xhigh'] for r in range(1,reps+1)}
    assert seen<=expected,name
    if not partial: assert seen==expected,name
    counts[name]=dict(verified=len(seen),expected=len(expected),graded=graded)
prev_path.write_text(json.dumps(reviews,indent=2)+'\n')
flags=[dict(run_id=run,**row) for run,rows in reviews.items() for row in rows
       if not row['new_file'] and not row['added_only'] and not row.get('review')]
data=dict(sets=counts,verified=sum(v['verified'] for v in counts.values()),expected=500,
          provisional=partial,grading_errors=issues,existing_test_or_config_edits_needing_review=flags)
(OUT/'native-verification.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(data,indent=2))
