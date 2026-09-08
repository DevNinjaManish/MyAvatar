"""Local synthesis -> STT -> streamed LLM -> first synthesis. No microphone recording."""
import asyncio,json,time,sys,io
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import soundfile as sf
from backend.tts.provider import Speech
from backend.stt.provider import transcribe
from backend.llm.provider import stream
from backend.conversation.chunks import split_ready
config=json.loads(Path('config.json').read_text())
async def main():
    speech=Speech();result={}
    start=time.perf_counter();wav=speech.generate('Hello Rivet. Tell me one interesting thing about the ocean.',config['tts']);result['tts_cold_seconds']=time.perf_counter()-start
    Path('logs').mkdir(exist_ok=True);Path('logs/voice-sample.wav').write_bytes(wav)
    a,rate=sf.read(io.BytesIO(wav),dtype='float32');pcm=np.interp(np.arange(int(len(a)*16000/rate))*rate/16000,np.arange(len(a)),a).astype('<f4').tobytes()
    result['input_audio_seconds']=len(a)/rate
    for attempt in ['cold','warm']:
        start=time.perf_counter();text=transcribe(pcm,config['stt']);result['stt_'+attempt+'_seconds']=time.perf_counter()-start
        result['transcript']=text
    start=time.perf_counter();pending='';answer='';first=None;first_sentence=None;count=0
    async for token in stream([{'role':'system','content':'Reply in two short spoken sentences without formatting.'},{'role':'user','content':text}],config['llm']):
        count+=1
        if first is None:first=time.perf_counter();result['llm_first_token_seconds']=first-start
        answer+=token;pending+=token
        if first_sentence is None:
            chunk,pending=split_ready(pending)
            if chunk:first_sentence=(chunk,time.perf_counter())
    result['llm_full_seconds']=time.perf_counter()-start;result['answer']=answer
    if first_sentence:
        t=time.perf_counter();speech.generate(first_sentence[0],config['tts']);result['tts_warm_sentence_seconds']=time.perf_counter()-t
        result['estimated_token_to_audio_seconds']=first_sentence[1]-first+result['tts_warm_sentence_seconds']
    Path('logs/benchmark.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
asyncio.run(main())
