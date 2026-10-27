#!/usr/bin/env python3
"""Run the real dependency-free Core profile and animation rules."""
from pathlib import Path
import subprocess
import tempfile
root = Path(__file__).resolve().parent
sources = sorted((root / 'src/main/java/dev/sunrin/core/domain').glob('*.java'))
sources += [root / 'src/main/java/dev/sunrin/core/server/ConfigFiles.java']
tests = sorted((root / 'src/test/java').rglob('*.java'))
with tempfile.TemporaryDirectory(prefix='sunrin-core-tests-') as folder:
    subprocess.run(['javac', '--release', '17', '-encoding', 'UTF-8', '-d', folder, *map(str, sources + tests)], check=True)
    subprocess.run(['java', '-ea', '-cp', folder, 'dev.sunrin.core.domain.DomainTests'], check=True)
