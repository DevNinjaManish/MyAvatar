import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import WebSocket from 'ws';
const exec=promisify(execFile);
const {stdout}=await exec('.venv/bin/python',['scripts/kokoro-tts.py','models/kokoro-v1.0.onnx','models/voices-v1.0.bin','af_nova','1','en-us','How are you?'],{maxBuffer:4*1024*1024});
const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');
let started=0,firstAudio=0,fillers=0,reply='',transcript='';
const timer=setTimeout(()=>{console.error('Quick voice timed out');socket.terminate();process.exitCode=1;},90000);
socket.on('message',raw=>{
  const e=JSON.parse(raw);
  if(e.type==='config'){socket.send(JSON.stringify({type:'greeting'}));return;}
  if(e.type==='greeting'){started=performance.now();socket.send(JSON.stringify({type:'voice',turn:1,audio:stdout.trim(),mime:'audio/wav'}));}
  if(e.turn!==1)return;
  if(e.type==='transcript')transcript=e.text;
  if(e.type==='token')reply+=e.text;
  if(e.type==='audio'){if(e.filler)fillers++;else if(!firstAudio)firstAudio=performance.now()-started;}
  if(e.type==='done'){
    console.log(JSON.stringify({transcript,reply,firstReplyMs:Math.round(firstAudio),fillers}));
    try{assert.ok(firstAudio>0);assert.equal(fillers,0,'A simple greeting should not need filler');assert.match(reply,/How are you|How about you/i);console.log(JSON.stringify({transcript,reply,firstReplyMs:Math.round(firstAudio),fillers}));}
    catch(error){console.error(error);process.exitCode=1;}
    clearTimeout(timer);socket.close();
  }
  if(e.type==='error'){console.error(e.message);clearTimeout(timer);socket.close();process.exitCode=1;}
});
socket.on('error',error=>{console.error(error);clearTimeout(timer);process.exitCode=1;});
