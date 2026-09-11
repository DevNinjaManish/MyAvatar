"""Rivet workspace planning and bounded read-only inspection orchestration."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Awaitable, Callable

from backend.core.capabilities import execute_capability, profile_for_bot
from backend.core.patch_proposal import parse_patch_proposal
from backend.core.workspace import build_change_plan_prompt, choose_context

InspectFn = Callable[[list[dict[str, str]], dict[str, Any]], Awaitable[str]]


async def plan_workspace(
    request: str,
    config: dict[str, Any],
    inspect: InspectFn,
    *,
    root: Path | str = '.',
) -> dict[str, Any]:
    """Discover context and ask the coding model for a read-only plan/patch preview."""
    files = choose_context(request, root=root)
    messages = build_change_plan_prompt(request, files)
    answer = await inspect(messages, config)
    patch = None
    try:
        patch = parse_patch_proposal(answer)
    except ValueError:
        patch = None
    return {
        'plan': answer,
        'paths': [item['path'] for item in files],
        'patch': patch,
        'readOnly': True,
        'applicable': False,
    }


def capability_snapshot() -> dict[str, Any]:
    """Describe Rivet's registered tools without exposing handlers or command text."""
    profile=profile_for_bot('robot')
    return {'bot':profile['id'],'label':profile['label'],'capabilities':profile['capabilities']}


def workspace_snapshot(request: str = '', *, root: Path | str = '.') -> dict[str, Any]:
    """Return bounded repository, search, capability, and Git inspection metadata."""
    tree=execute_capability('robot','repository.list',root=root)
    matches=execute_capability('robot','repository.search',root=root,query=request) if request.strip() else []
    git: dict[str,Any]
    try:
        git={
            'status':execute_capability('robot','git.status',root=root),
            'recentCommits':execute_capability('robot','git.log',root=root,limit=8),
            'diffSummary':execute_capability('robot','git.diff',root=root),
        }
    except (ValueError,RuntimeError):
        git={'available':False,'readOnly':True}
    return {
        'files': tree,
        'matches': matches,
        'git': git,
        'capabilities': capability_snapshot()['capabilities'],
        'readOnly': True,
    }
