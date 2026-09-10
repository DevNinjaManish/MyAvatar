import asyncio
import base64
import importlib
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend.core.approvals import request_approval, resolve_approval

server = importlib.import_module('backend.core.app')


class ApprovalGate(unittest.IsolatedAsyncioTestCase):
    async def test_unpredictable_ids_and_exact_allow_once(self):
        pending = {}; seen = []
        async def notify(request_id):
            seen.append(request_id)
            self.assertRegex(request_id, r'^[0-9a-f]{24}$')
            self.assertTrue(resolve_approval(pending, request_id, 'allow_once'))
            self.assertFalse(resolve_approval(pending, request_id, 'allow_once'))
        for _ in range(10):
            request_id, allowed = await request_approval(pending, {'kind': 'set_volume'}, notify)
            self.assertTrue(allowed)
            self.assertEqual(pending, {})
        self.assertEqual(len(set(seen)), 10)

    async def test_deny_is_not_permission(self):
        pending = {}
        async def notify(request_id):
            resolve_approval(pending, request_id, 'deny')
        _, allowed = await request_approval(pending, {}, notify)
        self.assertFalse(allowed)
        self.assertFalse(pending)

    async def test_timeout_revokes_request_and_rejects_late_approval(self):
        pending = {}; seen = []
        async def notify(request_id):
            seen.append(request_id)
        _, allowed = await request_approval(pending, {}, notify, timeout=.01)
        self.assertFalse(allowed)
        self.assertEqual(pending, {})
        self.assertFalse(resolve_approval(pending, seen[0], 'allow_once'))

    async def test_cancellation_cleans_up_future_and_request(self):
        pending = {}; ready = asyncio.Event(); held = []
        async def notify(request_id):
            held.append(pending[request_id][0]); ready.set()
        task = asyncio.create_task(request_approval(pending, {}, notify))
        await asyncio.wait_for(ready.wait(), 1)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(pending, {})
        self.assertTrue(held[0].cancelled())

    async def test_notification_failure_cleans_up(self):
        pending = {}; held = []
        async def fail(request_id):
            held.append(pending[request_id][0])
            raise ConnectionError('closed')
        with self.assertRaises(ConnectionError):
            await request_approval(pending, {}, fail)
        self.assertEqual(pending, {})
        self.assertTrue(held[0].cancelled())

    async def test_invalid_and_forged_decisions_leave_real_request_pending(self):
        pending = {}
        async def notify(request_id):
            for bad in (None, [], {}, True, 123, 'forged'):
                self.assertFalse(resolve_approval(pending, bad, 'allow_once'))
            for decision in (None, [], {}, 'yes', True, 'approved'):
                self.assertFalse(resolve_approval(pending, request_id, decision))
            self.assertFalse(pending[request_id][0].done())
            resolve_approval(pending, request_id, 'deny')
        self.assertFalse((await request_approval(pending, {}, notify))[1])


class ActionIntegration(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.prefs = Path(self.directory.name) / 'settings.json'
        self.prefs.write_text(json.dumps({'persona': 'robot', 'memoryEnabled': False}))
        for manager in (patch.object(server, 'PREFERENCES_PATH', self.prefs),
                        patch.object(server, 'warm_task', None),
                        patch.dict(os.environ, {'MYAVATAR_TOKEN': 'development', 'MYAVATAR_WARMUP': '0'}),
                        patch.object(server.speech, 'generate', return_value=b'RIFFtest')):
            manager.start(); self.addCleanup(manager.stop)
        async def fake_stream(messages, config):
            if messages[-1]['content'] == 'action':
                yield "[action: set_volume(25)] "
                yield 'Volume request handled.'
            else:
                yield 'New conversation turn.'
        manager = patch.object(server, 'stream', fake_stream)
        manager.start(); self.addCleanup(manager.stop)
        self.executor_patch = patch.object(server, 'run_action', return_value=True)
        self.execute = self.executor_patch.start(); self.addCleanup(self.executor_patch.stop)

    def read_until(self, ws, target):
        events = []
        for _ in range(40):
            event = ws.receive_json(); events.append(event)
            self.assertNotEqual(event['type'], 'error', event)
            if event['type'] == target:
                return events
        self.fail(f'No {target} event')

    def connect(self, ws):
        self.assertEqual(ws.receive_json()['type'], 'config')
        workspace = ws.receive_json()
        self.assertEqual(workspace['type'], 'coding_workspace')
        self.assertTrue(workspace['workspace']['path'])
        self.assertEqual(ws.receive_json()['type'], 'ready')

    def test_action_requires_actual_approval_then_executes_once(self):
        with TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
            self.connect(ws)
            ws.send_json({'type': 'turn', 'turn': 1, 'text': 'action'})
            event = self.read_until(ws, 'action_request')[-1]
            request_id = event['requestId']
            self.assertRegex(request_id, r'^[0-9a-f]{24}$')
            self.execute.assert_not_called()
            ws.send_json({'type': 'action_decision', 'requestId': request_id, 'decision': 'allow_once'})
            events = self.read_until(ws, 'done')
            self.assertTrue(next(e for e in events if e['type'] == 'action_result')['ok'])
            ws.send_json({'type': 'action_decision', 'requestId': request_id, 'decision': 'allow_once'})
            ws.send_json({'type': 'turn', 'turn': 2, 'text': 'barrier'})
            self.read_until(ws, 'done')
            self.execute.assert_called_once_with({'kind': 'set_volume', 'value': 25})

    def test_denial_and_malformed_request_ids_never_execute(self):
        with TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
            self.connect(ws)
            ws.send_json({'type': 'turn', 'turn': 1, 'text': 'action'})
            request = self.read_until(ws, 'action_request')[-1]
            for bad in ([], {}, 'forged'):
                ws.send_json({'type': 'action_decision', 'requestId': bad, 'decision': 'allow_once'})
            ws.send_json({'type': 'action_decision', 'requestId': request['requestId'], 'decision': 'deny'})
            events = self.read_until(ws, 'done')
            self.assertTrue(next(e for e in events if e['type'] == 'action_result')['denied'])
            self.execute.assert_not_called()

    def test_stop_revokes_pending_action_even_if_approval_arrives_late(self):
        with TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
            self.connect(ws)
            ws.send_json({'type': 'turn', 'turn': 1, 'text': 'action'})
            request = self.read_until(ws, 'action_request')[-1]
            ws.send_json({'type': 'stop'})
            ws.send_json({'type': 'action_decision', 'requestId': request['requestId'], 'decision': 'allow_once'})
            ws.send_json({'type': 'turn', 'turn': 2, 'text': 'next'})
            events = self.read_until(ws, 'done')
            self.assertTrue(all(e.get('turn') != 1 for e in events))
            self.execute.assert_not_called()

    def test_action_failure_is_reported_not_success(self):
        self.execute.return_value = False
        with TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
            self.connect(ws)
            ws.send_json({'type': 'turn', 'turn': 1, 'text': 'action'})
            request = self.read_until(ws, 'action_request')[-1]
            ws.send_json({'type': 'action_decision', 'requestId': request['requestId'], 'decision': 'allow_once'})
            result = next(e for e in self.read_until(ws, 'done') if e['type'] == 'action_result')
            self.assertFalse(result['ok'])

    def test_screen_content_cannot_request_mac_action(self):
        with TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
            self.connect(ws)
            ws.send_json({'type': 'turn', 'turn': 1, 'text': 'action', 'image': base64.b64encode(b'fixture').decode()})
            events = self.read_until(ws, 'done')
            self.assertNotIn('action_request', [e['type'] for e in events])
            self.execute.assert_not_called()

    def test_bad_preferences_still_deliver_resolved_startup_config(self):
        self.prefs.write_text('{bad')
        with self.assertLogs('avatar.settings', 'WARNING'), TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
            config = ws.receive_json()['config']
            self.assertEqual(config['performanceProfile'], 'low')
            self.assertEqual(config['llm']['model'], 'huihui_ai/qwen3.5-abliterated:0.8b')
            self.assertEqual(ws.receive_json()['type'], 'coding_workspace')
            self.assertEqual(ws.receive_json()['type'], 'ready')

    def test_failed_preference_save_does_not_break_bot_switch(self):
        with patch('backend.core.settings.os.replace', side_effect=OSError('disk full')), self.assertLogs('avatar.settings', 'WARNING'):
            with TestClient(server.app) as client, client.websocket_connect('/ws?token=development') as ws:
                self.connect(ws)
                ws.send_json({'type': 'bot', 'bot': 'luma'})
                config = ws.receive_json()['config']
                self.assertEqual(config['conversation']['persona'], 'luma')
                self.assertEqual(ws.receive_json()['type'], 'bot_history')
                ws.send_json({'type': 'turn', 'turn': 1, 'text': 'next'})
                self.read_until(ws, 'done')
