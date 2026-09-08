import base64, unittest, asyncio, tempfile
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from backend.app import app

class Pipeline(unittest.TestCase):
    def test_rejects_wrong_token(self):
        with TestClient(app) as client:
            with self.assertRaises(WebSocketDisconnect):
                with client.websocket_connect('/ws?token=wrong'):pass

    def test_streams_transcript_emotion_audio_and_metrics(self):
        async def fake_stream(messages,config):
            for token in ['[ha','ppy] Hello. ','How are you?']:
                yield token
                await asyncio.sleep(.002)
        with patch('backend.app.stream',fake_stream),patch('backend.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                self.assertEqual(ws.receive_json()['type'],'config');self.assertEqual(ws.receive_json()['type'],'ready')
                ws.send_json({'type':'turn','turn':1,'text':'Hello'})
                events=[]
                for _ in range(30):
                    event=ws.receive_json();events.append(event)
                    if event['type'] in ('done','error'):break
                kinds=[e['type'] for e in events]
                self.assertNotIn('error',kinds)
                self.assertIn('first_token',kinds)
                self.assertIn('audio',kinds)
                self.assertIn('metrics',kinds)
                self.assertEqual(next(e for e in events if e['type']=='emotion')['emotion'],'happy')
                self.assertEqual(kinds[-1],'done')

    def test_tts_failure_surfaces_without_deadlock(self):
        async def fake_stream(messages,config):
            for _ in range(20):yield 'Sentence. '
        with patch('backend.app.stream',fake_stream),patch('backend.app.speech.generate',side_effect=ValueError('bad voice')):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                ws.receive_json();ws.receive_json();ws.send_json({'type':'turn','turn':2,'text':'Hi'})
                for _ in range(50):
                    e=ws.receive_json()
                    if e['type']=='error':
                        self.assertIn('bad voice',e['message']);break
                else:self.fail('No error received')

    def test_symbol_only_speech_fragment_is_skipped(self):
        async def fake_stream(messages,config):
            yield '✨'
        with patch('backend.app.stream',fake_stream),patch('backend.app.speech.generate') as generate:
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                ws.receive_json();ws.receive_json();ws.send_json({'type':'turn','turn':3,'text':'Hi'})
                events=[]
                for _ in range(20):
                    event=ws.receive_json();events.append(event)
                    if event['type'] in ('done','error'):break
                self.assertEqual(events[-1]['type'],'done')
                generate.assert_not_called()

class Recording(unittest.TestCase):
    def test_silent_recording_does_not_hallucinate_text(self):
        import numpy as np
        from backend.stt.provider import transcribe
        self.assertEqual(transcribe(np.zeros(16000,dtype='<f4').tobytes(),{}),'')

class Cancellation(unittest.TestCase):
    def test_cancelled_turn_does_not_enter_history(self):
        seen=[]
        async def fake_stream(messages,config):
            seen.append(messages)
            if messages[-1]['content']=='old':
                yield 'Waiting'
                await asyncio.sleep(10)
            else:yield 'New answer.'
        with patch('backend.app.stream',fake_stream),patch('backend.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                ws.receive_json();ws.receive_json()
                ws.send_json({'type':'turn','turn':1,'text':'old'})
                while ws.receive_json()['type']!='token':pass
                ws.send_json({'type':'stop'})
                ws.send_json({'type':'turn','turn':2,'text':'new'})
                for _ in range(30):
                    event=ws.receive_json()
                    self.assertNotEqual((event['type'],event.get('turn')),('done',1))
                    if event['type']=='done':break
                else:self.fail('New turn did not complete')
                self.assertEqual([m['content'] for m in seen[-1] if m['role']=='user'],['new'])


class BotSwitching(unittest.TestCase):
    def test_switch_updates_identity_voice_and_restores_separate_history(self):
        async def fake_stream(messages,config):yield 'Hello there.'
        with patch('backend.app.stream',fake_stream),patch('backend.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                ws.receive_json();ws.receive_json()
                ws.send_json({'type':'bot','bot':'nova'})
                self.assertEqual(ws.receive_json()['config']['tts']['voice'],'af_heart')
                self.assertEqual(ws.receive_json()['history'],[])
                ws.send_json({'type':'turn','turn':1,'text':'Remember my blue bicycle'})
                while ws.receive_json()['type']!='done':pass
                ws.send_json({'type':'bot','bot':'robot'})
                config=ws.receive_json()['config']
                self.assertEqual(config['tts']['voice'],'am_michael')
                self.assertIn('Rivet',config['conversation']['system'])
                self.assertEqual(ws.receive_json()['history'],[])
                ws.send_json({'type':'bot','bot':'nova'})
                config=ws.receive_json()['config']
                self.assertIn('Nova',config['conversation']['system'])
                self.assertEqual(ws.receive_json()['history'][0]['content'],'Remember my blue bicycle')

    def test_onboarding_saves_companion_profile_and_interaction(self):
        with tempfile.TemporaryDirectory() as directory,patch('backend.app.PREFERENCES_PATH',Path(directory)/'settings.json'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                ws.receive_json();ws.receive_json()
                ws.send_json({'type':'onboarding','bot':'luma','performanceProfile':'high','interaction':'manual'})
                config=ws.receive_json()['config']
                self.assertIn('Luma',config['conversation']['system'])
                self.assertEqual(config['tts']['voice'],'af_heart')
                self.assertEqual(config['performanceProfile'],'medium')
                self.assertEqual(config['audio']['mode'],'manual')
                self.assertEqual(ws.receive_json()['type'],'bot_history')


class Recovery(unittest.TestCase):
    def test_empty_model_reply_surfaces_error(self):
        async def empty(messages,config):
            if False:yield ''
        with patch('backend.app.stream',empty):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                ws.receive_json();ws.receive_json();ws.send_json({'type':'turn','turn':1,'text':'Hi'})
                for _ in range(10):
                    event=ws.receive_json()
                    if event['type']=='error':
                        self.assertIn('empty reply',event['message']);break
                else:self.fail('Empty reply was not reported')

    def test_failed_warmup_never_reports_ready(self):
        import os
        async def fail():raise RuntimeError('model missing')
        with patch('backend.app.warm_task',None),patch('backend.app.warm_models',fail),patch.dict(os.environ,{'MYAVATAR_WARMUP':'1'}):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                self.assertEqual(ws.receive_json()['type'],'config')
                self.assertEqual(ws.receive_json()['type'],'preparing')
                event=ws.receive_json()
                self.assertEqual(event['type'],'setup_error')
                self.assertEqual(event['message'],'model missing')
