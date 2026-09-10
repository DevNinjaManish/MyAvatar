"""Conservative routing for Rivet's local coding workspace planner."""
from __future__ import annotations

import re

CODING_TERMS = {
    'bug', 'code', 'coding', 'compile', 'debug', 'function', 'method', 'class',
    'repo', 'repository', 'refactor', 'test', 'tests', 'typescript', 'javascript',
    'python', 'backend', 'frontend', 'api', 'websocket', 'component', 'module',
    'dependency', 'build', 'runtime', 'exception', 'stacktrace', 'error', 'crash',
    'implementation', 'implement', 'architecture', 'source', 'file', 'files',
}
ACTION_TERMS = {
    'add', 'change', 'check', 'create', 'debug', 'explain', 'figure', 'fix',
    'implement', 'improve', 'inspect', 'investigate', 'plan', 'refactor', 'review',
    'update', 'why',
}
TECH_PATTERNS = (
    r'\b[a-zA-Z0-9_.-]+\.(?:py|js|jsx|ts|tsx|json|html|css|cjs|mjs|yml|yaml|toml)\b',
    r'\b(?:def|class|function|import|export|async|await)\b',
    r'\b(?:npm|node|python|pytest|vite|electron|fastapi|ollama|git)\b',
)


def looks_like_coding_request(text: str) -> bool:
    """Route only clear coding/repository requests; ordinary Rivet chat stays chat."""
    if not isinstance(text, str):
        return False
    lowered = text.lower().strip()
    if len(lowered) < 3:
        return False
    words = set(re.findall(r"[a-zA-Z][a-zA-Z0-9_-]*", lowered))
    coding_hits = len(words & CODING_TERMS)
    action_hits = len(words & ACTION_TERMS)
    technical = any(re.search(pattern, text, re.IGNORECASE) for pattern in TECH_PATTERNS)
    if technical and action_hits:
        return True
    if coding_hits >= 2:
        return True
    return coding_hits >= 1 and action_hits >= 1
