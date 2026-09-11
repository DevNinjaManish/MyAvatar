"""Explicit bot capability boundary.

Capabilities are registered centrally and executed only through bounded handlers.
Read-only repository/Git inspection is available to Rivet; mutating capabilities
remain approval-gated and are not made executable here by default.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from backend.core.skills import skills_for_bot


@dataclass(frozen=True)
class Capability:
    id: str
    label: str
    bots: frozenset[str]
    category: str = 'general'
    requires_approval: bool = False
    side_effect: bool = False
    handler: Callable[..., Any] | None = None

    def public(self) -> dict[str, Any]:
        return {
            'id': self.id, 'label': self.label, 'category': self.category,
            'requiresApproval': self.requires_approval, 'sideEffect': self.side_effect,
            'available': self.handler is not None,
        }


def _repository_list(*, root: Path | str='.', limit: int=500, **_: Any) -> Any:
    from backend.core.workspace import list_workspace
    return list_workspace(root=root, limit=limit)


def _repository_read(*, root: Path | str='.', paths: list[str] | tuple[str,...], **_: Any) -> Any:
    from backend.core.repo_context import read_files
    return read_files(paths, root=root)


def _repository_search(*, root: Path | str='.', query: str, **_: Any) -> Any:
    from backend.core.workspace import search_workspace
    return search_workspace(query, root=root)


def _git_status(*, root: Path | str='.', **_: Any) -> Any:
    from backend.core.repo_inspection import git_status
    return git_status(root=root)


def _git_log(*, root: Path | str='.', limit: int=8, **_: Any) -> Any:
    from backend.core.repo_inspection import git_log
    return git_log(root=root, limit=limit)


def _git_diff(*, root: Path | str='.', **_: Any) -> Any:
    from backend.core.repo_inspection import git_diff_summary
    return git_diff_summary(root=root)


RIVET=frozenset({'robot'})
CAPABILITIES = {
    'repository.list': Capability('repository.list', 'List repository files', RIVET, 'coding', handler=_repository_list),
    'repository.read': Capability('repository.read', 'Read repository context', RIVET, 'coding', handler=_repository_read),
    'repository.search': Capability('repository.search', 'Search repository context', RIVET, 'coding', handler=_repository_search),
    'git.status': Capability('git.status', 'Inspect Git status', RIVET, 'coding', handler=_git_status),
    'git.log': Capability('git.log', 'Inspect recent Git history', RIVET, 'coding', handler=_git_log),
    'git.diff': Capability('git.diff', 'Inspect Git diff summary', RIVET, 'coding', handler=_git_diff),
    'coding.edit': Capability('coding.edit', 'Prepare approved file edits', RIVET, 'coding', True, True),
    'coding.verify': Capability('coding.verify', 'Run allowlisted verification', RIVET, 'coding'),
    'coding.repair': Capability('coding.repair', 'Prepare one bounded repair', RIVET, 'coding', True, True),
}


BOT_PROFILES = {
    'robot': {'label': 'Rivet', 'capabilities': (
        'repository.list','repository.read','repository.search','git.status','git.log','git.diff',
        'coding.edit','coding.verify','coding.repair',
    )},
    'nova': {'label': 'Nova', 'capabilities': ()},
    'butler': {'label': 'Sterling', 'capabilities': ()},
    'pixel': {'label': 'Pixel', 'capabilities': ()},
    'luma': {'label': 'Luma', 'capabilities': ()},
}


def capabilities_for_bot(bot_id: str) -> tuple[str, ...]:
    return tuple(capability_id for capability_id in BOT_PROFILES.get(bot_id, {}).get('capabilities', ()) if can_use(bot_id, capability_id))


def profile_for_bot(bot_id: str) -> dict[str, Any]:
    profile = BOT_PROFILES.get(bot_id)
    if profile is None:
        raise ValueError(f'Unknown bot profile: {bot_id}.')
    return {
        'id': bot_id, 'label': profile['label'],
        'capabilities': [CAPABILITIES[capability_id].public() for capability_id in capabilities_for_bot(bot_id)],
        'skills': [skill.public() for skill in skills_for_bot(bot_id)],
    }


def can_use(bot_id: str, capability_id: str) -> bool:
    capability = CAPABILITIES.get(capability_id)
    return capability is not None and bot_id in capability.bots


def get_capability(bot_id: str, capability_id: str) -> Capability:
    if not can_use(bot_id, capability_id):
        raise PermissionError(f'{bot_id} is not allowed to use capability {capability_id}.')
    return CAPABILITIES[capability_id]


def execute_capability(bot_id: str, capability_id: str, /, **kwargs: Any) -> Any:
    """Execute one registered capability; never infer or dispatch arbitrary commands."""
    capability=get_capability(bot_id, capability_id)
    if capability.side_effect or capability.requires_approval:
        raise PermissionError(f'Capability {capability_id} requires the approved mutation flow.')
    if capability.handler is None:
        raise RuntimeError(f'Capability {capability_id} is registered but not directly executable.')
    return capability.handler(**kwargs)
