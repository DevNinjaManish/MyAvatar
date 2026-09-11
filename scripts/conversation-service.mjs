import {randomUUID} from 'node:crypto';
import {promises as fs} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocketServer} from 'ws';

const port=8787;
const token=process.env.MYAVATAR_RUNTIME_TOKEN||'local-mvp';
const model='qwen3.5:0.8b';
const ollamaUrl='http://127.0.0.1:11434/api/chat';
const exec=promisify(execFile);
const whisperBinary=process.env.MYAVATAR_WHISPER_BIN||'whisper';
const whisperModel=process.env.MYAVATAR_WHISPER_MODEL||'tiny';
const sayBinary='/usr/bin/say';
const ffmpegBinary=process.env.MYAVATAR_FFMPEG_BIN||'ffmpeg';

async function transcribeVoice(audio,mime='audio/webm'){
  const dir=await fs.mkdtemp(join(tmpdir(),'myavatar-voice-'));
  const input=join(dir,mime.includes('aiff')?'input.aiff':'input.webm');
  const output=join(dir,'output');
  try{
    await fs.writeFile(input,Buffer.from(audio,'base64'));
    await exec(whisperBinary,[input,'--model',whisperModel,'--language','en','--task','transcribe','--output_format','txt','--output_dir',output,'--verbose','False'],{timeout:120000});
    return (await fs.readFile(join(output,'input.txt'),'utf8')).trim();
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}

async function synthesizeSpeech(text){
  const dir=await fs.mkdtemp(join(tmpdir(),'myavatar-speech-'));
  const aiff=join(dir,'speech.aiff');const wav=join(dir,'speech.wav');
  try{
    await exec(sayBinary,['-o',aiff,text],{timeout:30000});
    await exec(ffmpegBinary,['-y','-loglevel','error','-i',aiff,'-acodec','pcm_s16le',wav],{timeout:30000});
    return (await fs.readFile(wav)).toString('base64');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}

function voiceSetupError(error){
  if(error?.code==='ENOENT')return 'Whisper is not installed. Run brew install openai-whisper ffmpeg, then try voice again.';
  return error?.message||'Voice processing failed.';
}

const server=new WebSocketServer({host:'127.0.0.1',port});
server.on('connection',(socket,request)=>{
  if(new URL(request.url,'ws://127.0.0.1').searchParams.get('token')!==token){socket.close(1008,'Unauthorized');return;}
  const sessionId=randomUUID();let sequence=0;let stopped=new Set();
  const send=(event)=>socket.send(JSON.stringify({runtimeVersion:1,sessionId,sequence:++sequence,botId:'rivet',...event}));
  send({type:'config',config:{conversation:{persona:'rivet'},bots:{rivet:{name:'Rivet'}}}});
  const answer=async(turn,text,{speak=false}={})=>{
    const response=await fetch(ollamaUrl,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({model,stream:true,think:false,options:{num_predict:256},messages:[{role:'user',content:text}]})});
    if(!response.ok)throw Error(`Local model returned HTTP ${response.status}.`);
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let spokenText='';
    while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(stopped.has(turn)){reader.cancel();break;}if(!line.trim())continue;const part=JSON.parse(line);const tokenText=part.message?.content||'';if(tokenText){spokenText+=tokenText;send({type:'token',turn,text:tokenText});}}if(stopped.has(turn))break;}
    if(buffer.trim()&&!stopped.has(turn)){const part=JSON.parse(buffer);const tokenText=part.message?.content||'';if(tokenText){spokenText+=tokenText;send({type:'token',turn,text:tokenText});}}
    if(stopped.has(turn)){stopped.delete(turn);return;}
    if(speak){
      try{send({type:'audio',turn,audio:await synthesizeSpeech(spokenText),mime:'audio/wav'});}
      catch(error){send({type:'speech_unavailable',turn,message:`Speech output unavailable: ${error.message}`});}
    }
    send({type:'done',turn});
  };
  socket.on('message',async raw=>{
    let message;try{message=JSON.parse(raw.toString());}catch{return;}
    if(message.type==='stop'){stopped.add(message.turn);return;}
    if(!['turn','voice'].includes(message.type)||!Number.isInteger(message.turn))return;
    const turn=message.turn;
    try{
      let text=message.text;
      if(message.type==='voice'){
        if(typeof message.audio!=='string'||!message.audio)throw Error('No microphone audio was received.');
        text=await transcribeVoice(message.audio,message.mime);
        if(!text)throw Error('No speech was recognized. Typed chat is available.');
        send({type:'transcript',turn,text});
      }
      if(typeof text!=='string'||!text.trim())throw Error('Empty request.');
      await answer(turn,text,{speak:message.type==='voice'});
    }catch(error){if(!stopped.has(turn))send({type:'error',turn,message:`${message.type==='voice'?'Voice':'Conversation'} unavailable: ${message.type==='voice'?voiceSetupError(error):error.message}`});stopped.delete(turn);}
  });
});
server.on('listening',()=>console.log(`Conversation service listening on ws://127.0.0.1:${port}`));
