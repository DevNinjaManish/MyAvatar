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
DEFAULT_GREETING_TIMEOUT_SECONDS = 8.0

GREETING_LINES = {
    'nova': {
        'morning': ['Good morning. What would make today easier?', 'Morning. I am here. What are we tackling first?'],
        'afternoon': ['Hey. What needs your attention right now?', 'I am here. What should we make easier?'],
        'evening': ['Evening. What do you want to finish or figure out?', 'Hey. What is still on your mind?'],
        'night': ['Still up? I am here. What are we sorting out?', 'Late one? Tell me what you want off your mind.'],
    },
    'robot': {
        'morning': ['Rivet here. What needs fixing?', 'Morning. Hand me the tricky part.'],
        'afternoon': ['Rivet online. What needs fixing?', 'Afternoon. What are we debugging?'],
        'evening': ['Rivet here. What is the evening mission?', 'Evening. What needs a repair pass?'],
        'night': ['Rivet, night shift. What are we debugging?', 'Rivet awake. What needs fixing?'],
    },
    'butler': {
        'morning': ['Good morning. What deserves our attention?', 'Good morning. Where should we begin?'],
        'afternoon': ['Good afternoon. What deserves our focus?', 'At your service. What should we organise?'],
        'evening': ['Good evening. What should we put in order?', 'Good evening. How may I be useful?'],
        'night': ['A quiet hour. What should we organise?', 'At your service. What needs attention?'],
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

BOT_SWITCH_LINES = {
    'nova': ['Nova here. What are we picking up?', 'I am with you. What do you need right now?'],
    'robot': ['Rivet here. What needs fixing?', 'Rivet ready. Show me the problem.'],
    'butler': ['Sterling here. What needs attention?', 'At your service. Where shall we begin?'],
    'pixel': ['Pixel here. What are we sharpening?', 'Pixel ready. Give me the brief.'],
    'luma': ['Luma here. What are we designing?', 'Luma ready. What should we refine?'],
}

ONBOARDING_LINES = {
    'nova': ['Hi, I am Nova. Tell me what is on your mind, and we will work it out.'],
    'robot': ['Hi, I am Rivet. Give me something to inspect, fix, or build.'],
    'butler': ['Hello, I am Sterling. Tell me what needs organising.'],
    'pixel': ['Hi, I am Pixel. Give me a campaign, idea, or draft to sharpen.'],
    'luma': ['Hi, I am Luma. Tell me what you are designing or deciding.'],
}

IDLE_RETURN_LINES = {
    'nova': ['I am here. What should we pick back up?'],
    'robot': ['Rivet is here. What are we picking back up?'],
    'butler': ['I am here. Shall we continue?'],
    'pixel': ['Back to it. What are we sharpening?'],
    'luma': ['I am here. What should we continue refining?'],
}


def time_category(hour: int) -> str:
    if 5 <= hour < 12:
        return 'morning'
    if 12 <= hour < 18:
        return 'afternoon'
    if 18 <= hour < 22:
        return 'evening'
    return 'night'


def _lines_for(bot: str, *, reason: str, hour: int) -> list[str]:
    if reason == 'bot_switch':
        return BOT_SWITCH_LINES.get(bot, BOT_SWITCH_LINES['nova'])
    if reason == 'onboarding':
        return ONBOARDING_LINES.get(bot, ONBOARDING_LINES['nova'])
    if reason == 'idle_return':
        return IDLE_RETURN_LINES.get(bot, IDLE_RETURN_LINES['nova'])
    return GREETING_LINES.get(bot, GREETING_LINES['nova'])[time_category(hour)]


def choose_greeting(config: dict, *, hour: int, reason: str = 'startup') -> tuple[str, int]:
    bot = config.get('conversation', {}).get('persona', 'nova')
    lines = _lines_for(bot, reason=reason, hour=hour)
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
                 enabled: bool = True, startup_guard: StartupGreetingGuard | None = None,
                 timeout_seconds: float = DEFAULT_GREETING_TIMEOUT_SECONDS):
        self.generate = generate
        self.executor = executor
        self.send = send
        self.save_preferences = save_preferences
        self.enabled = enabled
        self.startup_guard = startup_guard or DEFAULT_STARTUP_GUARD
        self.timeout_seconds = max(0.1, float(timeout_seconds))
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
        if not self.enabled or reason not in {'startup', 'bot_switch', 'onboarding', 'idle_return'}:
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
        text, rotation_index = choose_greeting(config, hour=selected_hour, reason=reason)
        tts_config = copy.deepcopy(config['tts'])

        def still_current() -> bool:
            return generation == self._generation and config.get('conversation', {}).get('persona') == bot_id

        async def run() -> None:
            try:
                if not still_current():
                    return
                loop = asyncio.get_running_loop()
                future = loop.run_in_executor(self.executor, self.generate, text, tts_config)
                wav = await asyncio.wait_for(asyncio.shield(future), timeout=self.timeout_seconds)
                if not still_current():
                    return
                await self.send('greeting', operation_id=operation_id, text=text,
                                audio=base64.b64encode(wav).decode())
                if not still_current():
                    return
                indexes = config.setdefault('_greetingIndexes', {})
                indexes[bot_id] = rotation_index + 1
                self.save_preferences(config)
            except asyncio.TimeoutError:
                log.warning('Greeting synthesis timed out after %.1fs; continuing without automatic speech.', self.timeout_seconds)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
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
