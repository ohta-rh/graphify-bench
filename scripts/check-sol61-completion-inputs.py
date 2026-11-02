#!/usr/bin/env python3
"""Verify frozen new inputs, snapshot, retained Sol and other-model native artifacts."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/sol61-completion'
manifest=json.loads((OUT/'input-manifest.json').read_text())
for f,h in manifest['input_hashes'].items():
    assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h, 'frozen input changed: '+f
corpus=json.loads((OUT/'corpus-manifest.json').read_text())
for f,h in corpus['corpus_file_hashes'].items():
    p=Path(corpus['corpus'])/f
    assert p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==h, 'snapshot changed: '+f
assert not (Path(corpus['corpus'])/'docs').exists()
for group in ['retained_artifact_hashes','reference_json_hashes']:
    for f,h in manifest[group].items():
        assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h, 'protected artifact changed: '+f
print(f"Frozen inputs{len(manifest['input_hashes'])}, snapshot497, retained399 and reference JSON{len(manifest['reference_json_hashes'])} verified")
