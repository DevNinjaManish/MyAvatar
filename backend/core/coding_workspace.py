"""Rivet read-only workspace planning orchestration."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Awaitable, Callable

from backend.core.patch_proposal import parse_patch_proposal
from backend.core.workspace import build_change_plan_prompt, choose_context, list_workspace, search_workspace

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
        # Missing/invalid patch remains a useful plan; never make unsafe model
        # output actionable just because it accompanied otherwise useful advice.
        patch = None
    return {
        'plan': answer,
        'paths': [item['path'] for item in files],
        'patch': patch,
        'readOnly': True,
        'applicable': False,
    }


def workspace_snapshot(request: str = '', *, root: Path | str = '.') -> dict[str, Any]:
    """Return bounded discovery metadata suitable for Rivet's UI/cockpit."""
    tree = list_workspace(root=root)
    matches = search_workspace(request, root=root) if request.strip() else []
    return {
        'files': tree,
        'matches': matches,
        'readOnly': True,
    }
