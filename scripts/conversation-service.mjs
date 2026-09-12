import {randomUUID} from 'node:crypto';
import {promises as fs} from 'node:fs';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {arch, totalmem, cpus} from 'node:os';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {WebSocketServer} from 'ws';
import {ProviderRegistry,checkProviderHealth} from '../src/runtime/providers.js';
import {runProviderStream} from '../src/runtime/stream-runner.js';
import {detectPerformanceProfile, hardwareSummary, PERFORMANCE_PROFILES, profileSettings} from '../src/runtime/profiles.js';
import {voiceProfiles} from '../src/app/voice-profiles.js';
import {SpeechSegments} from '../src/conversation/speech-segments.js';

const port=8787;
const token=process.env.MYAVATAR_RUNTIME_TOKEN||'local-mvp';
const requestedProfile=process.env.MYAVATAR_PERFORMANCE_PROFILE||'auto';
const machine=hardwareSummary({arch:arch(),totalMemoryBytes:totalmem(),cpuCount:cpus().length});
let profileSelection=['auto',PERFORMANCE_PROFILES.FAST,PERFORMANCE_PROFILES.BALANCED].includes(requestedProfile)?requestedProfile:'auto';
let performanceProfile=detectPerformanceProfile({arch:arch(),totalMemoryBytes:totalmem(),requested:profileSelection});
const modelForProfile=()=>process.env.MYAVATAR_CONVERSATION_MODEL||(performanceProfile==='balanced'?'qwen3.5:4b':'qwen3.5:0.8b');
const requestedProvider=process.env.MYAVATAR_CONVERSATION_PROVIDER||'ollama';
const ollamaUrl='http://127.0.0.1:11434/api/chat';
const exec=promisify(execFile);
const whisperBinary=process.env.MYAVATAR_WHISPER_BIN||'whisper';
const whisperModel=process.env.MYAVATAR_WHISPER_MODEL||'tiny';
const sayBinary='/usr/bin/say';
const ffmpegBinary=process.env.MYAVATAR_FFMPEG_BIN||'ffmpeg';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const kokoroPython=process.env.MYAVATAR_KOKORO_PYTHON||join(projectRoot,'.venv/bin/python');
const kokoroModel=process.env.MYAVATAR_KOKORO_MODEL||join(projectRoot,'models/kokoro-v1.0.onnx');
const kokoroVoices=process.env.MYAVATAR_KOKORO_VOICES||join(projectRoot,'models/voices-v1.0.bin');
const kokoroScript=join(projectRoot,'scripts/kokoro-tts.py');
const kokoroWorkerScript=join(projectRoot,'scripts/kokoro-worker.py');
const kokoroReady=existsSync(kokoroPython)&&existsSync(kokoroModel)&&existsSync(kokoroVoices)&&existsSync(kokoroScript)&&existsSync(kokoroWorkerScript);
const kokoroWorker=kokoroReady?spawn(kokoroPython,[kokoroWorkerScript,kokoroModel,kokoroVoices],{stdio:['pipe','pipe','inherit']}):null;
const kokoroResponses=new Map();let kokoroRequestId=0;
if(kokoroWorker){
  createInterface({input:kokoroWorker.stdout}).on('line',line=>{
    try{const response=JSON.parse(line);const pending=kokoroResponses.get(response.id);if(!pending)return;kokoroResponses.delete(response.id);response.error?pending.reject(Error(response.error)):pending.resolve(response.audio);}catch{}
  });
  kokoroWorker.on('close',()=>{for(const pending of kokoroResponses.values())pending.reject(Error('Kokoro TTS worker stopped.'));kokoroResponses.clear();});
}
const stopKokoro=()=>{if(kokoroWorker&&!kokoroWorker.killed)kokoroWorker.kill('SIGTERM');};
process.on('SIGTERM',()=>{stopKokoro();process.exit(0);});
process.on('SIGINT',()=>{stopKokoro();process.exit(0);});
const bots=Object.freeze({nova:{name:'Nova',voice:voiceProfiles.nova},sterling:{name:'Sterling',voice:voiceProfiles.sterling},rivet:{name:'Rivit',voice:voiceProfiles.rivet},luma:{name:'Luma',voice:voiceProfiles.luma}});
const providerRegistry=new ProviderRegistry();
providerRegistry.register('conversation','ollama',Object.freeze({
  name:'ollama',
  async health({signal}){
    const response=await fetch('http://127.0.0.1:11434/api/tags',{signal});
    if(!response.ok)return {available:false,reason:`Local model returned HTTP ${response.status}.`};
    return {available:true};
  },
  async stream({text,signal,onToken,botId='nova',history=[]}){
    const profile=voiceProfiles[botId]||voiceProfiles.nova;
    const response=await fetch(ollamaUrl,{method:'POST',headers:{'content-type':'application/json'},signal,
      body:JSON.stringify({model:modelForProfile(),stream:true,think:false,options:{num_predict:profileSettings(performanceProfile).maxTokens},messages:[{role:'system',content:profile.systemPrompt+' Answer the actual request directly. Usually use one to three short spoken sentences. Use ordinary conversational language, no emojis, stage directions, or uninvited flirting. Follow the user’s requested length. Be honest about your capabilities.'},...history,{role:'user',content:text}]})});
    if(!response.ok)throw Error(`Local model returned HTTP ${response.status}.`);
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.trim())continue;const part=JSON.parse(line);const tokenText=part.message?.content||'';if(tokenText)onToken(tokenText);}}
    if(buffer.trim()){const part=JSON.parse(buffer);const tokenText=part.message?.content||'';if(tokenText)onToken(tokenText);}
  }
}));
const conversationProvider=providerRegistry.resolve('conversation',{preferred:requestedProvider,fallbacks:['ollama']});

function spokenTextForSpeech(text){
  return String(text||'')
    .replace(/```[\s\S]*?```/g,' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/\*(?:sighs?|laughs?|chuckles?|breathes?|pauses?|hums?)\*/gi,'')
    .replace(/\((?:sighs?|laughs?|chuckles?|breathes?|pauses?|hums?)\)/gi,'')
    .replace(/[*_`#>]/g,'')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,'')
    .replace(/\n+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function responseEmotion(text,botId){
  const profile=bots[botId]?.voice||voiceProfiles.nova;
  if(/[!?]/.test(text)&&/(great|wonderful|love|fun|glad|excited|welcome|nice)/i.test(text))return 'happy';
  if(/\?/.test(text))return 'curious';
  if(/(sorry|unfortunately|difficult|sad|miss|worry)/i.test(text))return 'sad';
  if(/(careful|warning|surprise|really\?)/i.test(text))return 'surprised';
  return profile.defaultEmotion||'relaxed';
}

async function transcribeVoice(audio,mime='audio/webm'){
  const dir=await fs.mkdtemp(join(tmpdir(),'myavatar-voice-'));
  const extension=mime.includes('wav')?'wav':mime.includes('aiff')?'aiff':'webm';
  const input=join(dir,`input.${extension}`);
  const output=join(dir,'output');
  try{
    await fs.writeFile(input,Buffer.from(audio,'base64'));
    await exec(whisperBinary,[input,'--model',whisperModel,'--language','en','--task','transcribe','--output_format','txt','--output_dir',output,'--verbose','False'],{timeout:120000});
    return (await fs.readFile(join(output,'input.txt'),'utf8')).trim();
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}

async function synthesizeSpeech(text,botId='nova',emotion=null){
  const dir=await fs.mkdtemp(join(tmpdir(),'myavatar-speech-'));
  const aiff=join(dir,'speech.aiff');const wav=join(dir,'speech.wav');
  try{
    const voice=bots[botId]?.voice||voiceProfiles.nova;
    const cleanText=spokenTextForSpeech(text);
    const speed=voice.speed*(emotion==='happy'?1.02:emotion==='sad'?.96:emotion==='curious'?.99:1);
    if(kokoroReady){
      try{
        const audio=await new Promise((resolveAudio,reject)=>{
          const id=String(++kokoroRequestId);const timer=setTimeout(()=>{kokoroResponses.delete(id);reject(Error('Speech synthesis timed out.'));},30000);
          kokoroResponses.set(id,{resolve:value=>{clearTimeout(timer);resolveAudio(value);},reject:error=>{clearTimeout(timer);reject(error);}});
          kokoroWorker.stdin.write(`${JSON.stringify({id,text:cleanText,voice:voice.voiceId,speed,lang:voice.lang})}\n`,error=>{if(error){kokoroResponses.delete(id);reject(error);}});
        });
        return audio;
      }catch(error){console.warn(`Kokoro TTS unavailable for ${botId}; using macOS voice fallback: ${error.message}`);}
    }
    await exec(sayBinary,['-v',voice.name,'-r',String(voice.rate),'-o',aiff,cleanText],{timeout:30000});
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
  const histories=new Map();
  const send=(event)=>socket.send(JSON.stringify({runtimeVersion:1,sessionId,sequence:++sequence,botId:activeBot,...event}));
  const sendConfig=()=>send({type:'config',config:{conversation:{persona:activeBot,provider:conversationProvider?.name||'unavailable',profile:performanceProfile},bots},runtime:{provider:conversationProvider?.name||'unavailable',voiceProvider:kokoroReady?'kokoro':'macos-say',profile:performanceProfile,profileSelection,profileSettings:profileSettings(performanceProfile),hardware:machine}});
  sendConfig();
  const answer=async(turn,text,{speak=false}={})=>{
    let spokenText='';const bot=activeBot;const history=histories.get(bot)||[];
    const segments=new SpeechSegments();let speechChain=Promise.resolve();
    const controller=new AbortController();activeControllers.set(turn,controller);
    const queueSpeech=sentence=>{speechChain=speechChain.then(async()=>{
      if(controller.signal.aborted||stopped.has(turn))return;
      const clean=spokenTextForSpeech(sentence);if(!clean)return;
      const emotion=responseEmotion(clean,bot);
      try{const audio=await synthesizeSpeech(clean,bot,emotion);if(!controller.signal.aborted&&!stopped.has(turn))send({type:'audio',turn,audio,mime:'audio/wav',voice:bots[bot].voice,emotion});}
      catch(error){if(!controller.signal.aborted)send({type:'speech_unavailable',turn,message:`Speech output unavailable: ${error.message}`});}
    });};
    try{await runProviderStream(conversationProvider,{text,signal:controller.signal,timeoutMs:30000,providerOptions:{botId:bot,history},onToken(tokenText){
      if(stopped.has(turn))return;
      spokenText+=tokenText;send({type:'token',turn,text:tokenText});
      if(speak)for(const sentence of segments.push(tokenText))queueSpeech(sentence);
    }});
    if(speak)for(const sentence of segments.push('',true))queueSpeech(sentence);
    await speechChain;
    if(stopped.has(turn)||controller.signal.aborted){stopped.delete(turn);return;}
    histories.set(bot,[...history,{role:'user',content:text},{role:'assistant',content:spokenText}].slice(-12));
    send({type:'done',turn});
    }finally{controller.abort();activeControllers.delete(turn);}
  };
  socket.on('message',async raw=>{
    let message;try{message=JSON.parse(raw.toString());}catch{return;}
    if(message.type==='stop'){stopped.add(message.turn);activeControllers.get(message.turn)?.abort(new Error('Turn stopped by user.'));return;}
    if(message.type==='clear_history'){histories.delete(activeBot);return;}
    if(message.type==='switch_bot'&&typeof message.botId==='string'&&bots[message.botId]){activeBot=message.botId;sendConfig();return;}
    if(message.type==='set_profile'&&['auto',PERFORMANCE_PROFILES.FAST,PERFORMANCE_PROFILES.BALANCED].includes(message.profile)){
      profileSelection=message.profile;performanceProfile=detectPerformanceProfile({arch:arch(),totalMemoryBytes:totalmem(),requested:profileSelection});
      send({type:'profile',profile:performanceProfile,selection:profileSelection,settings:profileSettings(performanceProfile),hardware:machine});
      return;
    }
    if(message.type==='health'){
      send({type:'health',health:await checkProviderHealth(conversationProvider,{timeoutMs:1500})});
      return;
    }
    if(message.type==='greeting'){
      const text=bots[activeBot]?.voice?.greeting||'Hi, I’m ready.';
      try{send({type:'greeting',text,audio:await synthesizeSpeech(text,activeBot,'happy'),mime:'audio/wav',voice:bots[activeBot]?.voice,emotion:'happy'});}
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
        if(stopped.has(turn)||socket.readyState!==1){stopped.delete(turn);return;}
        if(!text)throw Error('No speech was recognized. Typed chat is available.');
        send({type:'transcript',turn,text});
      }
      if(typeof text!=='string'||!text.trim())throw Error('Empty request.');
      await answer(turn,text,{speak:message.type==='voice'||message.speak===true});
    }catch(error){if(!stopped.has(turn)&&error?.name!=='AbortError')send({type:'error',turn,message:`${message.type==='voice'?'Voice':'Conversation'} unavailable: ${message.type==='voice'?voiceSetupError(error):error.message}`});stopped.delete(turn);}
  });
  socket.on('close',()=>{for(const controller of activeControllers.values())controller.abort();});
});
server.on('listening',()=>console.log(`Conversation service listening on ws://127.0.0.1:${port}`));
