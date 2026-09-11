from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_DIR = ROOT / 'tests' / 'py'
PER_FILE_TIMEOUT_SECONDS = 45


def module_name(path: Path) -> str:
    return '.'.join(path.relative_to(ROOT).with_suffix('').parts)


def main() -> int:
    files = sorted(TEST_DIR.glob('test_*.py'))
    if not files:
        print('No Python tests found.', file=sys.stderr)
        return 2

    print(f'Running {len(files)} Python test files with a {PER_FILE_TIMEOUT_SECONDS}s per-file timeout.', flush=True)
    for path in files:
        module = module_name(path)
        print(f'\n=== {path.relative_to(ROOT)} ===', flush=True)
        try:
            result = subprocess.run(
                [sys.executable, '-m', 'unittest', module],
                cwd=ROOT,
                check=False,
                timeout=PER_FILE_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            print(
                f'ERROR: {path.relative_to(ROOT)} exceeded {PER_FILE_TIMEOUT_SECONDS}s and was terminated.',
                file=sys.stderr,
                flush=True,
            )
            return 124
        if result.returncode:
            return result.returncode

    print('\nAll Python test files passed.', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
