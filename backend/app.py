import asyncio, base64, json, logging, os, time, copy, random
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from backend.stt.provider import transcribe
from backend.tts.provider import Speech
from backend.llm.provider import stream
from backend.conversation.chunks import split_ready

app=FastAPI()
Path('logs').mkdir(exist_ok=True)
PREFERENCES_PATH=Path('data/settings.json')
logging.basicConfig(level=logging.INFO,handlers=[logging.StreamHandler()])
timing=logging.getLogger('avatar.timing');timing.propagate=False
file_handler=logging.FileHandler('logs/latency.jsonl');file_handler.setFormatter(logging.Formatter('%(message)s'));timing.addHandler(file_handler);timing.setLevel(logging.INFO)
log=logging.getLogger('avatar')
speech=Speech()
# Separate single-thread workers keep MLX and ONNX calls on stable threads.
stt_pool=ThreadPoolExecutor(1)
tts_pool=ThreadPoolExecutor(1)

warm_task=None

def apply_profile(config,name):
    profile=config.get('performanceProfiles',{}).get(name)
    if not profile:return
    config['performanceProfile']=name
    for section in ('llm','conversation','avatar'):config[section].update(profile.get(section,{}))

def load_config():
    config=json.loads(Path('config.json').read_text())
    try:preferences=json.loads(PREFERENCES_PATH.read_text())
    except FileNotFoundError:preferences={}
    profile=preferences.get('performanceProfile')
    if profile:apply_profile(config,profile)
    bot=preferences.get('persona')
    if bot in config.get('bots',{}):
        config['conversation'].update(persona=bot,system=config['bots'][bot]['system'])
        config['tts']['voice']=config['bots'][bot]['voice']
    if preferences.get('interaction') in ('live','manual'):config['audio']['mode']=preferences['interaction']
    return config

def save_preferences(config):
    PREFERENCES_PATH.parent.mkdir(exist_ok=True)
    PREFERENCES_PATH.write_text(json.dumps({'persona':config['conversation']['persona'],'performanceProfile':config.get('performanceProfile','low'),'interaction':config['audio']['mode']}))

async def warm_models():
    config=load_config()
    loop=asyncio.get_running_loop()
    log.info('Preparing local speech models (first launch can take a minute)...')
    wav=await loop.run_in_executor(tts_pool,speech.generate,'Hello, I am Rivet.',config['tts'])
    import io, numpy as np, soundfile as sf
    audio,rate=sf.read(io.BytesIO(wav),dtype='float32')
    pcm=np.interp(np.arange(int(len(audio)*16000/rate))*rate/16000,np.arange(len(audio)),audio).astype('<f4').tobytes()
    await loop.run_in_executor(stt_pool,transcribe,pcm,config['stt'])
    log.info('Speech models ready. Preparing Ollama model...')
    import httpx
    async with httpx.AsyncClient(timeout=180) as client:
        response=await client.post(config['llm']['url']+'/api/generate',json={'model':config['llm']['model'],'prompt':'','stream':False,'think':False,'keep_alive':config['llm'].get('keepAlive','30m'),'options':{'num_ctx':config['llm']['context']}})
        if response.status_code==404:raise RuntimeError('LLM model missing. Run: ollama pull '+config['llm']['model'])
        response.raise_for_status()
    log.info('All local models ready.')

@app.on_event('startup')
async def startup():
    global warm_task
    if os.environ.get('MYAVATAR_WARMUP')=='1':warm_task=asyncio.create_task(warm_models())

@app.get('/health')
def health(): return {'ok':True}

@app.websocket('/ws')
async def ws(socket:WebSocket):
    if socket.query_params.get('token') != os.environ.get('MYAVATAR_TOKEN','development'):
        await socket.close(code=1008); return
    if socket.headers.get('origin') not in ('http://127.0.0.1:5173','http://localhost:5173',None):
        await socket.close(code=1008); return
    await socket.accept()
    config=load_config()
    history=[]
    bot_histories={config['conversation']['persona']:history}
    task=None
    async def send(kind, turn=None, **data): await socket.send_json({'type':kind,'turn':turn,**data})
    async def greet():
        if os.environ.get('MYAVATAR_TOKEN','development')=='development':return
        bot=config.get('conversation',{}).get('persona','nova')
        lines={
            'nova':['Hello, darling. What are we making happen today?','I am here. Give me something interesting.','Hi. I missed your excellent timing.'],
            'robot':['Back online. What needs fixing?','Rivet ready. Try not to break anything expensive.','Diagnostics clear. What are we tackling?'],
            'butler':['Good to see you. How may I help?','At your service. What shall we handle first?','Welcome back. I am ready when you are.'],
            'pixel':['Okay, I am in. What is the vibe?','Hey. Give me the brief, I will make it work.','I am ready. Let us make it less boring.']
        }
        text=random.choice(lines.get(bot,lines['nova']))
        loop=asyncio.get_running_loop()
        wav=await loop.run_in_executor(tts_pool,speech.generate,text,config['tts'])
        await send('greeting',text=text,audio=base64.b64encode(wav).decode())
    async def respond(msg):
        turn_config=copy.deepcopy(config)
        turn=msg['turn'];start=time.perf_counter();metrics={};loop=asyncio.get_running_loop()
        try:
            await send('state',turn,state='THINKING')
            text=msg.get('text','').strip()
            if 'pcm' in msg:
                pcm=base64.b64decode(msg['pcm'])
                if len(pcm)>16000*4*60: raise ValueError('Recording exceeds 60 seconds')
                text=await loop.run_in_executor(stt_pool,transcribe,pcm,turn_config['stt'])
                metrics['speech_received_to_stt_ms']=round((time.perf_counter()-start)*1000)
            if not text:
                await send('done',turn);return
            await send('transcript',turn,text=text)
            messages=[{'role':'system','content':turn_config['conversation']['system']}]+history+[{'role':'user','content':text}]
            stt_end=time.perf_counter();first=None;answer='';pending=''
            queue=asyncio.Queue(maxsize=8)
            chunks_sent=0
            async def speak():
                while True:
                    chunk=await queue.get()
                    if chunk is None:return
                    synth_start=time.perf_counter()
                    wav=await loop.run_in_executor(tts_pool,speech.generate,chunk,turn_config['tts'])
                    if 'first_tts_ms' not in metrics:
                        metrics['first_tts_ms']=round((time.perf_counter()-synth_start)*1000)
                        metrics['server_first_audio_ms']=round((time.perf_counter()-start)*1000)
                    await send('audio',turn,audio=base64.b64encode(wav).decode())
            speaker=asyncio.create_task(speak())
            async def enqueue(chunk):
                # Surface synthesis failures before a full queue can stall generation.
                put=asyncio.create_task(queue.put(chunk))
                try:
                    done,_=await asyncio.wait([put,speaker],return_when=asyncio.FIRST_COMPLETED)
                    if speaker in done:
                        put.cancel(); await speaker
                    await put
                finally:
                    if not put.done():put.cancel()
            try:
                import re
                tag_checked=False
                async for token in stream(messages,turn_config['llm']):
                    if first is None:
                        first=time.perf_counter();metrics['stt_to_first_token_ms']=round((first-stt_end)*1000)
                        await send('first_token',turn)
                    answer+=token;pending+=token
                    await send('token',turn,text=token)
                    if not tag_checked:
                        if pending.lstrip().startswith('[') and ']' not in pending and len(pending)<30:continue
                        match=re.match(r'^\s*\[(happy|sad|relaxed|surprised)\]\s*',pending)
                        if match:
                            await send('emotion',turn,emotion=match[1]);pending=pending[match.end():]
                        tag_checked=True
                    while True:
                        chunk,pending=split_ready(pending,first=chunks_sent==0,first_chars=turn_config['conversation'].get('firstChunkChars',56),chunk_chars=turn_config['conversation'].get('chunkChars',140))
                        if not chunk:break
                        if chunks_sent==0:metrics['first_chunk_ready_ms']=round((time.perf_counter()-stt_end)*1000)
                        await enqueue(chunk)
                        chunks_sent+=1
                if not answer.strip():raise RuntimeError('The local model returned an empty reply. Please try again.')
                if pending.strip():
                    if chunks_sent==0:metrics['first_chunk_ready_ms']=round((time.perf_counter()-stt_end)*1000)
                    await enqueue(pending.strip())
                await enqueue(None);await speaker
            finally:
                if not speaker.done():speaker.cancel()
            history.extend([{'role':'user','content':text},{'role':'assistant','content':answer}])
            del history[:-turn_config['conversation']['historyTurns']*2]
            metrics['server_generation_ms']=round((time.perf_counter()-start)*1000)
            timing.info(json.dumps({'turn':turn,**metrics}))
            await send('metrics',turn,metrics=metrics)
            await send('done',turn)
        except asyncio.CancelledError:raise
        except Exception as e:
            log.exception('Turn failed');await send('error',turn,message=str(e))
    try:
        await send('config',config=config)
        if warm_task is not None:
            await send('preparing')
            try:await asyncio.shield(warm_task)
            except Exception as e:
                await send('setup_error',message=str(e))
                return
        await send('ready')
        await greet()
        while True:
            msg=await socket.receive_json()
            if msg['type'] in ('stop','turn','settings','clear','bot'):
                if task:
                    task.cancel()
                    try:await task
                    except asyncio.CancelledError:pass
                    task=None
            if msg['type']=='turn':task=asyncio.create_task(respond(msg))
            elif msg['type']=='clear':history.clear()
            elif msg['type']=='bot':
                bot_id=msg.get('bot')
                profile=config.get('bots',{}).get(bot_id)
                if not profile:continue
                history=bot_histories.setdefault(bot_id,[])
                config['conversation'].update(persona=bot_id,system=profile['system'])
                config['tts']['voice']=profile['voice']
                config['avatar']['type']='robot'
                save_preferences(config)
                await send('config',config=config)
                await send('bot_history',history=history)
                await greet()
            elif msg['type']=='settings':
                config.setdefault('audio',{})['mode']='manual' if msg.get('interaction')=='manual' else 'live'
                profile_name=msg.get('performanceProfile')
                apply_profile(config,profile_name)
                save_preferences(config)
                await send('config',config=config)
                await greet()
            elif msg['type']=='metrics':timing.info(json.dumps(msg))
    except WebSocketDisconnect:pass
    finally:
        if task:task.cancel()
