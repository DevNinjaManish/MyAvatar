import base64, unittest, asyncio, tempfile
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from backend.core.app import app


def receive_startup(ws, *, warm=False):
    first=ws.receive_json();assert first['type']=='config'
    workspace=ws.receive_json();assert workspace['type']=='coding_workspace'
    next_event=ws.receive_json()
    assert next_event['type']==('preparing' if warm else 'ready')
    return first,workspace,next_event


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
        with tempfile.TemporaryDirectory() as directory,patch('backend.core.app.PREFERENCES_PATH',Path(directory)/'settings.json'),patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws)
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
                self.assertEqual(''.join(e['text'] for e in events if e['type']=='token'),'Hello. How are you?')
                self.assertEqual(kinds[-1],'done')

    def test_tts_failure_degrades_to_text_without_deadlock(self):
        async def fake_stream(messages,config):
            for _ in range(5):yield 'Sentence. '
        with patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate',side_effect=ValueError('bad voice')):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws);ws.send_json({'type':'turn','turn':2,'text':'Hi'})
                events=[]
                for _ in range(50):
                    e=ws.receive_json();events.append(e)
                    if e['type'] in ('done','error'):break
                kinds=[e['type'] for e in events]
                self.assertNotIn('error',kinds)
                self.assertIn('speech_unavailable',kinds)
                self.assertEqual(''.join(e['text'] for e in events if e['type']=='token'),'Sentence. '*5)
                self.assertEqual(kinds[-1],'done')

    def test_symbol_only_speech_fragment_is_skipped(self):
        async def fake_stream(messages,config):
            yield '✨'
        with patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate') as generate:
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws);ws.send_json({'type':'turn','turn':3,'text':'Hi'})
                events=[]
                for _ in range(20):
                    event=ws.receive_json();events.append(event)
                    if event['type'] in ('done','error'):break
                self.assertEqual(events[-1]['type'],'done')
                generate.assert_not_called()

    def test_screen_observation_passes_image_without_storing_raw_frame(self):
        seen=[]
        async def fake_stream(messages,config):
            seen.extend(messages)
            yield '[curious] You appear to be reviewing a design.'
        with tempfile.TemporaryDirectory() as directory,patch('backend.core.app.PREFERENCES_PATH',Path(directory)/'settings.json'),patch('backend.core.app.SCREEN_EVENTS_PATH',Path(directory)/'events.jsonl'),patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws)
                frame=base64.b64encode(b'PNG test frame').decode()
                ws.send_json({'type':'turn','turn':7,'text':'Screen awareness','image':frame,'screenObservation':True,'screenSource':'Main display'})
                while ws.receive_json()['type']!='done':pass
                self.assertEqual(seen[-1]['images'],[frame])
                event_file=Path(directory)/'events.jsonl'
                saved=event_file.read_text()
                self.assertIn('reviewing a design',saved)
                self.assertNotIn(frame,saved)

    def test_screen_question_uses_image_and_remains_in_conversation_history(self):
        seen=[]
        async def fake_stream(messages,config):
            seen.extend(messages)
            yield 'You have a code review open.'
        with tempfile.TemporaryDirectory() as directory,patch('backend.core.app.PREFERENCES_PATH',Path(directory)/'settings.json'),patch('backend.core.app.SCREEN_EVENTS_PATH',Path(directory)/'events.jsonl'),patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws)
                frame=base64.b64encode(b'current screen').decode()
                ws.send_json({'type':'turn','turn':8,'text':'What is on my screen?','image':frame,'screenSource':'Main display'})
                while ws.receive_json()['type']!='done':pass
                self.assertEqual(seen[-1]['images'],[frame])
                self.assertIn('answer the user’s request directly',seen[0]['content'])
                ws.send_json({'type':'bot','bot':'robot'})
                ws.receive_json();ws.receive_json()
                ws.send_json({'type':'bot','bot':'nova'})
                ws.receive_json()
                history=ws.receive_json()['history']
                self.assertEqual(history[-2]['content'],'What is on my screen?')
                self.assertEqual(history[-1]['content'],'You have a code review open.')

class Recording(unittest.TestCase):
    def test_silent_recording_does_not_hallucinate_text(self):
        import numpy as np
        from backend.providers.stt import transcribe
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
        with tempfile.TemporaryDirectory() as directory,patch('backend.core.app.PREFERENCES_PATH',Path(directory)/'settings.json'),patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws)
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
        with tempfile.TemporaryDirectory() as directory,patch('backend.core.app.PREFERENCES_PATH',Path(directory)/'settings.json'),patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate',return_value=b'RIFFtest'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws)
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
        with tempfile.TemporaryDirectory() as directory,patch('backend.core.app.PREFERENCES_PATH',Path(directory)/'settings.json'):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws)
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
        with patch('backend.core.app.stream',empty):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws);ws.send_json({'type':'turn','turn':1,'text':'Hi'})
                for _ in range(10):
                    event=ws.receive_json()
                    if event['type']=='error':
                        self.assertIn('empty reply',event['message']);break
                else:self.fail('Empty reply was not reported')

    def test_failed_warmup_never_reports_ready(self):
        import os
        async def fail():raise RuntimeError('model missing')
        with patch('backend.core.app.warm_task',None),patch('backend.core.app.warm_models',fail),patch.dict(os.environ,{'MYAVATAR_WARMUP':'1'}):
            with TestClient(app) as client,client.websocket_connect('/ws?token=development') as ws:
                receive_startup(ws,warm=True)
                event=ws.receive_json()
                self.assertEqual(event['type'],'setup_error')
                self.assertEqual(event['message'],'model missing')
