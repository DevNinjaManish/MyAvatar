import {TurnDetector} from './vad.js';
export function resample(input, rate, target=16000){
  const out=new Float32Array(Math.floor(input.length*target/rate));
  for(let i=0;i<out.length;i++){const from=Math.floor(i*rate/target),to=Math.min(input.length,Math.floor((i+1)*rate/target));let sum=0;for(let j=from;j<to;j++)sum+=input[j];out[i]=sum/Math.max(1,to-from);}
  return out;
}
export function toBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
export class AudioEngine{
  constructor(onAmplitude){this.onAmplitude=onAmplitude;this.queue=[];this.playing=false;this.generation=0;this.captureGeneration=0;}
  async ready(){this.ctx??=new AudioContext();await this.ctx.resume();}
  async record(onTimeout,onFrame){
    const captureGeneration=++this.captureGeneration;
    await this.ready();if(captureGeneration!==this.captureGeneration)return;let timedOut=false;let timeout;
    const request=navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    request.then(stream=>{if(timedOut)stream.getTracks().forEach(track=>track.stop());},()=>{});
    let stream;
    try{stream=await Promise.race([request,new Promise((_,reject)=>{timeout=setTimeout(()=>{timedOut=true;reject(Error('Microphone permission is pending. Allow microphone access for Electron in macOS System Settings → Privacy & Security → Microphone, then try again.'));},15000);})]);}finally{clearTimeout(timeout);}
    if(captureGeneration!==this.captureGeneration){stream.getTracks().forEach(track=>track.stop());return;}
    this.stream=stream;this.chunks=[];this.input=this.ctx.createMediaStreamSource(this.stream);
    if(!this.workletLoaded){await this.ctx.audioWorklet.addModule('/capture-worklet.js');this.workletLoaded=true;}
    if(captureGeneration!==this.captureGeneration)return;
    this.recorder=new AudioWorkletNode(this.ctx,'capture');this.recorder.port.onmessage=e=>{if(onFrame)onFrame(e.data);else this.chunks.push(e.data);};
    this.silent=this.ctx.createGain();this.silent.gain.value=0;this.input.connect(this.recorder).connect(this.silent).connect(this.ctx.destination);
    if(onTimeout)this.timer=setTimeout(onTimeout,59000);
  }
  async startLive(onUtterance,settings={}){
    await this.ready();this.detector=new TurnDetector(this.ctx.sampleRate,settings);this.liveGate=false;
    await this.record(null,frame=>{
      if(!this.liveGate)return;
      const utterance=this.detector.push(frame);
      if(utterance){this.liveGate=false;onUtterance(resample(utterance,this.ctx.sampleRate),{endDetectionMs:this.detector.lastDetectionDelayMs});}
    });
  }
  setListening(enabled){this.detector?.reset();this.liveGate=enabled;}
  stopRecord(){
    this.captureGeneration++;this.setListening(false);
    if(this.recorder){this.recorder.port.onmessage=null;this.recorder.port.close();}
    clearTimeout(this.timer);this.recorder?.disconnect();this.input?.disconnect();this.silent?.disconnect();this.stream?.getTracks().forEach(t=>t.stop());
    const chunks=this.chunks||[];const pcm=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const chunk of chunks){pcm.set(chunk,offset);offset+=chunk.length;}this.chunks=[];
    return resample(pcm,this.ctx?.sampleRate||16000);
  }
  async enqueue(encoded,onStart,onEnd){
    const generation=this.generation;await this.ready();const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const buffer=await this.ctx.decodeAudioData(bytes.buffer);
    if(generation!==this.generation)return;this.queue.push({buffer,onStart,onEnd});this.pump();
  }
  pump(){
    if(this.playing||!this.queue.length)return;
    const {buffer,onStart,onEnd}=this.queue.shift();this.playing=true;
    this.source=this.ctx.createBufferSource();this.source.buffer=buffer;this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=256;
    this.source.connect(this.analyser).connect(this.ctx.destination);const source=this.source;
    source.onended=()=>{if(this.source!==source)return;this.playing=false;source.disconnect();this.analyser.disconnect();this.onAmplitude(0);onEnd();this.pump();};source.start();onStart();
    const data=new Float32Array(256);const tick=()=>{if(!this.playing||this.source!==source)return;this.analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((n,x)=>n+x*x,0)/data.length);this.onAmplitude(Math.min(1,rms*9));requestAnimationFrame(tick);};tick();
  }
  stop(){this.generation++;this.queue=[];if(this.source){this.source.onended=null;try{this.source.stop();this.source.disconnect();this.analyser?.disconnect();}catch{}}this.source=null;this.playing=false;this.onAmplitude(0);}
}
