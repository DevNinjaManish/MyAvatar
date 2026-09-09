import asyncio, base64, unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.core.app import app, engine_readiness
from backend.core.readiness import EngineReadiness


class ReadinessModel(unittest.TestCase):
    def test_all_ready_reports_full_capabilities(self):
        state=EngineReadiness()
        for engine in ('llm','stt','tts'):state.set(engine,'ready')
        snap=state.snapshot()
        self.assertEqual(snap['overall'],'ready')
        self.assertEqual(snap['capabilities'],{'chat':True,'listen':True,'speak':True,'voice':True})

    def test_partial_engine_failure_is_degraded_not_all_or_nothing(self):
        state=EngineReadiness();state.set('llm','ready');state.set('stt','ready');state.set('tts','unavailable',reason='tts_warmup_failed')
        snap=state.snapshot()
        self.assertEqual(snap['overall'],'degraded')
        self.assertTrue(snap['capabilities']['chat']);self.assertTrue(snap['capabilities']['listen'])
        self.assertFalse(snap['capabilities']['speak']);self.assertFalse(snap['capabilities']['voice'])

    def test_identical_state_does_not_advance_revision(self):
        state=EngineReadiness();state.set('llm','ready');revision=state.revision;state.set('llm','ready')
        self.assertEqual(state.revision,revision)

    def test_unknown_engine_or_state_is_rejected(self):
        state=EngineReadiness()
        with self.assertRaises(ValueError):state.set('gpu','ready')
        with self.assertRaises(ValueError):state.set('llm','magical')


class DegradedWebSocket(unittest.TestCase):
    def _connect(self):
        client=TestClient(app);client.__enter__();ws=client.websocket_connect('/ws?token=development');ws.__enter__()
        return client,ws

    def test_tts_unavailable_keeps_text_chat_and_emits_no_audio(self):
        async def fake_stream(messages,config):yield 'Text still works.'
        with TestClient(app) as client:
            engine_readiness.reset(deferred=True);engine_readiness.set('tts','unavailable',reason='tts_warmup_failed')
            with patch('backend.core.app.stream',fake_stream),patch('backend.core.app.speech.generate') as generate,client.websocket_connect('/ws?token=development') as ws:
                first=ws.receive_json();self.assertEqual(first['type'],'config')
                events=[]
                for _ in range(4):
                    event=ws.receive_json();events.append(event)
                    if event['type']=='ready':break
                ws.send_json({'type':'turn','turn':1,'text':'hello'})
                turn_events=[]
                for _ in range(20):
                    event=ws.receive_json();turn_events.append(event)
                    if event['type'] in ('done','error'):break
                self.assertEqual(turn_events[-1]['type'],'done')
                self.assertIn('token',[e['type'] for e in turn_events])
                self.assertNotIn('audio',[e['type'] for e in turn_events])
                generate.assert_not_called()

    def test_stt_unavailable_rejects_pcm_before_transcription(self):
        with TestClient(app) as client:
            engine_readiness.reset(deferred=True);engine_readiness.set('stt','unavailable',reason='stt_warmup_failed')
            with patch('backend.core.app.transcribe') as transcribe,client.websocket_connect('/ws?token=development') as ws:
                while ws.receive_json()['type']!='ready':pass
                pcm=base64.b64encode(b'\x00'*6400).decode()
                ws.send_json({'type':'turn','turn':2,'pcm':pcm})
                while True:
                    event=ws.receive_json()
                    if event['type']=='error':break
                self.assertIn('Speech recognition is unavailable',event['message'])
                transcribe.assert_not_called()

    def test_llm_unavailable_rejects_chat_before_model_call(self):
        async def should_not_run(messages,config):
            raise AssertionError('model should not be called')
            yield ''
        with TestClient(app) as client:
            engine_readiness.reset(deferred=True);engine_readiness.set('llm','unavailable',reason='llm_warmup_failed')
            with patch('backend.core.app.stream',should_not_run),client.websocket_connect('/ws?token=development') as ws:
                while ws.receive_json()['type']!='ready':pass
                ws.send_json({'type':'turn','turn':3,'text':'hello'})
                kinds=[]
                while True:
                    event=ws.receive_json();kinds.append(event['type'])
                    if event['type']=='error':break
                self.assertIn('transcript',kinds)
                self.assertIn('Local chat is unavailable',event['message'])


if __name__=='__main__':unittest.main()
