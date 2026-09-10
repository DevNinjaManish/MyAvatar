import unittest

from backend.core.agent_state import AgentOutcome, AgentPhase, AgentTask
from backend.core.capabilities import can_use, capabilities_for_bot, get_capability
from backend.core.verification import VerificationSummary


class AgentFoundationTests(unittest.TestCase):
    def test_task_lifecycle_is_bounded_and_public_summary_has_no_transcript(self):
        task = AgentTask.create('robot', 'Fix the failing tests', [('context', 'Inspect context'), ('verify', 'Run verification')])
        self.assertEqual(task.phase, AgentPhase.UNDERSTANDING)
        task.set_context(['backend/core/app.py']).set_phase(AgentPhase.CONTEXT)
        task.update_step('context', 'complete').set_phase(AgentPhase.PLANNING)
        task.block('Approval is required before applying the patch.')
        public = task.public()
        self.assertEqual(public['phase'], 'BLOCKED')
        self.assertEqual(public['status'], AgentOutcome.BLOCKED.value)
        self.assertNotIn('transcript', public)
        self.assertLessEqual(len(public['contextRefs']), 8)

    def test_cancel_and_complete_update_steps(self):
        task = AgentTask.create('nova', 'Plan my day', [('plan', 'Prepare a plan')])
        task.update_step('plan', 'active').cancel()
        self.assertEqual(task.phase, AgentPhase.CANCELLED)
        task = AgentTask.create('luma', 'Review this design', [('plan', 'Prepare recommendations')])
        task.complete('Recommendations ready')
        self.assertEqual(task.phase, AgentPhase.COMPLETE)
        self.assertEqual(task.steps[0].status, 'complete')

    def test_capabilities_are_isolated_and_descriptors_are_inert(self):
        self.assertIn('repository.read', capabilities_for_bot('robot'))
        self.assertEqual(capabilities_for_bot('nova'), ())
        self.assertFalse(can_use('nova', 'coding.edit'))
        self.assertIsNone(get_capability('robot', 'coding.edit').handler)
        with self.assertRaises(PermissionError):
            get_capability('nova', 'coding.edit')

    def test_verification_contract_preserves_specialist_checks(self):
        summary = VerificationSummary.from_result({'status': 'failed', 'ok': False, 'checks': [{'id': 'tests', 'ok': False}], 'message': 'Issues found.'})
        self.assertEqual(summary.public(), {'status': 'failed', 'ok': False, 'checks': [{'id': 'tests', 'ok': False}], 'message': 'Issues found.'})


if __name__ == '__main__':
    unittest.main()
