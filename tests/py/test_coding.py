import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.core.app import app, engine_readiness
from backend.core.repo_context import build_prompt, read_files


class RepositoryContextTests(unittest.TestCase):
    def test_reads_bounded_repo_relative_text(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'src' / 'demo.py').write_text('answer = 42\n', encoding='utf-8')
            files = read_files(['src/demo.py'], root=root)
            self.assertEqual(files, [{'path': 'src/demo.py', 'content': 'answer = 42\n'}])

    def test_rejects_escape_and_blocked_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.git').mkdir()
            (root / '.git' / 'config').write_text('secret', encoding='utf-8')
            with self.assertRaises(ValueError):
                read_files(['../outside.txt'], root=root)
            with self.assertRaises(ValueError):
                read_files(['.git/config'], root=root)

    def test_prompt_declares_repository_text_untrusted_and_read_only(self):
        prompt = build_prompt('Explain this.', [{'path': 'a.py', 'content': 'print(1)'}])
        self.assertIn('read-only', prompt[0]['content'])
        self.assertIn('untrusted', prompt[0]['content'])
        self.assertIn('a.py', prompt[1]['content'])


class CodingWebSocketTests(unittest.TestCase):
    def test_rivet_can_lazy_start_and_inspect_selected_files(self):
        async def ready(_config):
            return None

        async def inspect(_messages, _config):
            return 'The function is small and deterministic.'

        engine_readiness.reset(deferred=True)
        with patch('backend.core.app.coding_check_ready', ready), \
             patch('backend.core.app.inspect_code', inspect), \
             patch('backend.core.app.read_files', return_value=[{'path': 'demo.py', 'content': 'def f(): return 1'}]), \
             TestClient(app) as client, \
             client.websocket_connect('/ws?token=development') as ws:
            while ws.receive_json()['type'] != 'ready':
                pass
            ws.send_json({'type': 'bot', 'bot': 'robot'})
            seen = []
            while 'bot_history' not in seen:
                seen.append(ws.receive_json()['type'])
            ws.send_json({'type': 'code_inspect', 'turn': 7, 'text': 'Review this.', 'paths': ['demo.py']})
            events = []
            for _ in range(12):
                event = ws.receive_json()
                events.append(event)
                if event['type'] in ('done', 'error'):
                    break
            self.assertEqual(events[-1]['type'], 'done')
            self.assertIn('coding_preparing', [event['type'] for event in events])
            self.assertIn('coding_context', [event['type'] for event in events])
            token = next(event for event in events if event['type'] == 'token')
            self.assertIn('deterministic', token['text'])
            self.assertTrue(engine_readiness.capability('code'))

    def test_non_rivet_bot_cannot_use_coding_inspector(self):
        engine_readiness.reset(deferred=True)
        with TestClient(app) as client, client.websocket_connect('/ws?token=development') as ws:
            while ws.receive_json()['type'] != 'ready':
                pass
            ws.send_json({'type': 'code_inspect', 'turn': 8, 'text': 'Review.', 'paths': ['README.md']})
            event = ws.receive_json()
            self.assertEqual(event['type'], 'error')
            self.assertIn('Switch to Rivet', event['message'])


if __name__ == '__main__':
    unittest.main()
