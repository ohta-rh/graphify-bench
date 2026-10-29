#!/usr/bin/env python3
"""Structural publication QA; does not bypass the existing browser restriction."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re
ROOT=Path(__file__).resolve().parent.parent
STATE=ROOT/'results/sol61-additional'
class Check(HTMLParser):
    def __init__(self):
        super().__init__();self.stack=[];self.links=[];self.ids=[];self.tables=0
    def handle_starttag(self,t,a):
        d=dict(a)
        if t in ['section','table','thead','tbody','tr','td','th']:self.stack.append(t)
        if t=='table':self.tables+=1
        if 'id' in d:self.ids.append(d['id'])
        if t=='a' and d.get('href'):self.links.append(d['href'])
    def handle_endtag(self,t):
        if t in ['section','table','thead','tbody','tr','td','th']:assert self.stack.pop()==t,t
refs=json.loads((STATE/'reference-artifact-hashes.json').read_text())
assert all((ROOT/p).is_file() and hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in refs.items()),'prior/reference artifact changed'
for file,baseline,marker in [('docs/report-opus-ja.html','report-opus-ja.html',''),('README.md','README.md','-README')]:
    s=(ROOT/file).read_text()
    for name in ['APEX','BROWNFIELD']:
        tag='SOL61-'+name+marker
        assert s.count('<!-- '+tag+'-START -->')==1,(file,tag)
        s=re.sub(r'<!-- '+tag+r'-START -->.*?<!-- '+tag+r'-END -->\n{0,2}','',s,flags=re.S)
    assert s==(STATE/'publication-baseline'/baseline).read_text(),file
for name in ['apex','brownfield']:
    out=ROOT/f'results/sol61-{name}'
    data=json.loads((out/'analysis.json').read_text()); native=json.loads((out/'native-verification.json').read_text())
    assert native['verified']==48 and not native['provisional'] and not native['grading_errors'] and not native['existing_test_or_config_edits_needing_review']
    path=ROOT/f'docs/report-sol61-{name}-ja.html';s=path.read_text();q=Check();q.feed(s)
    assert not q.stack and len(q.ids)==len(set(q.ids)) and q.tables==4,path
    for href in q.links:
        if not href.startswith(('https:','http:','#','mailto:')):assert (path.parent/href.split('#')[0]).exists(),href
    correct=sum(a['correct'] for a in data['arms'].values())
    assert f'{correct}/48' in s and '96実行' not in s,path
    assert len(data['runs'])==48 and all(a['n']==12 for a in data['arms'].values())
    record=dict(native_runs_verified=48,tables_checked=q.tables,relative_links_valid=True,unique_ids=True,
        shared_other_content_unchanged=True,protected_artifacts_unchanged=len(refs),rendered_visual_qa=False,
        rendering_note='Previously file:// browser access was policy-denied; no alternate protocol/browser or CDP bypass attempted.',
        timeout_runs=sum(a['timed_out'] for a in data['arms'].values()),unknown_cost_runs=sum(a['unknown_cost_runs'] for a in data['arms'].values()))
    (out/'html-verification.json').write_text(json.dumps(record,indent=2)+'\n')
    print(name,json.dumps(record))
