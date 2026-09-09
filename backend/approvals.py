"""The existing allow-once Mac action gate; not a general agent executor."""
from __future__ import annotations

import asyncio
import secrets
from collections.abc import Awaitable, Callable
from typing import Any


async def request_approval(pending: dict, action: dict, notify: Callable[[str], Awaitable[None]],
                           timeout: float = 45) -> tuple[str, bool]:
    request_id = secrets.token_hex(12)
    future = asyncio.get_running_loop().create_future()
    pending[request_id] = (future, action)
    try:
        await notify(request_id)
        try:
            allowed = await asyncio.wait_for(future, timeout)
        except asyncio.TimeoutError:
            allowed = False
        return request_id, allowed is True
    finally:
        # Covers timeout, rejected request, disconnected notification and cancellation.
        pending.pop(request_id, None)
        if not future.done():
            future.cancel()


def resolve_approval(pending: dict, request_id: Any, decision: Any) -> bool:
    if not isinstance(request_id, str) or decision not in ('allow_once', 'deny'):
        return False
    entry = pending.get(request_id)
    if entry is None or entry[0].done():
        return False
    entry[0].set_result(decision == 'allow_once')
    return True
