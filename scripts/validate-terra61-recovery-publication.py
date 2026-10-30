#!/usr/bin/env python3
"""Verify promoted data, publication preservation and byte-idempotence."""
import csv,hashlib,json,re,subprocess
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/terra61-recovery';MAIN=ROOT/'results/terra61'
baseline=ROOT/(MAIN/'publication-baseline-path.txt').read_text().strip()
manifest=json.loads((OUT/'manifest.json').read_text());plan=json.loads((OUT/'promotion-plan.json').read_text())
archive=ROOT/plan['original_archive'];targets=json.loads((OUT/'targets.json').read_text())['targets']
ids={t['run_id'] for t in targets}
for f,h in manifest['original_artifact_hashes'].items():
    assert hashlib.sha256((archive/f).read_bytes()).hexdigest()==h, f
    parts=Path(f).parts
    if len(parts)>4 and parts[:2]==('results','terra61') and parts[3]=='runs' and parts[4] not in ids:
        assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h, 'nonselected cell changed: '+f
refs=json.loads((archive/'results/terra61/reference-artifact-hashes.json').read_text())
assert len(refs)==15516
assert all((ROOT/f).is_file() and hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h for f,h in refs.items())
a=json.loads((MAIN/'analysis.json').read_text());r=json.loads((OUT/'analysis.json').read_text())
assert a['solver_completed']==a['graded']==596 and not a['provisional']
assert r['graded']==40 and a['correct']==462+r['correct']
assert a['recovered_cells']==40 and a['timed_out_runs']==a['unknown_cost_runs']==0
assert len(list(csv.DictReader((MAIN/'runs.csv').open())))==596
assert len(list(csv.DictReader((OUT/'runs.csv').open())))==40
assert sum(bool(x['recovery_protocol']) for x in a['runs'])==40
def strip(s,label):return re.sub(r'<!-- '+label+r'-START -->.*?<!-- '+label+r'-END -->\n{0,2}','',s,flags=re.S)
for f,label in [('docs/report-opus-ja.html','TERRA61'),('README.md','TERRA61-README')]:
    assert strip((ROOT/f).read_text(),label)==strip((baseline/f).read_text(),label), 'nonTerra publication changed: '+f
class Check(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.stack=[];self.ids=[];self.links=[];self.table_count=0
    def handle_starttag(self,tag,attrs):
        at=dict(attrs)
        if 'id' in at:self.ids.append(at['id'])
        if tag=='a' and 'href' in at:self.links.append(at['href'])
        if tag=='table':self.table_count+=1
        if tag not in {'meta','link','br','hr','img','input','source','wbr','area','base','embed','param','track','col'}:self.stack.append(tag)
    def handle_endtag(self,tag):
        assert self.stack and self.stack[-1]==tag,(tag,self.stack[-4:]);self.stack.pop()
for f in ['docs/report-terra61-ja.html','docs/report-terra61-recovery-ja.html']:
    p=ROOT/f;c=Check();c.feed(p.read_text());c.close()
    assert not c.stack and len(c.ids)==len(set(c.ids))
    for link in c.links:
        u=urlsplit(link)
        if u.scheme:continue
        target=p.parent/unquote(u.path) if u.path else p
        assert target.exists(),(f,link)
        if u.fragment and target==p:assert u.fragment in c.ids
    assert '未確認' in p.read_text() and ('混在' in p.read_text() or '混合' in p.read_text())
    if f=='docs/report-terra61-ja.html':assert c.table_count==13
section=lambda s:re.search(r'<!-- TERRA61-START -->.*?<!-- TERRA61-END -->',s,re.S).group(0)
assert section((ROOT/'docs/report-opus-ja.html').read_text())==section((ROOT/'docs/report-terra61-ja.html').read_text())
assert all(s['complete'] for s in a['sets'].values())
for s in a['sets'].values():
    assert all(x['n']==s['tasks'] for pair in s['pairs'].values() for x in pair.values())
files=[ROOT/f for f in ['README.md','docs/report-opus-ja.html','docs/report-terra61-ja.html','docs/report-terra61-recovery-ja.html']]
files += [p/f for p in [MAIN,OUT] for f in ['analysis.json','runs.csv','REPORT.md','progress.json','PROGRESS.md']]
files += [MAIN/'grading-notes.json']
before={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
for command in [['python3','scripts/report-terra61-recovery.py'],['python3','scripts/report-terra61.py','--publish']]:
    subprocess.run(command,cwd=ROOT,check=True,stdout=subprocess.PIPE,text=True)
after={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
assert before==after,'publication not byte-idempotent'
result=dict(graded_runs=596,correct=a['correct'],recovery_graded=40,recovery_correct=r['correct'],
            timed_out_runs=0,recovered_cells=40,original_correct=462,
            archived_original_files_unchanged=len(manifest['original_artifact_hashes']),nonselected556cells_unchanged=True,
            reference_json_unchanged=len(refs),HTML_structure_links_unique_ids_valid=True,
            shared_nonTerra_sections_preserved=True,republication_idempotent=True,
            rendered_visual_check='UNVERIFIED: prior file:// access policy denial; no bypass attempted.',artifact_sha256=after)
(MAIN/'publication-verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
(OUT/'publication-verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(result,indent=2,ensure_ascii=False))
