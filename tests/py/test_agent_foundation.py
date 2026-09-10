import unittest

from backend.core.agent_state import AgentOutcome, AgentPhase, AgentTask
from backend.core.capabilities import can_use, capabilities_for_bot, get_capability, profile_for_bot
from backend.core.skills import skills_for_bot
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
        task.record_observation('Context was gathered.')
        self.assertEqual(task.public()['observation'], 'Context was gathered.')
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
        for bot_id in ('nova', 'butler', 'pixel', 'luma'):
            self.assertEqual(capabilities_for_bot(bot_id), ())
            self.assertFalse(can_use(bot_id, 'coding.edit'))
        self.assertIsNone(get_capability('robot', 'coding.edit').handler)
        with self.assertRaises(PermissionError):
            get_capability('nova', 'coding.edit')

    def test_profiles_separate_capabilities_from_inert_specialist_skills(self):
        rivet = profile_for_bot('robot')
        nova = profile_for_bot('nova')
        pixel = profile_for_bot('pixel')
        self.assertEqual(rivet['label'], 'Rivet')
        self.assertEqual({item['id'] for item in rivet['capabilities']}, set(capabilities_for_bot('robot')))
        self.assertTrue(all(item['requiresApproval'] is False for item in rivet['capabilities'][:2]))
        self.assertEqual(nova['capabilities'], [])
        self.assertEqual([item.id for item in skills_for_bot('pixel')], ['marketing.message'])
        self.assertEqual(pixel['capabilities'], [])
        self.assertNotIn('handler', rivet['capabilities'][0])

    def test_verification_contract_preserves_specialist_checks(self):
        summary = VerificationSummary.from_result({'status': 'failed', 'ok': False, 'checks': [{'id': 'tests', 'ok': False}], 'message': 'Issues found.'})
        self.assertEqual(summary.public(), {'status': 'failed', 'ok': False, 'checks': [{'id': 'tests', 'ok': False}], 'message': 'Issues found.'})

    def test_recovery_outcome_is_distinct_from_success(self):
        task = AgentTask.create('robot', 'Repair the failed check')
        task.needs_approval('One bounded repair is available.').offer_recovery('One bounded repair attempt is available for approval.')
        self.assertEqual(task.status, AgentOutcome.NEEDS_APPROVAL.value)
        self.assertEqual(task.phase, AgentPhase.NEEDS_APPROVAL)
        self.assertEqual(task.public()['recovery'], {'available': True, 'label': 'One bounded repair attempt is available for approval.'})
        task.begin_action()
        self.assertEqual(task.phase, AgentPhase.WORKING)
        self.assertEqual(task.status, 'active')
        task.complete('Verification passed.')
        self.assertIsNone(task.public()['recovery'])


if __name__ == '__main__':
    unittest.main()
