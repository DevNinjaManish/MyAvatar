"""Truthful per-engine readiness and capability summaries.

Readiness describes local capability availability only. It never retries a user
action, grants permission, or claims a native worker was force-stopped.

The conversational core (LLM/STT/TTS) is intentionally separated from optional
specialist engines. This lets MyAvatar boot cleanly on modest hardware even when
coding or image generation has not been installed yet.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

CORE_ENGINE_IDS = ('llm', 'stt', 'tts')
OPTIONAL_ENGINE_IDS = ('coding', 'image')
ENGINE_IDS = (*CORE_ENGINE_IDS, *OPTIONAL_ENGINE_IDS)
ENGINE_STATES = frozenset({'pending', 'preparing', 'ready', 'unavailable', 'deferred'})


class EngineReadiness:
    def __init__(self):
        self.revision = 0
        self.engines: dict[str, dict[str, Any]] = {}
        self.reset()

    def reset(self, *, deferred: bool = False) -> None:
        core_state = 'deferred' if deferred else 'pending'
        self.engines = {engine: {'state': core_state} for engine in CORE_ENGINE_IDS}
        # Specialists are opt-in in the first fast-runtime batch. Their absence
        # must not prevent the voice assistant from becoming ready.
        self.engines.update({engine: {'state': 'deferred', 'reason': 'not_started'} for engine in OPTIONAL_ENGINE_IDS})
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
        core_ready = lambda engine: self.engines[engine]['state'] in {'ready', 'deferred'}
        optional_ready = lambda engine: self.engines[engine]['state'] == 'ready'
        if name == 'chat':
            return core_ready('llm')
        if name == 'listen':
            return core_ready('stt')
        if name == 'speak':
            return core_ready('tts')
        if name == 'voice':
            return core_ready('stt') and core_ready('tts')
        if name == 'code':
            return optional_ready('coding')
        if name == 'image':
            return optional_ready('image')
        raise ValueError('Unknown runtime capability.')

    def snapshot(self) -> dict[str, Any]:
        capabilities = {
            name: self.capability(name)
            for name in ('chat', 'listen', 'speak', 'voice', 'code', 'image')
        }
        # Overall startup health is based on the conversational core. Optional
        # specialists report their own readiness without degrading basic use.
        states = {self.engines[engine]['state'] for engine in CORE_ENGINE_IDS}
        if states <= {'ready', 'deferred'}:
            overall = 'ready'
        elif any(capabilities[name] for name in ('chat', 'listen', 'speak', 'voice')):
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
