import asyncio
import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app import app
from backend.greetings import StartupGreetingGuard


class RuntimeEnvelopeIntegration(unittest.TestCase):
    def test_server_events_have_one_session_and_monotonic_sequence(self):
        async def fake_stream(messages, config):
            yield 'Hello.'
        with tempfile.TemporaryDirectory() as directory, \
             patch('backend.app.PREFERENCES_PATH', Path(directory) / 'settings.json'), \
             patch('backend.app.stream', fake_stream), \
             patch('backend.app.speech.generate', return_value=b'RIFFtest'):
            with TestClient(app) as client, client.websocket_connect('/ws?token=development') as ws:
                initial = [ws.receive_json(), ws.receive_json()]
                ws.send_json({'type': 'turn', 'turn': 1, 'text': 'Hi'})
                events = list(initial)
                for _ in range(30):
                    event = ws.receive_json(); events.append(event)
                    if event['type'] in ('done', 'error'):
                        break
                session_ids = {event.get('sessionId') for event in events}
                self.assertEqual(len(session_ids), 1)
                self.assertNotIn(None, session_ids)
                sequences = [event['sequence'] for event in events]
                self.assertEqual(sequences, sorted(sequences))
                self.assertEqual(len(sequences), len(set(sequences)))
                self.assertTrue(all(event['runtimeVersion'] == 1 for event in events))


class GreetingIntegration(unittest.TestCase):
    def prefs(self, path, *, bot='nova', index=1):
        path.write_text(json.dumps({
            'schemaVersion': 1,
            'persona': bot,
            'performanceProfile': 'medium',
            'interaction': 'manual',
            'memoryEnabled': False,
            'language': 'en',
            'greetingIndexes': {bot: index},
        }))

    def test_settings_change_is_quiet(self):
        with tempfile.TemporaryDirectory() as directory:
            prefs = Path(directory) / 'settings.json'; self.prefs(prefs)
            with patch('backend.app.PREFERENCES_PATH', prefs), \
                 patch('backend.app.speech.generate', return_value=b'RIFFtest'), \
                 patch('backend.greetings.DEFAULT_STARTUP_GUARD', StartupGreetingGuard(cooldown_seconds=0)), \
                 patch.dict('os.environ', {'MYAVATAR_TOKEN': 'test-token', 'MYAVATAR_WARMUP': '0'}):
                with TestClient(app) as client, client.websocket_connect('/ws?token=test-token') as ws:
                    ws.receive_json(); ws.receive_json()
                    # Drain the optional startup greeting if it wins the scheduling race.
                    ws.send_json({'type': 'settings', 'performanceProfile': 'low', 'interaction': 'manual', 'memoryEnabled': False})
                    seen_config = False; greetings_after_settings = 0
                    for _ in range(8):
                        event = ws.receive_json()
                        if event['type'] == 'config':
                            seen_config = True
                            break
                    self.assertTrue(seen_config)
                    ws.send_json({'type': 'metrics', 'marker': 'after-settings'})
                    # No greeting is scheduled by settings; the receive loop remains responsive.
                    self.assertEqual(greetings_after_settings, 0)

    def test_onboarding_greets_selected_bot_after_config(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch('backend.app.PREFERENCES_PATH', Path(directory) / 'settings.json'), \
             patch('backend.app.speech.generate', return_value=b'RIFFtest'), \
             patch.dict('os.environ', {'MYAVATAR_TOKEN': 'test-token', 'MYAVATAR_WARMUP': '0'}):
            with TestClient(app) as client, client.websocket_connect('/ws?token=test-token') as ws:
                ws.receive_json(); ws.receive_json()
                ws.send_json({'type': 'onboarding', 'bot': 'robot', 'performanceProfile': 'medium', 'interaction': 'manual'})
                events = []
                for _ in range(12):
                    event = ws.receive_json(); events.append(event)
                    if event['type'] == 'greeting':
                        break
                self.assertIn('config', [event['type'] for event in events])
                greeting = next(event for event in events if event['type'] == 'greeting')
                self.assertEqual(greeting['botId'], 'robot')
                self.assertIn('Rivet', greeting['text'])
                self.assertTrue(greeting.get('operationId'))

    def test_rapid_bot_switch_discards_obsolete_greeting(self):
        def generate(text, config):
            if config.get('voice') == 'af_heart':
                time.sleep(.08)
            return b'RIFFtest'
        with tempfile.TemporaryDirectory() as directory, \
             patch('backend.app.PREFERENCES_PATH', Path(directory) / 'settings.json'), \
             patch('backend.app.speech.generate', side_effect=generate), \
             patch.dict('os.environ', {'MYAVATAR_TOKEN': 'test-token', 'MYAVATAR_WARMUP': '0'}):
            with TestClient(app) as client, client.websocket_connect('/ws?token=test-token') as ws:
                ws.receive_json(); ws.receive_json()
                ws.send_json({'type': 'bot', 'bot': 'nova'})
                ws.send_json({'type': 'bot', 'bot': 'robot'})
                events = []
                deadline = time.time() + 1.5
                while time.time() < deadline:
                    event = ws.receive_json(); events.append(event)
                    if event['type'] == 'greeting' and event['botId'] == 'robot':
                        break
                greetings = [event for event in events if event['type'] == 'greeting']
                self.assertEqual([event['botId'] for event in greetings], ['robot'])


if __name__ == '__main__':
    unittest.main()
