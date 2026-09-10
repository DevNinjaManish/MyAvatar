"""Session-scoped orchestration for approved Rivet edit transactions."""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from backend.core.edit_transaction import EditTransaction, apply_transaction, create_transaction, rollback_transaction

TRANSACTION_TTL_SECONDS = 10 * 60


class EditSession:
    def __init__(self, *, root: Path | str = '.', ttl_seconds: int = TRANSACTION_TTL_SECONDS):
        self.root = self._resolve_root(root)
        self.ttl_seconds = max(30, int(ttl_seconds))
        self.pending: EditTransaction | None = None
        self.pending_created_at: float | None = None
        self.last_applied: EditTransaction | None = None

    @staticmethod
    def _resolve_root(root: Path | str) -> Path:
        if not isinstance(root, (str, Path)) or not str(root).strip():
            raise ValueError('A workspace folder is required.')
        resolved = Path(root).expanduser().resolve()
        if not resolved.is_dir():
            raise ValueError('Selected workspace does not exist or is not a folder.')
        return resolved

    def workspace(self) -> dict[str, Any]:
        return {'path': str(self.root), 'name': self.root.name or str(self.root)}

    def set_workspace(self, root: Path | str) -> dict[str, Any]:
        self.root = self._resolve_root(root)
        self.reject_pending(reason='workspace_changed')
        self.last_applied = None
        return self.workspace()

    def _expired(self, now: float | None = None) -> bool:
        if self.pending is None or self.pending_created_at is None:
            return False
        current = time.monotonic() if now is None else now
        return current - self.pending_created_at > self.ttl_seconds

    def expire_if_needed(self, *, now: float | None = None) -> bool:
        if not self._expired(now):
            return False
        self.pending.status = 'expired'
        self.pending = None
        self.pending_created_at = None
        return True

    def create(self, proposal_text: str) -> dict[str, Any]:
        self.reject_pending(reason='replaced')
        tx = create_transaction(proposal_text, root=self.root)
        self.pending = tx
        self.pending_created_at = time.monotonic()
        public = tx.public()
        public['expiresInSeconds'] = self.ttl_seconds
        return public

    def reject_pending(self, *, tx_id: str | None = None, reason: str = 'rejected') -> dict[str, Any] | None:
        if self.pending is None:
            return None
        if tx_id is not None and tx_id != self.pending.id:
            raise ValueError('Edit transaction is no longer current.')
        self.pending.status = reason
        public = self.pending.public()
        self.pending = None
        self.pending_created_at = None
        return public

    def apply(self, tx_id: str) -> dict[str, Any]:
        if self.expire_if_needed():
            raise ValueError('Edit approval expired. Ask Rivet to generate a fresh patch.')
        if self.pending is None or tx_id != self.pending.id:
            raise ValueError('Edit transaction is no longer current.')
        tx = self.pending
        result = apply_transaction(tx, approved=True)
        self.last_applied = tx
        self.pending = None
        self.pending_created_at = None
        return result

    def rollback(self, tx_id: str) -> dict[str, Any]:
        if self.last_applied is None or tx_id != self.last_applied.id:
            raise ValueError('No matching applied edit is available to roll back.')
        result = rollback_transaction(self.last_applied)
        self.last_applied = None
        return result
