"""Allowlisted post-edit verification for Rivet.

Verification never accepts arbitrary shell text from the model. It selects a
small command set from repository metadata and changed file types, executes
without a shell, bounds runtime/output, and returns structured results for the
UI and the next repair-loop stage.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

VERIFY_TIMEOUT_SECONDS = 120
MAX_OUTPUT_CHARS = 12000


def _exists(root: Path, relative: str) -> bool:
    return (root / relative).is_file()


def choose_verification(files: list[dict[str, Any]], *, root: Path | str = '.') -> list[dict[str, Any]]:
    repo_root = Path(root).resolve()
    paths = [str(item.get('path', '')) for item in files]
    suffixes = {Path(path).suffix.lower() for path in paths}
    checks: list[dict[str, Any]] = []

    if '.py' in suffixes and _exists(repo_root, 'package.json') and _exists(repo_root, 'tests/py/test_server.py'):
        checks.append({'id': 'python', 'label': 'Python tests', 'command': ['.venv/bin/python', '-m', 'unittest', 'discover', '-s', 'tests/py', '-p', 'test_*.py']})
    elif '.py' in suffixes and _exists(repo_root, 'pyproject.toml'):
        checks.append({'id': 'python', 'label': 'Python tests', 'command': ['python', '-m', 'unittest', 'discover']})

    if suffixes & {'.js', '.jsx', '.ts', '.tsx', '.css', '.html'} and _exists(repo_root, 'package.json'):
        checks.append({'id': 'javascript', 'label': 'JavaScript tests', 'command': ['npm', 'run', 'test:js']})

    # Changes to shared config/build surfaces justify the complete project test script.
    if any(Path(path).name in {'package.json', 'config.json', 'vite.config.js', 'vite.config.ts'} for path in paths) and _exists(repo_root, 'package.json'):
        checks = [{'id': 'tests', 'label': 'Project tests', 'command': ['npm', 'test']}]

    # Preserve order while deduplicating.
    seen: set[str] = set()
    return [check for check in checks if not (check['id'] in seen or seen.add(check['id']))]


def _run_check(check: dict[str, Any], root: Path) -> dict[str, Any]:
    command = list(check['command'])
    executable = command[0]
    if executable.startswith('.') and not (root / executable).is_file():
        return {**check, 'ok': False, 'code': None, 'output': f'Missing required executable: {executable}', 'kind': 'unavailable'}
    try:
        completed = subprocess.run(
            command,
            cwd=root,
            shell=False,
            capture_output=True,
            text=True,
            timeout=VERIFY_TIMEOUT_SECONDS,
            check=False,
        )
        output = ((completed.stdout or '') + ('\n' if completed.stdout and completed.stderr else '') + (completed.stderr or '')).strip()
        if len(output) > MAX_OUTPUT_CHARS:
            output = output[-MAX_OUTPUT_CHARS:]
        return {**check, 'ok': completed.returncode == 0, 'code': completed.returncode, 'output': output, 'kind': 'completed'}
    except FileNotFoundError:
        return {**check, 'ok': False, 'code': None, 'output': f'Command not found: {executable}', 'kind': 'unavailable'}
    except subprocess.TimeoutExpired as exc:
        output = str(exc.stdout or exc.stderr or '').strip()
        return {**check, 'ok': False, 'code': None, 'output': output[-MAX_OUTPUT_CHARS:], 'kind': 'timeout'}


def verify_edit(files: list[dict[str, Any]], *, root: Path | str = '.') -> dict[str, Any]:
    repo_root = Path(root).resolve()
    checks = choose_verification(files, root=repo_root)
    if not checks:
        return {'status': 'not_available', 'ok': None, 'checks': [], 'message': 'No safe automatic verification is configured for these files.'}
    results = [_run_check(check, repo_root) for check in checks]
    ok = all(result['ok'] for result in results)
    return {
        'status': 'passed' if ok else 'failed',
        'ok': ok,
        'checks': results,
        'message': 'Verification passed.' if ok else 'Verification found issues.',
    }
