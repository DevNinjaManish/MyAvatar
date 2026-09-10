"""Explicit bot capability boundary.

Descriptors are deliberately inert in this phase: registration does not make
filesystem, shell, Git, or external-service calls available by itself.
"""
from __future__ import annotations

from dataclasses import dataclass
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
        }


CAPABILITIES = {
    'repository.read': Capability('repository.read', 'Read repository context', frozenset({'robot'}), 'coding'),
    'repository.search': Capability('repository.search', 'Search repository context', frozenset({'robot'}), 'coding'),
    'coding.edit': Capability('coding.edit', 'Prepare approved file edits', frozenset({'robot'}), 'coding', True, True),
    'coding.verify': Capability('coding.verify', 'Run allowlisted verification', frozenset({'robot'}), 'coding'),
    'coding.repair': Capability('coding.repair', 'Prepare one bounded repair', frozenset({'robot'}), 'coding', True, True),
}


BOT_PROFILES = {
    'robot': {'label': 'Rivet', 'capabilities': ('repository.read', 'repository.search', 'coding.edit', 'coding.verify', 'coding.repair')},
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
