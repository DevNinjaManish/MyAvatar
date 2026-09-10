"""Small Ollama-backed coding specialist for read-only inspection tasks."""
from __future__ import annotations

from typing import Any

import httpx


async def check_ready(config: dict[str, Any]) -> None:
    """Warm/check the configured local coding model without generating text."""
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            config['url'] + '/api/generate',
            json={
                'model': config['model'],
                'prompt': '',
                'stream': False,
                'think': False,
                'keep_alive': config.get('keepAlive', '10m'),
                'options': {'num_ctx': config.get('context', 4096)},
            },
        )
        if response.status_code == 404:
            raise RuntimeError('coding model missing')
        response.raise_for_status()


async def inspect(messages: list[dict[str, str]], config: dict[str, Any]) -> str:
    """Ask the local coding model to inspect supplied repository context."""
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            config['url'] + '/api/chat',
            json={
                'model': config['model'],
                'messages': messages,
                'stream': False,
                'think': False,
                'keep_alive': config.get('keepAlive', '10m'),
                'options': {
                    'num_ctx': config.get('context', 4096),
                    'num_predict': config.get('maxTokens', 512),
                    'temperature': config.get('temperature', 0.2),
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get('error'):
            raise RuntimeError(str(data['error']))
        answer = data.get('message', {}).get('content', '')
        if not isinstance(answer, str) or not answer.strip():
            raise RuntimeError('The coding model returned an empty reply.')
        return answer.strip()
