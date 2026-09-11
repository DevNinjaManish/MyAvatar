"""Bounded read-only repository and Git inspection for Rivet.

Only fixed, non-mutating Git commands are exposed. Callers cannot supply arbitrary
flags, revisions, paths, environment, or shell text.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

MAX_OUTPUT_CHARS = 16 * 1024
MAX_STATUS_LINES = 120
MAX_LOG_ENTRIES = 20


def _repo_root(root: Path | str) -> Path:
    candidate = Path(root).resolve()
    if not candidate.is_dir():
        raise ValueError('Repository root must be an existing directory.')
    return candidate


def _run_git(root: Path, args: tuple[str, ...]) -> str:
    try:
        result = subprocess.run(
            ('git', '-C', str(root), *args),
            check=False,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=4,
            stdin=subprocess.DEVNULL,
            env={'PATH': '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin'},
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError('Git inspection is unavailable.') from exc
    if result.returncode != 0:
        message=(result.stderr or result.stdout or 'Git inspection failed.').strip()
        raise ValueError(message[:600])
    return result.stdout[:MAX_OUTPUT_CHARS]


def git_status(*, root: Path | str='.') -> dict[str, Any]:
    repo=_repo_root(root)
    output=_run_git(repo, ('status','--short','--branch','--untracked-files=normal'))
    lines=output.splitlines()[:MAX_STATUS_LINES]
    branch=lines[0][3:] if lines and lines[0].startswith('## ') else ''
    changes=lines[1:] if branch else lines
    return {'branch':branch,'changes':changes,'dirty':bool(changes),'truncated':len(output.splitlines())>MAX_STATUS_LINES}


def git_log(*, root: Path | str='.', limit: int=8) -> list[dict[str,str]]:
    repo=_repo_root(root)
    bounded=max(1,min(int(limit),MAX_LOG_ENTRIES))
    output=_run_git(repo, ('log',f'-{bounded}','--date=short','--pretty=format:%h%x09%ad%x09%s'))
    entries=[]
    for line in output.splitlines()[:bounded]:
        parts=line.split('\t',2)
        if len(parts)==3:
            entries.append({'sha':parts[0],'date':parts[1],'subject':parts[2][:240]})
    return entries


def git_diff_summary(*, root: Path | str='.') -> dict[str,Any]:
    repo=_repo_root(root)
    unstaged=_run_git(repo, ('diff','--stat','--no-ext-diff'))
    staged=_run_git(repo, ('diff','--cached','--stat','--no-ext-diff'))
    return {'unstaged':unstaged.strip(),'staged':staged.strip(),'readOnly':True}


def git_inspection(*, root: Path | str='.') -> dict[str,Any]:
    """Return a compact read-only Git snapshot suitable for Rivet context/UI."""
    return {
        'status':git_status(root=root),
        'recentCommits':git_log(root=root),
        'diffSummary':git_diff_summary(root=root),
        'readOnly':True,
    }
