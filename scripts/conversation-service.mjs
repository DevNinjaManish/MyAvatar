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
import {JsonWorker} from './json-worker.mjs';
import {quickReply} from '../src/conversation/quick-replies.js';

const port=8787;
const token=process.env.MYAVATAR_RUNTIME_TOKEN||'local-mvp';
const requestedProfile=process.env.MYAVATAR_PERFORMANCE_PROFILE||'auto';
const machine=hardwareSummary({arch:arch(),totalMemoryBytes:totalmem(),cpuCount:cpus().length});
let profileSelection=['auto',PERFORMANCE_PROFILES.FAST,PERFORMANCE_PROFILES.BALANCED].includes(requestedProfile)?requestedProfile:'auto';
let performanceProfile=detectPerformanceProfile({arch:arch(),totalMemoryBytes:totalmem(),requested:profileSelection});
const modelForProfile=()=>process.env.MYAVATAR_CONVERSATION_MODEL||(performanceProfile==='balanced'?'huihui_ai/qwen3.5-abliterated:4b':'huihui_ai/qwen3.5-abliterated:0.8b');
const requestedProvider=process.env.MYAVATAR_CONVERSATION_PROVIDER||'ollama';
const ollamaUrl='http://127.0.0.1:11434/api/chat';
const exec=promisify(execFile);
const whisperModel=process.env.MYAVATAR_WHISPER_MODEL||'small';
const recognitionLanguage=process.env.MYAVATAR_SPEECH_LANGUAGE||'auto';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const localPython=join(projectRoot,'.venv/bin/python');
const recognizer=new JsonWorker(process.env.MYAVATAR_WHISPER_PYTHON||localPython,[join(projectRoot,'scripts/whisper-worker.py'),whisperModel]);
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
const stopKokoro=()=>{recognizer.close();if(kokoroWorker&&!kokoroWorker.killed)kokoroWorker.kill('SIGTERM');};
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
const acknowledgementAudio=new Map();
const quickAudio=new Map();
function quickSpeech(text,bot){const key=bot+text;if(!quickAudio.has(key))quickAudio.set(key,synthesizeSpeech(text,bot).catch(error=>{quickAudio.delete(key);throw error;}));return quickAudio.get(key);}
const warmedModels=new Set();
function warmConversation(){
  const model=modelForProfile();if(warmedModels.has(model))return;
  warmedModels.add(model);
  fetch(ollamaUrl,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({model,messages:[],stream:false,keep_alive:'10m'})})
    .then(async response=>{await response.body?.cancel();if(!response.ok)warmedModels.delete(model);}).catch(()=>warmedModels.delete(model));
}
const acknowledgementText={nova:'One moment.',sterling:'One moment, please.',rivet:'Give me a moment.',luma:'Let me think.'};
function getAcknowledgement(bot){
  if(!acknowledgementAudio.has(bot))acknowledgementAudio.set(bot,synthesizeSpeech(acknowledgementText[bot],bot).catch(error=>{acknowledgementAudio.delete(bot);throw error;}));
  return acknowledgementAudio.get(bot);
}

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
  try{
    await fs.writeFile(input,Buffer.from(audio,'base64'));
    return await recognizer.request({path:input,language:recognitionLanguage==='auto'?null:recognitionLanguage});
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}

async function synthesizeSpeech(text,botId='nova',emotion=null){
  const dir=await fs.mkdtemp(join(tmpdir(),'myavatar-speech-'));
  try{
    const voice=bots[botId]?.voice||voiceProfiles.nova;
    const cleanText=spokenTextForSpeech(text);
    const speed=voice.speed*(emotion==='happy'?1.02:emotion==='sad'?.96:emotion==='curious'?.99:1);
    const needsHindiVoice=/[\u0900-\u097f]/u.test(cleanText);
    if(kokoroReady){
      try{
        const audio=await new Promise((resolveAudio,reject)=>{
          const id=String(++kokoroRequestId);const timer=setTimeout(()=>{kokoroResponses.delete(id);reject(Error('Speech synthesis timed out.'));},30000);
          kokoroResponses.set(id,{resolve:value=>{clearTimeout(timer);resolveAudio(value);},reject:error=>{clearTimeout(timer);reject(error);}});
          const hindiVoice={nova:'hf_alpha',sterling:'hm_omega',rivet:'hm_psi',luma:'hf_beta'}[botId]||'hf_alpha';
          kokoroWorker.stdin.write(`${JSON.stringify({id,text:cleanText,voice:needsHindiVoice?hindiVoice:voice.voiceId,speed,lang:needsHindiVoice?'hi':voice.lang})}\n`,error=>{if(error){kokoroResponses.delete(id);reject(error);}});
        });
        return audio;
      }catch(error){throw Error(`Local Kokoro speech failed: ${error.message}`);}
    }
    throw Error('Local Kokoro model is unavailable. Repair the local voice setup.');
  }finally{await fs.rm(dir,{recursive:true,force:true});}
}

function voiceSetupError(error){
  if(error?.code==='ENOENT')return 'Local speech recognition is unavailable. Repair the project voice dependencies.';
  return error?.message||'Voice processing failed.';
}

const server=new WebSocketServer({host:'127.0.0.1',port});
server.on('connection',(socket,request)=>{
  if(new URL(request.url,'ws://127.0.0.1').searchParams.get('token')!==token){socket.close(1008,'Unauthorized');return;}
  const sessionId=randomUUID();let sequence=0;let stopped=new Set();const activeControllers=new Map();let activeBot='nova';
  const pendingAcknowledgements=new Map();
  const histories=new Map();
  const scheduleAcknowledgement=(turn,bot)=>{
    const cached=getAcknowledgement(bot);cached.catch(()=>{});
    const timer=setTimeout(async()=>{try{const audio=await cached;if(pendingAcknowledgements.get(turn)!==timer||stopped.has(turn))return;send({type:'audio',turn,audio,mime:'audio/wav',voice:bots[bot].voice,filler:true});}catch{}},3500);
    pendingAcknowledgements.set(turn,timer);
  };
  const send=(event)=>{
    if(event.type==='audio'&&!event.filler||['done','error'].includes(event.type)){
      clearTimeout(pendingAcknowledgements.get(event.turn));pendingAcknowledgements.delete(event.turn);
    }
    if(socket.readyState===1)socket.send(JSON.stringify({runtimeVersion:1,sessionId,sequence:++sequence,botId:activeBot,...event}));
  };
  const sendConfig=()=>send({type:'config',config:{conversation:{persona:activeBot,provider:conversationProvider?.name||'unavailable',profile:performanceProfile},bots},runtime:{provider:conversationProvider?.name||'unavailable',model:modelForProfile(),recognitionProvider:'faster-whisper',recognitionModel:whisperModel,recognitionLanguage,voiceProvider:kokoroReady?'kokoro':'unavailable',profile:performanceProfile,profileSelection,profileSettings:profileSettings(performanceProfile),hardware:machine}});
  recognizer.ready.then(sendConfig).catch(error=>{sendConfig();send({type:'speech_unavailable',message:`Local recognition unavailable: ${error.message}`});});
  const answer=async(turn,text,{speak=false}={})=>{
    let spokenText='';const bot=activeBot;const history=histories.get(bot)||[];
    const quick=quickReply(text,bot);
    if(quick){
      clearTimeout(pendingAcknowledgements.get(turn));pendingAcknowledgements.delete(turn);send({type:'token',turn,text:quick});
      if(speak){const audio=await quickSpeech(quick,bot);if(stopped.has(turn))return;send({type:'audio',turn,audio,mime:'audio/wav',voice:bots[bot].voice});}
      histories.set(bot,[...history,{role:'user',content:text},{role:'assistant',content:quick}].slice(-12));send({type:'done',turn});return;
    }
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
    if(message.type==='stop'){clearTimeout(pendingAcknowledgements.get(message.turn));pendingAcknowledgements.delete(message.turn);stopped.add(message.turn);activeControllers.get(message.turn)?.abort(new Error('Turn stopped by user.'));return;}
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
      warmConversation();
      const text=bots[activeBot]?.voice?.greeting||'Hi, I’m ready.';
      try{send({type:'greeting',text,audio:await synthesizeSpeech(text,activeBot,'happy'),mime:'audio/wav',voice:bots[activeBot]?.voice,emotion:'happy'});getAcknowledgement(activeBot).catch(()=>{});quickSpeech(quickReply('how are you',activeBot),activeBot).catch(()=>{});}
      catch{send({type:'greeting',text});}
      return;
    }
    if(!['turn','voice'].includes(message.type)||!Number.isInteger(message.turn))return;
    const turn=message.turn;
    if(message.type==='turn'&&message.speak&&!quickReply(message.text,activeBot))scheduleAcknowledgement(turn,activeBot);
    try{
      let text=message.text;
      if(message.type==='voice'){
        if(typeof message.audio!=='string'||!message.audio)throw Error('No microphone audio was received.');
        const recognition=await transcribeVoice(message.audio,message.mime);text=recognition.text;
        if(stopped.has(turn)||socket.readyState!==1){stopped.delete(turn);return;}
        send({type:'recognition',turn,text,language:recognition.language,durationMs:recognition.durationMs,uncertain:recognition.uncertain});
        if(recognition.uncertain||!text){
          const clarification='I didn’t catch that clearly. Could you say it again?';
          send({type:'token',turn,text:clarification});
          const audio=await synthesizeSpeech(clarification,activeBot);if(!stopped.has(turn)){send({type:'audio',turn,audio,mime:'audio/wav'});send({type:'done',turn});}return;
        }
        if(!text)throw Error('No speech was recognized. Typed chat is available.');
        send({type:'transcript',turn,text});
        if(!quickReply(text,activeBot))scheduleAcknowledgement(turn,activeBot);
      }
      if(typeof text!=='string'||!text.trim())throw Error('Empty request.');
      await answer(turn,text,{speak:message.type==='voice'||message.speak===true});
    }catch(error){if(!stopped.has(turn)&&error?.name!=='AbortError')send({type:'error',turn,message:`${message.type==='voice'?'Voice':'Conversation'} unavailable: ${message.type==='voice'?voiceSetupError(error):error.message}`});stopped.delete(turn);}
  });
  socket.on('close',()=>{for(const controller of activeControllers.values())controller.abort();for(const timer of pendingAcknowledgements.values())clearTimeout(timer);pendingAcknowledgements.clear();});
});
server.on('listening',()=>console.log(`Conversation service listening on ws://127.0.0.1:${port}`));
