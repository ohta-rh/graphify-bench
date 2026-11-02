#!/usr/bin/env python3
"""Final independent preservation, matrix, HTML and publication idempotence checks."""
import csv,hashlib,json,re,subprocess
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/sol61-completion'
subprocess.run(['python3',str(ROOT/'scripts/check-sol61-completion-inputs.py')],check=True)
subprocess.run(['python3',str(ROOT/'scripts/verify-sol61-completion.py')],check=True)
v=json.loads((OUT/'native-verification.json').read_text())
assert v['verified']==197 and not v['provisional'] and not v['grading_errors'] and not v['existing_test_or_config_edits_needing_review']
selection=json.loads((OUT/'targets.json').read_text());data=json.loads((OUT/'analysis.json').read_text())
manifest=json.loads((OUT/'input-manifest.json').read_text())
assert data['graded']==data['completed']==data['expected']==596 and not data['provisional']
assert data['new']['graded']==data['new']['completed']==197
keys=lambda rs:{(r['set'],r['task_id'],r['effort'],r['rep']) for r in rs}
new=[r for r in data['runs'] if r['phase']=='new197'];old=[r for r in data['runs'] if r['phase']=='retained399']
assert len(new)==197 and len(old)==399 and keys(new)==keys(selection['targets']) and keys(old)==keys(selection['retained'])
assert not keys(new)&keys(old) and len(keys(new+old))==596
for r in old:
    m=json.loads((ROOT/r['source']/'run.meta.json').read_text());args=m['codex']['argv']
    assert m['env']['model']=='gpt-6.1-sol' and args[args.index('-m')+1]=='gpt-6.1-sol'
assert sum(r['timed_out'] for r in old)==9 and not any(r['timed_out'] for r in new)
csvrows=list(csv.DictReader((OUT/'runs.csv').open()))
assert len(csvrows)==596 and len(keys(csvrows))==596
assert sum(bool(r['success']) for r in data['runs'])==data['correct']
for name,s in data['sets'].items():
    assert s['graded']==s['expected'] and len(s['arms'])==4
    for pair,metrics in s['pairs'].items():
        for k,m in metrics.items():assert m['n']==s['tasks']
for name,count in [('hard',128),('extreme',24),('code45',45)]:
    text=(OUT/name/'audit.txt').read_text();assert f'audited {count} runs, 0 flagged,' in text
def strip(s,tag):return re.sub(r'<!-- '+tag+r'-START -->.*?<!-- '+tag+r'-END -->\n{0,2}','',s,flags=re.S)
for f,tag in [('README.md','SOL61-COMPLETION-README'),('docs/report-opus-ja.html','SOL61-COMPLETION')]:
    assert strip((ROOT/f).read_text(),tag)==strip((OUT/'publication-baseline'/f).read_text(),tag),'non-Sol publication changed: '+f
class Check(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.stack=[];self.ids=[];self.links=[];self.tables=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a' and 'href' in a:self.links.append(a['href'])
        if tag=='table':self.tables+=1
        if tag not in {'meta','link','br','hr','img','input','source','wbr','area','base','embed','param','track','col'}:self.stack.append(tag)
    def handle_endtag(self,tag):
        assert self.stack and self.stack[-1]==tag,(tag,self.stack[-4:]);self.stack.pop()
p=ROOT/'docs/report-sol61-completion-ja.html';h=Check();h.feed(p.read_text());h.close()
assert not h.stack and len(h.ids)==len(set(h.ids)) and h.tables==7
for link in h.links:
    u=urlsplit(link)
    if u.scheme:continue
    target=p.parent/unquote(u.path) if u.path else p
    assert target.exists(),link
    if u.fragment and target==p:assert u.fragment in h.ids
assert '混合条件' in p.read_text() and '未確認' in p.read_text()
section=lambda s:re.search(r'<!-- SOL61-COMPLETION-START -->.*?<!-- SOL61-COMPLETION-END -->',s,re.S).group(0)
assert section(p.read_text())==section((ROOT/'docs/report-opus-ja.html').read_text())
files=['README.md','docs/report-opus-ja.html','docs/report-sol61-completion-ja.html']+['results/sol61-completion/'+f for f in ['analysis.json','runs.csv','REPORT.md','progress.json','PROGRESS.md','grading-notes.json']]
hashes=lambda:{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files}
before=hashes()
subprocess.run(['python3',str(ROOT/'scripts/report-sol61-completion.py'),'--publish'],check=True,stdout=subprocess.PIPE,text=True)
assert before==hashes(),'republication is not byte-idempotent'
result=dict(graded=596,correct=data['correct'],new_graded=197,new_correct=data['new']['correct'],retained=399,
            retained_artifact_files_unchanged=len(manifest['retained_artifact_hashes']),reference_json_unchanged=len(manifest['reference_json_hashes']),
            frozen_inputs_unchanged=len(manifest['input_hashes']),snapshot_files=497,historical_timeouts_retained=9,new_timeouts=0,
            native_new197_verified=True,all3new_scope_audits_zero_flags=True,existing_test_config_reviews_complete=True,
            CSV_unique596=True,HTML_structure_links_ids_valid=True,shared_nonSol_sections_preserved=True,
            task_bootstrap_sample_counts_valid=True,republication_byte_idempotent=True,
            rendered_visual_check='UNVERIFIED: existing file:// policy denial; no bypass attempted.',artifact_sha256=before)
(OUT/'publication-verification.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='artifact_sha256'},indent=2,ensure_ascii=False))
