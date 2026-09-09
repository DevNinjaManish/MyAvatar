import unittest

from backend.runtime import RuntimeSession, RUNTIME_EVENT_VERSION


class RuntimeEvents(unittest.TestCase):
    def test_events_include_stable_session_bot_and_monotonic_sequence(self):
        runtime = RuntimeSession('nova', session_id='session-test')
        first = runtime.event('config')
        second = runtime.event('ready')
        self.assertEqual(first['runtimeVersion'], RUNTIME_EVENT_VERSION)
        self.assertEqual(first['sessionId'], 'session-test')
        self.assertEqual(first['botId'], 'nova')
        self.assertEqual([first['sequence'], second['sequence']], [1, 2])

    def test_switch_changes_future_identity_without_changing_session(self):
        runtime = RuntimeSession('nova', session_id='same-session')
        runtime.event('ready')
        runtime.switch_bot('robot')
        event = runtime.event('config', turn=3, operation_id='op-1')
        self.assertEqual(event['sessionId'], 'same-session')
        self.assertEqual(event['botId'], 'robot')
        self.assertEqual(event['turn'], 3)
        self.assertEqual(event['operationId'], 'op-1')
        self.assertEqual(event['sequence'], 2)

    def test_invalid_identity_or_event_type_is_rejected(self):
        with self.assertRaises(ValueError):
            RuntimeSession('')
        runtime = RuntimeSession('nova')
        with self.assertRaises(ValueError):
            runtime.switch_bot('')
        with self.assertRaises(ValueError):
            runtime.event('')


if __name__ == '__main__':
    unittest.main()
