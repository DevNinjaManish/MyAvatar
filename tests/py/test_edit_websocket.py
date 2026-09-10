import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.core.app import app,engine_readiness


class EditWebSocketTests(unittest.TestCase):
    def _until(self,ws,kind,limit=30):
        events=[]
        for _ in range(limit):
            event=ws.receive_json();events.append(event)
            if event['type']==kind:return event,events
        self.fail(f'event {kind} not received: {[e["type"] for e in events]}')

    def _until_message(self,ws,kind,needle,limit=30):
        events=[]
        for _ in range(limit):
            event=ws.receive_json();events.append(event)
            if event['type']==kind and needle in str(event.get('message','')):return event,events
        self.fail(f'{kind} containing {needle!r} not received: {[(e["type"],e.get("message")) for e in events]}')

    def test_patch_preview_approval_apply_and_rollback(self):
        async def ready(_config):return None
        async def inspect(_messages,_config):
            return 'I would update demo.py.\n```diff\n--- a/demo.py\n+++ b/demo.py\n@@ -1 +1 @@\n-old = 1\n+old = 2\n```'
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);target=root/'demo.py';target.write_text('old = 1\n',encoding='utf-8')
            engine_readiness.reset(deferred=True)
            with patch('backend.core.app.coding_check_ready',ready),\
                 patch('backend.core.app.choose_context',return_value=[{'path':'demo.py','content':'old = 1\n'}]),\
                 patch('backend.core.app.inspect_code',inspect),\
                 patch('backend.core.app.speech.generate',return_value=b'RIFFfake'),\
                 TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                self._until(ws,'ready')
                ws.send_json({'type':'bot','bot':'robot'});self._until(ws,'bot_history')
                ws.send_json({'type':'coding_workspace','path':str(root)});workspace,_=self._until(ws,'coding_workspace')
                self.assertEqual(workspace['workspace']['path'],str(root.resolve()))
                ws.send_json({'type':'turn','turn':41,'text':'Fix the code in demo.py'})
                patch_event,events=self._until(ws,'coding_patch')
                self.assertEqual(patch_event['transaction']['files'][0]['path'],'demo.py')
                self.assertEqual(target.read_text(encoding='utf-8'),'old = 1\n')
                tx_id=patch_event['transaction']['id']
                if not any(e['type']=='done' for e in events):self._until(ws,'done')
                ws.send_json({'type':'coding_edit_decision','transactionId':tx_id,'decision':'approve','turn':41})
                applied,_=self._until(ws,'coding_edit_result')
                self.assertFalse(applied.get('error',False))
                self.assertTrue(applied['result']['rollbackAvailable'])
                self.assertEqual(target.read_text(encoding='utf-8'),'old = 2\n')
                ws.send_json({'type':'coding_rollback','transactionId':tx_id,'turn':41})
                rolled,_=self._until_message(ws,'coding_edit_result','rolled back')
                self.assertIn('rolled back',rolled['message'])
                self.assertEqual(target.read_text(encoding='utf-8'),'old = 1\n')

    def test_reject_and_duplicate_approval_do_not_write(self):
        async def ready(_config):return None
        async def inspect(_messages,_config):
            return '```diff\n--- a/demo.py\n+++ b/demo.py\n@@ -1 +1 @@\n-old = 1\n+old = 2\n```'
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);target=root/'demo.py';target.write_text('old = 1\n',encoding='utf-8')
            engine_readiness.reset(deferred=True)
            with patch('backend.core.app.coding_check_ready',ready),patch('backend.core.app.choose_context',return_value=[{'path':'demo.py','content':'old = 1\n'}]),patch('backend.core.app.inspect_code',inspect),patch('backend.core.app.speech.generate',return_value=b'RIFFfake'),TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                self._until(ws,'ready');ws.send_json({'type':'bot','bot':'robot'});self._until(ws,'bot_history')
                ws.send_json({'type':'coding_workspace','path':str(root)});self._until(ws,'coding_workspace')
                ws.send_json({'type':'turn','turn':42,'text':'Fix demo.py code'});patch_event,_=self._until(ws,'coding_patch');tx=patch_event['transaction']['id'];self._until(ws,'done')
                ws.send_json({'type':'coding_edit_decision','transactionId':tx,'decision':'reject','turn':42});self._until(ws,'coding_edit_result')
                self.assertEqual(target.read_text(encoding='utf-8'),'old = 1\n')
                ws.send_json({'type':'coding_edit_decision','transactionId':tx,'decision':'approve','turn':42});duplicate,_=self._until(ws,'coding_edit_result')
                self.assertTrue(duplicate['error'])
                self.assertEqual(target.read_text(encoding='utf-8'),'old = 1\n')


if __name__=='__main__':unittest.main()
