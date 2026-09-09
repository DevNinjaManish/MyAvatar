"""Cancellable, identity-safe authored greetings.

Greeting synthesis is intentionally low priority. Cancelling a greeting cannot
force-stop a native TTS call already running in its worker, but its result is
invalidated and never sent. User turns, bot switches and shutdown therefore win
without claiming native inference was forcibly terminated.
"""
from __future__ import annotations

import asyncio
import base64
import copy
import logging
import secrets
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable

log = logging.getLogger('avatar.greetings')

GREETING_LINES = {
    'nova': {
        'morning': ['Good morning. I am here. What shall we tackle?', 'Morning. What would make today easier?'],
        'afternoon': ['Good afternoon. What needs your attention?', 'I am here. What shall we work through?'],
        'evening': ['Good evening. What shall we finish or plan?', 'Evening. What is on your mind?'],
        'night': ['Still up? I am here if you need me.', 'Late night. What shall we work through?'],
    },
    'robot': {
        'morning': ['Rivet here. What needs fixing?', 'Morning. Hand me the tricky part.'],
        'afternoon': ['Rivet online. What needs fixing?', 'Afternoon. What are we debugging?'],
        'evening': ['Rivet here. What is the evening mission?', 'Evening. What needs a repair pass?'],
        'night': ['Night shift. What are we debugging?', 'Rivet awake. What needs fixing?'],
    },
    'butler': {
        'morning': ['Good morning. What deserves our attention?', 'Good morning. Where shall we begin?'],
        'afternoon': ['Good afternoon. What deserves our focus?', 'At your service. What shall we organise?'],
        'evening': ['Good evening. What shall we put in order?', 'Good evening. How may I be useful?'],
        'night': ['A quiet hour. What shall we organise?', 'At your service. What needs attention?'],
    },
    'pixel': {
        'morning': ['Morning. Give me the brief. Let us find the angle.', 'Morning. What are we making sharper?'],
        'afternoon': ['Afternoon. What are we trying to make land?', 'Give me the idea. I will help find the hook.'],
        'evening': ['Evening. What needs a stronger angle?', 'Give me the draft. Let us make it punchier.'],
        'night': ['Night shift. What idea are we sharpening?', 'Late-night brainstorm? Give me the brief.'],
    },
    'luma': {
        'morning': ['Good morning. What are we making clearer today?', 'A fresh canvas. What should we improve?'],
        'afternoon': ['Good afternoon. What should we refine?', 'What experience are we making clearer?'],
        'evening': ['Good evening. What should we review?', 'Evening. What design decision needs attention?'],
        'night': ['A quiet hour for design. What are we exploring?', 'What visual problem are we solving tonight?'],
    },
}


def time_category(hour: int) -> str:
    if 5 <= hour < 12:
        return 'morning'
    if 12 <= hour < 18:
        return 'afternoon'
    if 18 <= hour < 22:
        return 'evening'
    return 'night'


def choose_greeting(config: dict, *, hour: int) -> tuple[str, int]:
    bot = config.get('conversation', {}).get('persona', 'nova')
    lines = GREETING_LINES.get(bot, GREETING_LINES['nova'])[time_category(hour)]
    indexes = config.setdefault('_greetingIndexes', {})
    index = indexes.get(bot, 0)
    if type(index) is not int or index < 0:
        index = 0
    return lines[index % len(lines)], index


@dataclass
class StartupGreetingGuard:
    cooldown_seconds: float = 45.0
    _last: dict[str, float] = field(default_factory=dict)

    def allow(self, bot_id: str, *, now: float | None = None) -> bool:
        current = time.monotonic() if now is None else now
        previous = self._last.get(bot_id)
        if previous is not None and current - previous < self.cooldown_seconds:
            return False
        self._last[bot_id] = current
        return True


DEFAULT_STARTUP_GUARD = StartupGreetingGuard()


class GreetingCoordinator:
    def __init__(self, *, generate: Callable[[str, dict], bytes], executor,
                 send: Callable[..., Awaitable[None]], save_preferences: Callable[[dict], bool],
                 enabled: bool = True, startup_guard: StartupGreetingGuard | None = None):
        self.generate = generate
        self.executor = executor
        self.send = send
        self.save_preferences = save_preferences
        self.enabled = enabled
        self.startup_guard = startup_guard or DEFAULT_STARTUP_GUARD
        self._generation = 0
        self._task: asyncio.Task | None = None
        self._startup_requested = False

    @property
    def pending(self) -> bool:
        return self._task is not None and not self._task.done()

    def cancel(self) -> None:
        self._generation += 1
        task, self._task = self._task, None
        if task is not None and not task.done():
            task.cancel()

    def request(self, config: dict, *, reason: str, hour: int | None = None) -> str | None:
        if not self.enabled or reason not in {'startup', 'bot_switch', 'onboarding'}:
            return None
        bot_id = config.get('conversation', {}).get('persona')
        if not isinstance(bot_id, str) or bot_id not in config.get('bots', {}):
            return None
        if reason == 'startup':
            if self._startup_requested or not self.startup_guard.allow(bot_id):
                return None
            self._startup_requested = True
        self.cancel()
        self._generation += 1
        generation = self._generation
        operation_id = secrets.token_hex(12)
        selected_hour = time.localtime().tm_hour if hour is None else hour
        text, rotation_index = choose_greeting(config, hour=selected_hour)
        tts_config = copy.deepcopy(config['tts'])

        async def run() -> None:
            try:
                loop = asyncio.get_running_loop()
                wav = await loop.run_in_executor(self.executor, self.generate, text, tts_config)
                if generation != self._generation:
                    return
                await self.send('greeting', operation_id=operation_id, text=text,
                                audio=base64.b64encode(wav).decode())
                if generation != self._generation:
                    return
                indexes = config.setdefault('_greetingIndexes', {})
                indexes[bot_id] = rotation_index + 1
                self.save_preferences(config)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # Do not include user text, paths or model content in the warning.
                log.warning('Greeting unavailable (%s); continuing without automatic speech.', type(exc).__name__)
            finally:
                current = asyncio.current_task()
                if self._task is current:
                    self._task = None

        self._task = asyncio.create_task(run())
        return operation_id

    async def close(self) -> None:
        task = self._task
        self.cancel()
        if task is not None:
            try:
                await task
            except asyncio.CancelledError:
                pass
