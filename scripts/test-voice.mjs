import {promises as fs} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import WebSocket from 'ws';

const exec=promisify(execFile);
const dir=await fs.mkdtemp(join(tmpdir(),'myavatar-voice-test-'));
const input=join(dir,'fixture.aiff');
try{
  const fixture=await exec('.venv/bin/python',['scripts/kokoro-tts.py','models/kokoro-v1.0.onnx','models/voices-v1.0.bin','af_nova','1','en-us','hello from local voice testing'],{maxBuffer:4*1024*1024});
  const audio=fixture.stdout.trim();
  const requestedProfile=process.env.MYAVATAR_PERFORMANCE_PROFILE;
  const profile=requestedProfile||'auto';
  const socket=new WebSocket(`ws://127.0.0.1:8787/?token=local-mvp&profile=${encodeURIComponent(profile)}`);
  const timer=setTimeout(()=>{console.error('voice integration timeout');process.exit(1);},180000);
  let transcript='',response='',sawAudio=false,sawConfig=false,sawVoice='',started=0;
  socket.on('message',data=>{
    const event=JSON.parse(data);
    if(event.type==='config'){
      const expected={nova:['af_heart','Heart'],sterling:['bm_george','George'],rivet:['am_puck','Puck'],luma:['af_bella','Bella']};
      sawConfig=(!requestedProfile||event.runtime?.profileSelection===profile)&&Object.entries(expected).every(([id,[voiceId,voice]])=>event.config?.bots?.[id]?.voice?.provider==='kokoro'&&event.config?.bots?.[id]?.voice?.voiceId===voiceId&&event.config?.bots?.[id]?.voice?.name===voice);
      started=Date.now();socket.send(JSON.stringify({type:'voice',turn:1,audio,mime:'audio/wav'}));
    }
    if(event.type==='transcript')transcript+=event.text||'';
    if(event.type==='token')response+=event.text||'';
    if(event.type==='recognition')console.log(`Recognition: ${event.durationMs}ms, language ${event.language}`);
    if(event.type==='audio'&&event.filler)console.log(`Acknowledgement: ${Date.now()-started}ms`);
    if(event.type==='audio'&&!event.filler){if(!sawAudio)console.log(`First reply audio: ${Date.now()-started}ms`);sawAudio=Boolean(event.audio);sawVoice=event.voice?.voiceId||'';}
    if(event.type==='error'){clearTimeout(timer);console.error(event.message);process.exit(1);}
    if(event.type==='done'){clearTimeout(timer);if(!sawConfig||!transcript.trim()||!response.trim()||!sawAudio||sawVoice!=='af_heart'){console.error('Voice integration did not complete STT, response, bot-specific TTS, and voice audio.');process.exit(1);}console.log(`Voice integration passed: ${transcript.trim()} -> ${response.trim()} (${sawVoice})`);socket.close();}
  });
  socket.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exit(1);});
}finally{await fs.rm(dir,{recursive:true,force:true});}
