"""Allowlisted post-edit verification for Rivet.

Verification never accepts arbitrary shell text from the model. It selects a
small command set from repository metadata and changed file types, executes
without a shell, bounds runtime/output, and supports cooperative cancellation.
"""
from __future__ import annotations

import subprocess
import time
from pathlib import Path
from threading import Event
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
    if any(Path(path).name in {'package.json', 'config.json', 'vite.config.js', 'vite.config.ts'} for path in paths) and _exists(repo_root, 'package.json'):
        checks = [{'id': 'tests', 'label': 'Project tests', 'command': ['npm', 'test']}]
    seen: set[str] = set()
    return [check for check in checks if not (check['id'] in seen or seen.add(check['id']))]


def _bounded(stdout: str | None, stderr: str | None) -> str:
    output=((stdout or '') + ('\n' if stdout and stderr else '') + (stderr or '')).strip()
    return output[-MAX_OUTPUT_CHARS:] if len(output)>MAX_OUTPUT_CHARS else output


def _run_check(check: dict[str, Any], root: Path, cancel_event: Event | None = None) -> dict[str, Any]:
    command=list(check['command']);executable=command[0]
    if executable.startswith('.') and not (root / executable).is_file():
        return {**check,'ok':False,'code':None,'output':f'Missing required executable: {executable}','kind':'unavailable'}
    try:
        process=subprocess.Popen(command,cwd=root,shell=False,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    except FileNotFoundError:
        return {**check,'ok':False,'code':None,'output':f'Command not found: {executable}','kind':'unavailable'}
    deadline=time.monotonic()+VERIFY_TIMEOUT_SECONDS
    while process.poll() is None:
        if cancel_event is not None and cancel_event.is_set():
            process.terminate()
            try:stdout,stderr=process.communicate(timeout=2)
            except subprocess.TimeoutExpired:
                process.kill();stdout,stderr=process.communicate()
            return {**check,'ok':False,'code':process.returncode,'output':_bounded(stdout,stderr),'kind':'cancelled'}
        if time.monotonic()>=deadline:
            process.kill();stdout,stderr=process.communicate()
            return {**check,'ok':False,'code':None,'output':_bounded(stdout,stderr),'kind':'timeout'}
        time.sleep(.05)
    stdout,stderr=process.communicate()
    return {**check,'ok':process.returncode==0,'code':process.returncode,'output':_bounded(stdout,stderr),'kind':'completed'}


def verify_edit(files: list[dict[str, Any]], *, root: Path | str='.', cancel_event: Event | None=None) -> dict[str, Any]:
    repo_root=Path(root).resolve();checks=choose_verification(files,root=repo_root)
    if not checks:return {'status':'not_available','ok':None,'checks':[],'message':'No safe automatic verification is configured for these files.'}
    results=[]
    for check in checks:
        if cancel_event is not None and cancel_event.is_set():
            return {'status':'cancelled','ok':None,'checks':results,'message':'Verification stopped.'}
        result=_run_check(check,repo_root,cancel_event);results.append(result)
        if result['kind']=='cancelled':return {'status':'cancelled','ok':None,'checks':results,'message':'Verification stopped.'}
    ok=all(result['ok'] for result in results)
    return {'status':'passed' if ok else 'failed','ok':ok,'checks':results,'message':'Verification passed.' if ok else 'Verification found issues.'}
