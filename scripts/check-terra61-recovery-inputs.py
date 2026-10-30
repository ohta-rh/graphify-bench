#!/usr/bin/env python3
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'results/terra61-recovery'
subprocess.run(['python3',str(ROOT/'scripts/check-terra61-inputs.py')],check=True)
m=json.loads((OUT/'manifest.json').read_text())
plan=json.loads((OUT/'promotion-plan.json').read_text()) if (OUT/'promotion-plan.json').exists() else {}
archive=ROOT/plan['original_archive'] if plan.get('original_archive') else ROOT
for file,expected in m['input_hashes'].items():
    assert hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==expected, 'recovery input changed: '+file
for file,expected in m['original_artifact_hashes'].items():
    assert (archive/file).is_file() and hashlib.sha256((archive/file).read_bytes()).hexdigest()==expected, 'original artifact/archive changed: '+file
print('Recovery inputs and original artifacts verified')
