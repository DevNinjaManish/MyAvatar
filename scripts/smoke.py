"""Exercise the running local service with synthetic audio; never opens a microphone."""
import asyncio,base64,io,json,re,time
from pathlib import Path
import httpx,numpy as np,soundfile as sf
from websockets.asyncio.client import connect
async def main():
    async with httpx.AsyncClient() as client:
        source=(await client.get('http://127.0.0.1:5173/src/app/widget-runtime.js')).text
    token=re.search(r'"VITE_API_TOKEN":\s*"([a-f0-9]+)"',source)[1]
    audio,rate=sf.read('logs/voice-sample.wav',dtype='float32')
    pcm=np.interp(np.arange(int(len(audio)*16000/rate))*rate/16000,np.arange(len(audio)),audio).astype('<f4').tobytes()
    result={};first=None;audio_count=0
    async with connect('ws://127.0.0.1:8765/ws?token='+token,origin='http://127.0.0.1:5173',max_size=16*1024*1024) as ws:
        while json.loads(await ws.recv())['type']!='ready':pass
        start=time.perf_counter()
        await ws.send(json.dumps({'type':'turn','turn':101,'pcm':base64.b64encode(pcm).decode()}))
        while True:
            m=json.loads(await ws.recv());now=time.perf_counter()
            if m['type']=='transcript':result['transcript']=m['text'];result['speech_to_stt_ms']=round((now-start)*1000)
            elif m['type']=='first_token':first=now
            elif m['type']=='audio':
                audio_count+=1
                if audio_count==1:
                    result['speech_to_first_audio_received_ms']=round((now-start)*1000)
                    result['token_to_first_audio_received_ms']=round((now-first)*1000)
                    Path('logs/response-sample.wav').write_bytes(base64.b64decode(m['audio']))
            elif m['type']=='metrics':result.update(m['metrics'])
            elif m['type']=='error':raise RuntimeError(m['message'])
            elif m['type']=='done':break
    result['audio_chunks']=audio_count
    assert audio_count and result.get('transcript'),'Missing transcription or synthesis'
    Path('logs/smoke.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
asyncio.run(main())
