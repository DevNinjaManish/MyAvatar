"""Small session controller used by the Rivet WebSocket edit workflow."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from backend.core.coding_verify import verify_edit
from backend.core.edit_session import EditSession
from backend.core.patch_proposal import parse_patch_proposal


class CodingEditController:
    def __init__(self, root: Path | str = '.'):
        self.session = EditSession(root=root)
        self._repair_rounds: dict[str, int] = {}

    @property
    def root(self) -> Path:
        return self.session.root

    def workspace(self) -> dict[str, Any]:
        return self.session.workspace()

    def preview(self, model_answer: str, *, repair_round: int = 0) -> dict[str, Any] | None:
        try:
            proposal = parse_patch_proposal(model_answer)
        except ValueError:
            return None
        transaction = self.session.create(model_answer)
        self._repair_rounds[transaction['id']] = max(0, int(repair_round))
        transaction['repairRound'] = self._repair_rounds[transaction['id']]
        return {
            'transaction': transaction,
            'diff': proposal['diff'],
            'workspace': self.workspace(),
        }

    def repair_round(self, transaction_id: str) -> int:
        return self._repair_rounds.get(transaction_id, 0)

    def decide(self, transaction_id: str, decision: str) -> dict[str, Any]:
        repair_round = self.repair_round(transaction_id)
        if decision == 'approve':
            result = self.session.apply(transaction_id)
            result['repairRound'] = repair_round
            verification = self.verify_last(transaction_id)
            message = 'Rivet applied the approved code change.'
            if verification['status'] == 'passed':
                message += ' Verification passed.'
            elif verification['status'] == 'failed':
                message += ' Verification found issues; the edit remains applied and can be rolled back.'
            else:
                message += ' No safe automatic verification is configured for these files.'
            return {'result': result, 'verification': verification, 'message': message, 'repairRound': repair_round}
        if decision == 'reject':
            result = self.session.reject_pending(tx_id=transaction_id)
            if result is None:
                raise ValueError('No pending edit is available to reject.')
            result['repairRound'] = repair_round
            return {'result': result, 'message': 'Code change rejected. No files were modified.', 'repairRound': repair_round}
        raise ValueError('Unknown coding edit decision.')

    def verify_last(self, transaction_id: str) -> dict[str, Any]:
        tx = self.session.last_applied
        if tx is None or tx.id != transaction_id:
            raise ValueError('No matching applied edit is available to verify.')
        return verify_edit(tx.files, root=self.root)

    def last_applied_files(self, transaction_id: str) -> list[dict[str, Any]]:
        tx = self.session.last_applied
        if tx is None or tx.id != transaction_id:
            raise ValueError('No matching applied edit is available for repair.')
        return list(tx.files)

    def rollback(self, transaction_id: str) -> dict[str, Any]:
        result = self.session.rollback(transaction_id)
        return {'result': result, 'message': 'Rivet rolled back the previous code change.'}

    def set_workspace(self, path: str) -> dict[str, Any]:
        self._repair_rounds.clear()
        return self.session.set_workspace(path)
