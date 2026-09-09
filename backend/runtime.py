"""Small session/event contract for the local companion runtime.

This does not implement an agent scheduler. It gives every server event stable
session, companion and sequence identity so later reconnect/task work can reject
stale results without inferring identity from message text.
"""
from __future__ import annotations

import secrets
from typing import Any

RUNTIME_EVENT_VERSION = 1


class RuntimeSession:
    def __init__(self, bot_id: str, *, session_id: str | None = None):
        if not isinstance(bot_id, str) or not bot_id:
            raise ValueError('Runtime session requires a companion id.')
        self.session_id = session_id or secrets.token_hex(12)
        self.bot_id = bot_id
        self.sequence = 0

    def switch_bot(self, bot_id: str) -> None:
        if not isinstance(bot_id, str) or not bot_id:
            raise ValueError('Runtime session requires a companion id.')
        self.bot_id = bot_id

    def event(self, kind: str, *, turn: int | None = None,
              operation_id: str | None = None, **data: Any) -> dict[str, Any]:
        if not isinstance(kind, str) or not kind:
            raise ValueError('Runtime event requires a type.')
        self.sequence += 1
        event: dict[str, Any] = {
            'type': kind,
            'runtimeVersion': RUNTIME_EVENT_VERSION,
            'sessionId': self.session_id,
            'sequence': self.sequence,
            'botId': self.bot_id,
            'turn': turn,
            **data,
        }
        if operation_id is not None:
            event['operationId'] = operation_id
        return event
