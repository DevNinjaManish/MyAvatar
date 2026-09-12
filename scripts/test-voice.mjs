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
  await exec('/usr/bin/say',['-o',input,'hello from local voice testing']);
  const audio=(await fs.readFile(input)).toString('base64');
  const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');
  const timer=setTimeout(()=>{console.error('voice integration timeout');process.exit(1);},180000);
  let transcript='',response='',sawAudio=false,sawConfig=false,sawVoice='';
  socket.on('message',data=>{
    const event=JSON.parse(data);
    if(event.type==='config'){
      const expected={nova:'Samantha',sterling:'Daniel',rivet:'Fred',luma:'Karen'};
      sawConfig=Object.entries(expected).every(([id,voice])=>event.config?.bots?.[id]?.voice?.name===voice);
      socket.send(JSON.stringify({type:'voice',turn:1,audio,mime:'audio/aiff'}));
    }
    if(event.type==='transcript')transcript+=event.text||'';
    if(event.type==='token')response+=event.text||'';
    if(event.type==='audio'){sawAudio=Boolean(event.audio);sawVoice=event.voice?.name||'';}
    if(event.type==='error'){clearTimeout(timer);console.error(event.message);process.exit(1);}
    if(event.type==='done'){clearTimeout(timer);if(!sawConfig||!transcript.trim()||!response.trim()||!sawAudio||sawVoice!=='Samantha'){console.error('Voice integration did not complete STT, response, bot-specific TTS, and voice audio.');process.exit(1);}console.log(`Voice integration passed: ${transcript.trim()} -> ${response.trim()} (${sawVoice})`);socket.close();}
  });
  socket.on('error',error=>{clearTimeout(timer);console.error(error.message);process.exit(1);});
}finally{await fs.rm(dir,{recursive:true,force:true});}
