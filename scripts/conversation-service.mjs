import {randomUUID} from 'node:crypto';
import {promises as fs} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {arch, totalmem, cpus} from 'node:os';
import {join} from 'node:path';
import {WebSocketServer} from 'ws';
import {ProviderRegistry,checkProviderHealth} from '../src/runtime/providers.js';
import {runProviderStream} from '../src/runtime/stream-runner.js';
import {detectPerformanceProfile, hardwareSummary, PERFORMANCE_PROFILES} from '../src/runtime/profiles.js';

const port=8787;
const token=process.env.MYAVATAR_RUNTIME_TOKEN||'local-mvp';
const requestedProfile=process.env.MYAVATAR_PERFORMANCE_PROFILE||'auto';
const performanceProfile=detectPerformanceProfile({arch:arch(),totalMemoryBytes:totalmem(),requested:requestedProfile});
const model=process.env.MYAVATAR_CONVERSATION_MODEL||'qwen3.5:0.8b';
const requestedProvider=process.env.MYAVATAR_CONVERSATION_PROVIDER||'ollama';
const ollamaUrl='http://127.0.0.1:11434/api/chat';
const exec=promisify(execFile);
const whisperBinary=process.env.MYAVATAR_WHISPER_BIN||'whisper';
const whisperModel=process.env.MYAVATAR_WHISPER_MODEL||'tiny';
const sayBinary='/usr/bin/say';
const ffmpegBinary=process.env.MYAVATAR_FFMPEG_BIN||'ffmpeg';
const bots=Object.freeze({nova:{name:'Nova'},sterling:{name:'Sterling'},rivit:{name:'Rivit'},luma:{name:'Luma'}});
const providerRegistry=new ProviderRegistry();
providerRegistry.register('conversation','ollama',Object.freeze({
  name:'ollama',
  async health({signal}){
    const response=await fetch('http://127.0.0.1:11434/api/tags',{signal});
    if(!response.ok)return {available:false,reason:`Local model returned HTTP ${response.status}.`};
    return {available:true};
  },
  async stream({text,signal,onToken}){
    const response=await fetch(ollamaUrl,{method:'POST',headers:{'content-type':'application/json'},signal,
      body:JSON.stringify({model,stream:true,think:false,options:{num_predict:performanceProfile===PERFORMANCE_PROFILES.FAST?192:256},messages:[{role:'user',content:text}]})});
    if(!response.ok)throw Error(`Local model returned HTTP ${response.status}.`);
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.trim())continue;const part=JSON.parse(line);const tokenText=part.message?.content||'';if(tokenText)onToken(tokenText);}}
    if(buffer.trim()){const part=JSON.parse(buffer);const tokenText=part.message?.content||'';if(tokenText)onToken(tokenText);}
  }
}));
const conversationProvider=providerRegistry.resolve('conversation',{preferred:requestedProvider,fallbacks:['ollama']});

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
  const sessionId=randomUUID();let sequence=0;let stopped=new Set();const activeControllers=new Map();let activeBot='nova';
  const send=(event)=>socket.send(JSON.stringify({runtimeVersion:1,sessionId,sequence:++sequence,botId:activeBot,...event}));
  const sendConfig=()=>send({type:'config',config:{conversation:{persona:activeBot,provider:conversationProvider?.name||'unavailable',profile:performanceProfile},bots},runtime:{provider:conversationProvider?.name||'unavailable',profile:performanceProfile,hardware:hardwareSummary({arch:arch(),totalMemoryBytes:totalmem(),cpuCount:cpus().length})}});
  sendConfig();
  const answer=async(turn,text,{speak=false}={})=>{
    let spokenText='';
    const controller=new AbortController();activeControllers.set(turn,controller);
    try{await runProviderStream(conversationProvider,{text,signal:controller.signal,timeoutMs:30000,onToken(tokenText){
      if(stopped.has(turn))return;
      spokenText+=tokenText;send({type:'token',turn,text:tokenText});
    }});}finally{activeControllers.delete(turn);}
    if(stopped.has(turn)||controller.signal.aborted){stopped.delete(turn);return;}
    if(speak){
      try{send({type:'audio',turn,audio:await synthesizeSpeech(spokenText),mime:'audio/wav'});}
      catch(error){send({type:'speech_unavailable',turn,message:`Speech output unavailable: ${error.message}`});}
    }
    send({type:'done',turn});
  };
  socket.on('message',async raw=>{
    let message;try{message=JSON.parse(raw.toString());}catch{return;}
    if(message.type==='stop'){stopped.add(message.turn);activeControllers.get(message.turn)?.abort(new Error('Turn stopped by user.'));return;}
    if(message.type==='switch_bot'&&typeof message.botId==='string'&&bots[message.botId]){activeBot=message.botId;sendConfig();return;}
    if(message.type==='health'){
      send({type:'health',health:await checkProviderHealth(conversationProvider,{timeoutMs:1500})});
      return;
    }
    if(message.type==='greeting'){
      const text='Hi, I’m ready.';
      try{send({type:'greeting',text,audio:await synthesizeSpeech(text),mime:'audio/wav'});}
      catch{send({type:'greeting',text});}
      return;
    }
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
    }catch(error){if(!stopped.has(turn)&&error?.name!=='AbortError')send({type:'error',turn,message:`${message.type==='voice'?'Voice':'Conversation'} unavailable: ${message.type==='voice'?voiceSetupError(error):error.message}`});stopped.delete(turn);}
  });
});
server.on('listening',()=>console.log(`Conversation service listening on ws://127.0.0.1:${port}`));
