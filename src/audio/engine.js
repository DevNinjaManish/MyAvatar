import {TurnDetector} from './vad.js';
import {turnPlayback} from './turn-playback.js';

let activeCaptureOwner=null;

export function resample(input, rate, target=16000){
  const out=new Float32Array(Math.floor(input.length*target/rate));
  for(let i=0;i<out.length;i++){const from=Math.floor(i*rate/target),to=Math.min(input.length,Math.floor((i+1)*rate/target));let sum=0;for(let j=from;j<to;j++)sum+=input[j];out[i]=sum/Math.max(1,to-from);}
  return out;
}
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export function inputLevel(frame){
  if(!frame?.length)return 0;
  let sum=0,count=0;
  for(const sample of frame){if(!Number.isFinite(sample))continue;sum+=sample*sample;count++;}
  return count?Math.min(1,Math.sqrt(sum/count)*12):0;
}
function emitInputLevel(level){
  try{globalThis.dispatchEvent?.(new CustomEvent('myavatar:mic-level',{detail:{level:Math.max(0,Math.min(1,Number(level)||0))}}));}catch{}
}
export function getActiveCaptureSnapshot(){return activeCaptureOwner?.captureSnapshot()||{active:false,mode:null,muted:false,generation:0};}
export function endActiveCapture(){return activeCaptureOwner?.endCapture()||new Float32Array();}
export function suspendActiveLiveCapture(){
  if(!activeCaptureOwner||activeCaptureOwner.captureMode!=='live'||!activeCaptureOwner.captureActive)return false;
  activeCaptureOwner.setListening(false);return true;
}
export function resumeActiveLiveCapture(){
  if(!activeCaptureOwner||activeCaptureOwner.captureMode!=='live'||!activeCaptureOwner.captureActive)return false;
  activeCaptureOwner.setListening(true);return activeCaptureOwner.liveGate;
}

export class AudioEngine{
  constructor(onAmplitude){
    this.onAmplitude=onAmplitude;this.queue=[];this.playing=false;this.generation=0;this.captureGeneration=0;
    this.captureMode=null;this.captureActive=false;this.liveGate=false;this.chunks=[];this.sourceTurnToken=null;
    this.readyPromise=null;this.workletPromise=null;this.workletLoaded=false;this.playbackStartedAt=0;this.bargeDetector=null;this.decodeChain=Promise.resolve();
  }
  async ready(){
    if(this.ctx?.state==='closed'){this.ctx=null;this.workletLoaded=false;this.workletPromise=null;}
    this.ctx??=new AudioContext();
    if(this.ctx.state==='running')return;
    if(!this.readyPromise){const ctx=this.ctx;this.readyPromise=Promise.resolve(ctx.resume()).finally(()=>{if(this.readyPromise)this.readyPromise=null;});}
    await this.readyPromise;
    if(this.ctx?.state==='closed'){this.ctx=null;this.workletLoaded=false;this.workletPromise=null;return this.ready();}
  }
  async _ensureWorklet(){
    if(this.workletLoaded)return;
    if(!this.workletPromise){const ctx=this.ctx;this.workletPromise=Promise.resolve(ctx.audioWorklet.addModule('/capture-worklet.js')).then(()=>{if(this.ctx===ctx)this.workletLoaded=true;}).finally(()=>{this.workletPromise=null;});}
    await this.workletPromise;
  }
  captureSnapshot(){return {active:this.captureActive||activeCaptureOwner===this,mode:this.captureMode,muted:this.captureMode==='live'&&!this.liveGate,generation:this.captureGeneration};}
  _claimCapture(mode){
    if(activeCaptureOwner&&activeCaptureOwner!==this)activeCaptureOwner.endCapture();
    if(activeCaptureOwner===this)this.endCapture();
    const generation=++this.captureGeneration;activeCaptureOwner=this;this.captureMode=mode;this.captureActive=false;this.liveGate=false;this.chunks=[];
    return generation;
  }
  _isCaptureCurrent(generation){return generation===this.captureGeneration&&activeCaptureOwner===this;}
  _stopStream(stream){try{stream?.getTracks?.().forEach(track=>track.stop());}catch{}}
  _releaseCaptureNodes(stream=this.stream){
    if(this.recorder){try{this.recorder.port.onmessage=null;this.recorder.port.close();}catch{}}
    clearTimeout(this.timer);this.timer=null;
    for(const node of [this.recorder,this.highpass,this.input,this.silent]){try{node?.disconnect();}catch{}}
    this._stopStream(stream);this.recorder=null;this.highpass=null;this.input=null;this.silent=null;this.stream=null;
  }
  _abandonCapture(stream,generation){
    this._releaseCaptureNodes(stream);
    if(this._isCaptureCurrent(generation)){this.captureActive=false;this.captureMode=null;this.liveGate=false;this.chunks=[];if(activeCaptureOwner===this)activeCaptureOwner=null;}
    emitInputLevel(0);
  }
  async record(onTimeout,onFrame,{mode='manual'}={}){
    const captureGeneration=this._claimCapture(mode);
    await this.ready();if(!this._isCaptureCurrent(captureGeneration))return false;
    let timedOut=false,timeout;
    // These are handled by Chromium/the selected device before the local VAD.
    // Use required booleans rather than hints where the platform supports them.
    const request=navigator.mediaDevices.getUserMedia({audio:{channelCount:{ideal:1},echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    request.then(stream=>{if(timedOut||!this._isCaptureCurrent(captureGeneration))this._stopStream(stream);},()=>{});
    let stream;
    try{stream=await Promise.race([request,new Promise((_,reject)=>{timeout=setTimeout(()=>{timedOut=true;reject(Error('Microphone permission is pending. Allow microphone access for Electron in macOS System Settings → Privacy & Security → Microphone, then try again.'));},15000);})]);}
    finally{clearTimeout(timeout);}
    if(!this._isCaptureCurrent(captureGeneration)){this._stopStream(stream);return false;}
    try{
      this.stream=stream;this.input=this.ctx.createMediaStreamSource(stream);this.highpass=this.ctx.createBiquadFilter();this.highpass.type='highpass';this.highpass.frequency.value=95;this.highpass.Q.value=.7;
      await this._ensureWorklet();
      if(!this._isCaptureCurrent(captureGeneration)){this._abandonCapture(stream,captureGeneration);return false;}
      this.recorder=new AudioWorkletNode(this.ctx,'capture');
      this.recorder.port.onmessage=e=>{if(!this._isCaptureCurrent(captureGeneration)||!this.captureActive)return;if(this.captureMode==='live')emitInputLevel(this.liveGate?inputLevel(e.data):0);if(onFrame)onFrame(e.data);else this.chunks.push(e.data);};
      this.silent=this.ctx.createGain();this.silent.gain.value=0;this.input.connect(this.highpass).connect(this.recorder).connect(this.silent).connect(this.ctx.destination);this.captureActive=true;
      if(onTimeout)this.timer=setTimeout(()=>{if(this._isCaptureCurrent(captureGeneration)&&this.captureActive)onTimeout();},59000);
      return true;
    }catch(error){this._abandonCapture(stream,captureGeneration);throw error;}
  }
  async startLive(onUtterance,settings={}){
    await this.ready();this.detector=new TurnDetector(this.ctx.sampleRate,settings);
    let calibrationReported=this.detector.calibrationRemainingMs>0;
    let streamingActive=false;
    if(calibrationReported)settings.onCalibrationChange?.(true);
    const barge=settings?.bargeIn||{};
    const {bargeIn,onCalibrationChange,calibrationMs,...bargeBase}=settings;
    // Barge-in is a separate live detector, not a new microphone session. It
    // must never inherit startup calibration or it will ignore the interruption.
    const bargeSettings={...bargeBase,calibrationMs:0,threshold:barge.threshold??Math.max(.010,(settings.threshold??.0055)*2),onsetMs:barge.onsetMs??120,minSpeechMs:barge.minSpeechMs??180,silenceMs:barge.silenceMs??360,preRollMs:barge.preRollMs??180,rejectCooldownMs:0};
    this.bargeDetector=new TurnDetector(this.ctx.sampleRate,bargeSettings);this.bargeInGuardMs=barge.guardMs??300;
    const started=await this.record(null,frame=>{
      if(!this.captureActive)return;
      const generation=this.captureGeneration;
      if(this.liveGate){
        const wasStreaming=streamingActive;
        const utterance=this.detector.push(frame);
        if(calibrationReported&&!this.detector.calibrating){calibrationReported=false;settings.onCalibrationChange?.(false);}
        if(!streamingActive&&this.detector.started){streamingActive=true;for(const buffered of this.detector.frames)settings.onLiveSpeechFrame?.(buffered,{sampleRate:this.ctx.sampleRate});}
        else if(streamingActive)settings.onLiveSpeechFrame?.(frame,{sampleRate:this.ctx.sampleRate});
        if(utterance&&this._isCaptureCurrent(generation)){streamingActive=false;this.liveGate=false;emitInputLevel(0);onUtterance(resample(utterance,this.ctx.sampleRate),{endDetectionMs:this.detector.lastDetectionDelayMs,captureGeneration:generation,bargeIn:false});}
        else if(wasStreaming&&!this.detector.started){streamingActive=false;settings.onLiveSpeechRejected?.();}
        return;
      }
      if(this.bargeCapturing||(this.playing&&Date.now()-this.playbackStartedAt>=this.bargeInGuardMs)){
        const utterance=this.bargeDetector?.push(frame);
        if(!this.bargeCapturing&&this.bargeDetector?.started&&settings.onBargeIn){
          const detector=this.bargeDetector;this.bargeCapturing=true;settings.onBargeIn();this.bargeDetector=detector;
        }
        if(utterance&&this._isCaptureCurrent(generation)){this.bargeCapturing=false;onUtterance(resample(utterance,this.ctx.sampleRate),{endDetectionMs:this.bargeDetector.lastDetectionDelayMs,captureGeneration:generation,bargeIn:true});}
      }
    },{mode:'live'});
    if(started===false)return false;
    if(this.captureMode===null){if(activeCaptureOwner&&activeCaptureOwner!==this)activeCaptureOwner.endCapture();activeCaptureOwner=this;this.captureMode='live';this.captureActive=true;}
    return true;
  }
  setListening(enabled){
    const allowed=!enabled||turnPlayback.canResumeListening();const next=Boolean(enabled)&&allowed&&this.captureMode==='live'&&this.captureActive&&activeCaptureOwner===this;
    if(next===this.liveGate)return this.liveGate;
    this.liveGate=next;if(!next)emitInputLevel(0);this.detector?.reset();this.bargeDetector?.reset();return this.liveGate;
  }
  endCapture({collect=false}={}){
    this.bargeCapturing=false;
    const sampleRate=this.ctx?.sampleRate||16000;++this.captureGeneration;this.liveGate=false;emitInputLevel(0);this.detector?.reset();this.bargeDetector?.reset();
    const chunks=collect?(this.chunks||[]):[];this._releaseCaptureNodes();this.captureActive=false;this.captureMode=null;this.chunks=[];
    if(activeCaptureOwner===this)activeCaptureOwner=null;
    if(!collect)return new Float32Array();
    const pcm=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){pcm.set(chunk,offset);offset+=chunk.length;}return resample(pcm,sampleRate);
  }
  stopRecord(){return this.endCapture({collect:true});}
  enqueue(encoded,onStart=()=>{},onEnd=()=>{}){
    const generation=this.generation;const turnToken=turnPlayback.beginAudioDecode();
    if(!turnToken)return Promise.resolve(false);
    const work=this.decodeChain.then(async()=>{
      try{if(generation!==this.generation){turnPlayback.finishAudioDecode(turnToken,false);return false;}await this.ready();const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const buffer=await this.ctx.decodeAudioData(bytes.buffer);if(generation!==this.generation){turnPlayback.finishAudioDecode(turnToken,false);return false;}if(!turnPlayback.finishAudioDecode(turnToken,true))return false;this.queue.push({buffer,onStart,onEnd,turnToken});this.pump();return true;}
      catch(error){turnPlayback.finishAudioDecode(turnToken,false);throw error;}
    });
    this.decodeChain=work.catch(()=>{});return work;
  }
  pump(){
    if(this.playing||!this.queue.length)return;
    const {buffer,onStart,onEnd,turnToken}=this.queue.shift();this.playing=true;this.playbackStartedAt=Date.now();this.bargeDetector?.reset();this.sourceTurnToken=turnToken;turnPlayback.playbackStarted(turnToken);
    this.source=this.ctx.createBufferSource();this.source.buffer=buffer;this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=256;this.source.connect(this.analyser).connect(this.ctx.destination);const source=this.source;
    source.onended=()=>{if(this.source!==source)return;this.playing=false;source.disconnect();this.analyser.disconnect();this.onAmplitude(0);this.bargeDetector?.reset();turnPlayback.playbackEnded(turnToken);this.sourceTurnToken=null;onEnd();this.pump();};source.start();onStart();
    const data=new Float32Array(256);const tick=()=>{if(!this.playing||this.source!==source)return;this.analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length);this.onAmplitude(Math.min(1,rms*9));requestAnimationFrame(tick);};tick();
  }
  stop(){
    this.generation++;for(const item of this.queue)turnPlayback.discardAudio(item.turnToken);this.queue=[];
    if(this.source){this.source.onended=null;turnPlayback.discardAudio(this.sourceTurnToken);try{this.source.stop();this.source.disconnect();this.analyser?.disconnect();}catch{}}
    this.source=null;this.sourceTurnToken=null;this.playing=false;this.playbackStartedAt=0;if(!this.bargeCapturing)this.bargeDetector?.reset();this.onAmplitude(0);
  }
  dispose(){this.endCapture();this.stop();}
  playFiller(){if(!this.ctx)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(880,this.ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(440,this.ctx.currentTime+.05);gain.gain.setValueAtTime(0.1,this.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.05);osc.connect(gain).connect(this.ctx.destination);osc.start();osc.stop(this.ctx.currentTime+.05);}
}
