import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import WebSocket from 'ws';

const exec=promisify(execFile);
const encode=bytes=>{let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value);};
const {stdout}=await exec('.venv/bin/python',['scripts/kokoro-tts.py','models/kokoro-v1.0.onnx','models/voices-v1.0.bin','af_nova','1','en-us','How are you?'],{maxBuffer:4*1024*1024});
const wav=Uint8Array.from(atob(stdout.trim()),char=>char.charCodeAt(0));
const view=new DataView(wav.buffer,wav.byteOffset,wav.byteLength);const rate=view.getUint32(24,true);const pcm=new Float32Array((wav.length-44)/2);
for(let index=0;index<pcm.length;index++)pcm[index]=view.getInt16(44+index*2,true)/32768;
const socket=new WebSocket('ws://127.0.0.1:8787/?token=local-mvp');let partial='',recognition,started=0;const streamErrors=[];
const timer=setTimeout(()=>{console.error('streaming voice timed out');socket.terminate();process.exitCode=1;},90000);
socket.on('message',async raw=>{const event=JSON.parse(raw);if(event.type==='config'){
  socket.send(JSON.stringify({type:'voice_stream_start',streamId:'fixture'}));
  for(let offset=0;offset<pcm.length;offset+=Math.floor(rate*.16)){const chunk=pcm.slice(offset,offset+Math.floor(rate*.16));socket.send(JSON.stringify({type:'voice_stream_audio',streamId:'fixture',audio:encode(new Uint8Array(chunk.buffer))}));await new Promise(resolve=>setTimeout(resolve,160));}
  socket.send(JSON.stringify({type:'voice_stream_end',streamId:'fixture'}));started=performance.now();socket.send(JSON.stringify({type:'voice',turn:1,streamId:'fixture',audio:stdout.trim(),mime:'audio/wav'}));return;
}if(event.type==='partial_transcript')partial=event.text;if(event.type==='streaming_recognition_error')streamErrors.push(event.message);if(event.type==='recognition')recognition=event;if(event.type==='done'&&event.turn===1){try{assert.equal(recognition?.streaming,false);assert.equal(recognition?.provisionalCommand,null);assert.match(recognition?.text||'',/how are you/i);console.log(JSON.stringify({partial,recognition,firstTurnMs:Math.round(performance.now()-started)}));}catch(error){console.error({partial,recognition,streamErrors});console.error(error);process.exitCode=1;}clearTimeout(timer);socket.close();}});
socket.on('error',error=>{console.error(error);clearTimeout(timer);process.exitCode=1;});
