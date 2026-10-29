#!/usr/bin/env python3
"""Verify the frozen whole experiment before starting/resuming any Terra set."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'results/terra61/input-manifest.json').read_text())
for file,expected in manifest['input_hashes'].items():
    assert hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==expected, 'frozen input changed: '+file
p=Path(manifest['corpus'])
for file,expected in manifest['corpus_file_hashes'].items():
    assert (p/file).is_file() and hashlib.sha256((p/file).read_bytes()).hexdigest()==expected, 'snapshot missing/changed: '+file
assert not (p/'docs').exists(), 'code-only corpus required'
print('Frozen Terra inputs verified')
