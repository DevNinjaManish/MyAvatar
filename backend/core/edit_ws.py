"""Small session controller used by the Rivet WebSocket edit workflow."""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

from backend.core.coding_verify import verify_edit
from backend.core.edit_session import EditSession
from backend.core.patch_proposal import parse_patch_proposal


class CodingEditController:
    def __init__(self, root: Path | str = '.'):
        self.session = EditSession(root=root)
        self._repair_rounds: dict[str, int] = {}
        self._verification_cancel = threading.Event()
        self._last_verification: dict[str, Any] | None = None
        self._last_verification_tx: str | None = None

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
        return {'transaction': transaction, 'diff': proposal['diff'], 'workspace': self.workspace()}

    def pending_id(self) -> str | None:
        return self.session.pending.id if self.session.pending is not None else None

    def last_applied_id(self) -> str | None:
        return self.session.last_applied.id if self.session.last_applied is not None else None

    def repair_round(self, transaction_id: str) -> int:
        return self._repair_rounds.get(transaction_id, 0)

    def decide(self, transaction_id: str, decision: str, *, verify: bool = True) -> dict[str, Any]:
        repair_round = self.repair_round(transaction_id)
        if decision == 'approve':
            result = self.session.apply(transaction_id)
            result['repairRound'] = repair_round
            message = 'Rivet applied the approved code change.'
            payload: dict[str, Any] = {'result': result, 'message': message, 'repairRound': repair_round}
            if verify:
                verification = self.verify_last(transaction_id)
                payload['verification'] = verification
                if verification['status'] == 'passed':payload['message'] += ' Verification passed.'
                elif verification['status'] == 'failed':payload['message'] += ' Verification found issues; the edit remains applied and can be rolled back.'
                elif verification['status'] == 'cancelled':payload['message'] += ' Verification was stopped.'
                else:payload['message'] += ' No safe automatic verification is configured for these files.'
            return payload
        if decision == 'reject':
            result = self.session.reject_pending(tx_id=transaction_id)
            if result is None:raise ValueError('No pending edit is available to reject.')
            result['repairRound'] = repair_round
            return {'result': result, 'message': 'Code change rejected. No files were modified.', 'repairRound': repair_round}
        raise ValueError('Unknown coding edit decision.')

    def verify_last(self, transaction_id: str) -> dict[str, Any]:
        tx = self.session.last_applied
        if tx is None or tx.id != transaction_id:raise ValueError('No matching applied edit is available to verify.')
        self._verification_cancel.clear()
        verification=verify_edit(tx.files,root=self.root,cancel_event=self._verification_cancel)
        self._last_verification=verification;self._last_verification_tx=transaction_id
        return verification

    def cancel_verification(self) -> None:
        self._verification_cancel.set()

    def last_verification(self, transaction_id: str | None = None) -> dict[str, Any] | None:
        if transaction_id is not None and transaction_id != self._last_verification_tx:return None
        return self._last_verification

    def last_applied_files(self, transaction_id: str) -> list[dict[str, Any]]:
        tx = self.session.last_applied
        if tx is None or tx.id != transaction_id:raise ValueError('No matching applied edit is available for repair.')
        return list(tx.files)

    def rollback(self, transaction_id: str) -> dict[str, Any]:
        self.cancel_verification()
        result = self.session.rollback(transaction_id)
        self._last_verification=None;self._last_verification_tx=None
        return {'result': result, 'message': 'Rivet rolled back the previous code change.'}

    def set_workspace(self, path: str) -> dict[str, Any]:
        self.cancel_verification();self._repair_rounds.clear();self._last_verification=None;self._last_verification_tx=None
        return self.session.set_workspace(path)
