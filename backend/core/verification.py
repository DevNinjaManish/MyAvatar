"""Shared verification result contract with specialist-specific evidence intact."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class VerificationSummary:
    status: str
    ok: bool | None
    checks: list[dict[str, Any]] = field(default_factory=list)
    message: str = ''

    @classmethod
    def from_result(cls, result: dict[str, Any] | None) -> 'VerificationSummary':
        result = result or {}
        return cls(str(result.get('status') or 'not_available'), result.get('ok'), list(result.get('checks') or []), str(result.get('message') or ''))

    def public(self) -> dict[str, Any]:
        return {'status': self.status, 'ok': self.ok, 'checks': self.checks[:8], 'message': self.message}
