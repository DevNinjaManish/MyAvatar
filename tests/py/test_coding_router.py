import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.core.app import app, engine_readiness
from backend.core.coding_router import looks_like_coding_request


class CodingIntentTests(unittest.TestCase):
    def test_clear_coding_requests_route(self):
        self.assertTrue(looks_like_coding_request('Figure out why the widget animation code is broken'))
        self.assertTrue(looks_like_coding_request('Review backend/core/app.py'))
        self.assertTrue(looks_like_coding_request('Fix the websocket error in the backend'))

    def test_ordinary_chat_does_not_route(self):
        self.assertFalse(looks_like_coding_request('Hello Rivet, how are you?'))
        self.assertFalse(looks_like_coding_request('Tell me a joke'))
        self.assertFalse(looks_like_coding_request('What should I do today?'))


class AutomaticCodingTurnTests(unittest.TestCase):
    def test_normal_rivet_turn_uses_workspace_planner_and_voice(self):
        async def ready(_config):
            return None

        async def inspect(_messages, _config, on_activity=None):
            if on_activity:
                await on_activity({'type': 'tool', 'label': 'Inspected selected repository context.', 'refs': ['src/widget.js'], 'tool': 'repository'})
            return 'Change the animation state guard and add a regression test.'

        engine_readiness.reset(deferred=True)
        with patch('backend.core.app.coding_check_ready', ready), \
             patch('backend.core.app.choose_context', return_value=[{'path': 'src/widget.js', 'content': 'function animate() {}'}]), \
             patch('backend.core.app.inspect_code', inspect), \
             patch('backend.core.app.speech.generate', return_value=b'RIFFfake'), \
             TestClient(app) as client, client.websocket_connect('/ws?token=development') as ws:
            while ws.receive_json()['type'] != 'ready':
                pass
            ws.send_json({'type': 'bot', 'bot': 'robot'})
            while ws.receive_json()['type'] != 'bot_history':
                pass
            ws.send_json({'type': 'turn', 'turn': 21, 'text': 'Figure out why the widget animation code is broken'})
            events = []
            for _ in range(20):
                event = ws.receive_json()
                events.append(event)
                if event['type'] in ('done', 'error'):
                    break
            kinds = [event['type'] for event in events]
            self.assertEqual(events[-1]['type'], 'done')
            self.assertIn('transcript', kinds)
            self.assertIn('coding_preparing', kinds)
            self.assertIn('coding_context', kinds)
            self.assertIn('coding_activity', kinds)
            self.assertIn('token', kinds)
            self.assertIn('audio', kinds)
            context = next(event for event in events if event['type'] == 'coding_context')
            self.assertTrue(context['automatic'])
            self.assertEqual(context['paths'], ['src/widget.js'])

    def test_noncoding_rivet_turn_stays_on_normal_chat_path(self):
        async def chat_stream(_messages, _config):
            yield 'All systems nominal.'

        engine_readiness.reset(deferred=True)
        with patch('backend.core.app.stream', chat_stream), \
             patch('backend.core.app.choose_context') as choose, \
             patch('backend.core.app.speech.generate', return_value=b'RIFFfake'), \
             TestClient(app) as client, client.websocket_connect('/ws?token=development') as ws:
            while ws.receive_json()['type'] != 'ready':
                pass
            ws.send_json({'type': 'bot', 'bot': 'robot'})
            while ws.receive_json()['type'] != 'bot_history':
                pass
            ws.send_json({'type': 'turn', 'turn': 22, 'text': 'Hello Rivet, how are you?'})
            kinds = []
            for _ in range(20):
                event = ws.receive_json()
                kinds.append(event['type'])
                if event['type'] in ('done', 'error'):
                    break
            self.assertEqual(kinds[-1], 'done')
            self.assertNotIn('coding_context', kinds)
            choose.assert_not_called()


if __name__ == '__main__':
    unittest.main()
