"""Small Ollama-backed coding specialist with bounded local tool orchestration."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

from backend.core.coding_agent import run_coding_agent
from backend.core.workspace import AGENT_MARKER


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


async def _chat(messages: list[dict[str, str]], config: dict[str, Any]) -> str:
    """Perform one raw local coding-model chat turn."""
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


def _agent_request(messages: list[dict[str, str]]) -> tuple[str, Path] | None:
    """Extract trusted orchestration metadata authored by the local backend."""
    for message in messages[:3]:
        content = message.get('content', '') if isinstance(message, dict) else ''
        if not isinstance(content, str) or not content.startswith(AGENT_MARKER):
            continue
        try:
            payload = json.loads(content[len(AGENT_MARKER):])
        except json.JSONDecodeError:
            return None
        request = payload.get('request')
        root = payload.get('root')
        if not isinstance(request, str) or not request.strip() or not isinstance(root, str) or not root.strip():
            return None
        resolved = Path(root).expanduser().resolve()
        if not resolved.is_dir():
            return None
        return request.strip(), resolved
    return None


async def inspect(messages: list[dict[str, str]], config: dict[str, Any], *, on_activity=None) -> str:
    """Inspect context, streaming bounded read-only tool activity when available."""
    agent = _agent_request(messages)
    if agent is None:
        return await _chat(messages, config)

    request, root = agent
    result = await run_coding_agent(request, config, _chat, root=root, on_activity=on_activity)
    plan = result['plan']
    tools = result.get('tools') or []
    if tools:
        trail = ' -> '.join(tools)
        return f"{plan}\n\nInspection trail: {trail}"
    return plan
