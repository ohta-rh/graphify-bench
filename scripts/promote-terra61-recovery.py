#!/usr/bin/env python3
"""Promote only the40 authorized timeout reruns; keep verified original archive."""
import hashlib,json,os,re,shutil,subprocess
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/terra61-recovery'
MAIN=ROOT/'results/terra61'
plan=json.loads((OUT/'promotion-plan.json').read_text())
assert plan['promote_after_all40_verified_and_reviewed'] and plan['user_authorization']=='結果上書きしていいよ'
subprocess.run(['python3',str(ROOT/'scripts/check-terra61-recovery-inputs.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/verify-terra61-recovery.py')],check=True)
v=json.loads((OUT/'native-verification.json').read_text())
assert v['verified']==40 and not v['provisional'] and not v['grading_errors'] and not v['existing_test_or_config_edits_needing_review']
targets=json.loads((OUT/'targets.json').read_text())['targets']
for name,expected in [('hard',1),('ultra',19),('apex',20)]:
    r=subprocess.run(['python3',str(ROOT/'scripts/audit-scope.py'),str(OUT/name/'runs')],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=True)
    (OUT/name/'audit.txt').write_text(r.stdout)
    assert f'audited {expected} runs, 0 flagged,' in r.stdout
archive=ROOT/plan['original_archive']
review=json.loads((MAIN/'test-change-review.json').read_text())
recovery_review=json.loads((OUT/'test-change-review.json').read_text())
for t in targets:
    rel=Path(t['set'])/'runs'/t['run_id'];source=OUT/rel;dest=MAIN/rel
    assert hashlib.sha256((archive/'results/terra61'/rel/'grade.json').read_bytes()).hexdigest()==t['original_grade_sha256']
    meta=json.loads((source/'run.meta.json').read_text());grade=json.loads((source/'grade.json').read_text())
    assert meta.get('recovery_protocol') and not meta['codex']['timed_out'] and grade['success'] is not None
    stage=dest.with_name(dest.name+'.recovery-promoting')
    if stage.exists():shutil.rmtree(stage)
    shutil.copytree(source,stage)
    previous=dest.with_name(dest.name+'.pre-recovery')
    if previous.exists():shutil.rmtree(previous)
    if dest.exists():os.replace(dest,previous)
    os.replace(stage,dest)
    if previous.exists():shutil.rmtree(previous)
    review[t['run_id']]=recovery_review.get(t['run_id'],[])
(MAIN/'test-change-review.json').write_text(json.dumps(review,indent=2,ensure_ascii=False)+'\n')
promotion={'original_archive':plan['original_archive'],'source':'results/terra61-recovery','replaced_cells':40,
           'run_ids':[t['run_id'] for t in targets],'original_full_result_correct':462,
           'protocol':'Original remaining556 use nominal30min cap; promoted40 have no solver wall deadline and caffeinate sleep prevention. Selected retry sensitivity result, not uniform deadline model ranking.'}
(MAIN/'recovery-promotion.json').write_text(json.dumps(promotion,indent=2)+'\n')
for name in ['code45','hard','ultra','extreme','apex','brownfield']:
    r=subprocess.run(['python3',str(ROOT/'scripts/audit-scope.py'),str(MAIN/name/'runs')],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=True)
    (MAIN/name/'audit.txt').write_text(r.stdout)
subprocess.run(['python3',str(ROOT/'scripts/verify-terra61.py')],check=True)
stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
baseline=OUT/('promotion-publication-baseline-'+stamp)
baseline.mkdir(exist_ok=True)
for file in ['README.md','docs/report-opus-ja.html']:
    dest=baseline/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/file,dest)
(MAIN/'publication-baseline-path.txt').write_text(str(baseline.relative_to(ROOT))+'\n')
subprocess.run(['python3',str(ROOT/'scripts/report-terra61-recovery.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/report-terra61.py'),'--publish'],check=True)
subprocess.run(['python3',str(ROOT/'scripts/validate-terra61-recovery-publication.py')],check=True)
(OUT/'promotion-complete.json').write_text(json.dumps({'complete':True,'verified_at':datetime.now(timezone.utc).isoformat(),'published_main596':True,'original_archive':plan['original_archive']},indent=2)+'\n')
print('Promoted40 authorized reruns and published/validated corrected596; original5242files remain archived.')
