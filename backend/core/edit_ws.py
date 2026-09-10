"""Small session controller used by the Rivet WebSocket edit workflow."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.core.edit_session import EditSession
from backend.core.patch_proposal import parse_patch_proposal


class CodingEditController:
    def __init__(self, root: Path | str = '.'):
        self.session = EditSession(root=root)

    @property
    def root(self) -> Path:
        return self.session.root

    def workspace(self) -> dict[str, Any]:
        return self.session.workspace()

    def preview(self, model_answer: str) -> dict[str, Any] | None:
        try:
            proposal = parse_patch_proposal(model_answer)
        except ValueError:
            return None
        transaction = self.session.create(model_answer)
        return {
            'transaction': transaction,
            'diff': proposal['diff'],
            'workspace': self.workspace(),
        }

    def decide(self, transaction_id: str, decision: str) -> dict[str, Any]:
        if decision == 'approve':
            result = self.session.apply(transaction_id)
            return {'result': result, 'message': 'Rivet applied the approved code change.'}
        if decision == 'reject':
            result = self.session.reject_pending(tx_id=transaction_id)
            if result is None:
                raise ValueError('No pending edit is available to reject.')
            return {'result': result, 'message': 'Code change rejected. No files were modified.'}
        raise ValueError('Unknown coding edit decision.')

    def rollback(self, transaction_id: str) -> dict[str, Any]:
        result = self.session.rollback(transaction_id)
        return {'result': result, 'message': 'Rivet rolled back the previous code change.'}

    def set_workspace(self, path: str) -> dict[str, Any]:
        return self.session.set_workspace(path)
