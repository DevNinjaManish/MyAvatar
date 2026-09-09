"""Truthful per-engine readiness and capability summaries.

Readiness describes local capability availability only. It never retries a user
action, grants permission, or claims a native worker was force-stopped.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

ENGINE_IDS = ('llm', 'stt', 'tts')
ENGINE_STATES = frozenset({'pending', 'preparing', 'ready', 'unavailable', 'deferred'})


class EngineReadiness:
    def __init__(self):
        self.revision = 0
        self.engines: dict[str, dict[str, Any]] = {}
        self.reset()

    def reset(self, *, deferred: bool = False) -> None:
        state = 'deferred' if deferred else 'pending'
        self.engines = {engine: {'state': state} for engine in ENGINE_IDS}
        self.revision += 1

    def set(self, engine: str, state: str, *, reason: str | None = None) -> None:
        if engine not in ENGINE_IDS:
            raise ValueError('Unknown engine readiness id.')
        if state not in ENGINE_STATES:
            raise ValueError('Unknown engine readiness state.')
        next_value: dict[str, Any] = {'state': state}
        if reason:
            # Reasons are stable product codes, not exception messages or paths.
            next_value['reason'] = str(reason)[:64]
        if self.engines.get(engine) == next_value:
            return
        self.engines[engine] = next_value
        self.revision += 1

    def capability(self, name: str) -> bool:
        ready = lambda engine: self.engines[engine]['state'] in {'ready', 'deferred'}
        if name == 'chat':
            return ready('llm')
        if name == 'listen':
            return ready('stt')
        if name == 'speak':
            return ready('tts')
        if name == 'voice':
            return ready('stt') and ready('tts')
        raise ValueError('Unknown runtime capability.')

    def snapshot(self) -> dict[str, Any]:
        capabilities = {name: self.capability(name) for name in ('chat', 'listen', 'speak', 'voice')}
        states = {value['state'] for value in self.engines.values()}
        if states <= {'ready', 'deferred'}:
            overall = 'ready'
        elif any(capabilities.values()):
            overall = 'degraded'
        elif 'preparing' in states or 'pending' in states:
            overall = 'preparing'
        else:
            overall = 'unavailable'
        return {
            'revision': self.revision,
            'overall': overall,
            'engines': deepcopy(self.engines),
            'capabilities': capabilities,
        }
