"""Explicit bot capability boundary.

Descriptors are deliberately inert in this phase: registration does not make
filesystem, shell, Git, or external-service calls available by itself.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


@dataclass(frozen=True)
class Capability:
    id: str
    label: str
    bots: frozenset[str]
    handler: Callable[..., Any] | None = None


CAPABILITIES = {
    'repository.read': Capability('repository.read', 'Read repository context', frozenset({'robot'})),
    'repository.search': Capability('repository.search', 'Search repository context', frozenset({'robot'})),
    'coding.edit': Capability('coding.edit', 'Prepare approved file edits', frozenset({'robot'})),
    'coding.verify': Capability('coding.verify', 'Run allowlisted verification', frozenset({'robot'})),
    'coding.repair': Capability('coding.repair', 'Prepare one bounded repair', frozenset({'robot'})),
}


def capabilities_for_bot(bot_id: str) -> tuple[str, ...]:
    return tuple(capability_id for capability_id, capability in CAPABILITIES.items() if bot_id in capability.bots)


def can_use(bot_id: str, capability_id: str) -> bool:
    capability = CAPABILITIES.get(capability_id)
    return capability is not None and bot_id in capability.bots


def get_capability(bot_id: str, capability_id: str) -> Capability:
    if not can_use(bot_id, capability_id):
        raise PermissionError(f'{bot_id} is not allowed to use capability {capability_id}.')
    return CAPABILITIES[capability_id]
