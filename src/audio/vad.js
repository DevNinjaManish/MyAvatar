/** Adaptive, energy-based local turn detector. No model download or network required. */
export class TurnDetector {
  constructor(sampleRate,{
    threshold=.009,silenceMs=600,minSpeechMs=280,maxSpeechMs=20000,preRollMs=250,
    onsetMs=140,onsetGraceMs=30,noiseMultiplier=2.2,noiseMargin=.0015,maxThreshold=.035,
    releaseRatio=.72,rejectCooldownMs=0
  }={}){
    Object.assign(this,{sampleRate,threshold,silenceMs,minSpeechMs,maxSpeechMs,preRollMs,onsetMs,onsetGraceMs,noiseMultiplier,noiseMargin,maxThreshold,releaseRatio,rejectCooldownMs});
    // Begin below the fixed floor, then learn the room while the user is quiet.
    // The estimate survives turn resets so a fan or air conditioner does not
    // repeatedly reopen the microphone gate.
    this.noiseFloor=Math.max(.0004,threshold*.45);
    this.currentThreshold=threshold;
    this.cooldownMs=0;
    this.reset();
  }
  reset(){
    this.frames=[];this.samples=0;this.voiced=0;this.quiet=0;this.started=false;
    this.onset=0;this.onsetVoiced=0;this.onsetQuiet=0;
  }
  updateNoiseFloor(rms,rate){
    if(!Number.isFinite(rms))return;
    this.noiseFloor+=(rms-this.noiseFloor)*rate;
    this.noiseFloor=Math.max(.0002,Math.min(this.noiseFloor,this.maxThreshold/this.noiseMultiplier));
  }
  push(frame){
    if(!frame?.length)return null;
    const ms=frame.length/this.sampleRate*1000;
    let sum=0,peak=0;
    for(const raw of frame){
      const sample=Number.isFinite(raw)?raw:0;
      sum+=sample*sample;peak=Math.max(peak,Math.abs(sample));
    }
    const rms=Math.sqrt(sum/frame.length);
    this.currentThreshold=Math.max(this.threshold,Math.min(this.maxThreshold,this.noiseFloor*this.noiseMultiplier+this.noiseMargin));
    // A one-sample click has a very high peak-to-average ratio. Treat it as a
    // transient even if it is loud enough to cross the energy threshold.
    const transient=peak>.12&&peak/Math.max(rms,.0001)>8;
    const activeThreshold=this.started?this.currentThreshold*Math.max(.5,Math.min(1,this.releaseRatio)):this.currentThreshold;
    let voiced=!transient&&rms>=activeThreshold;

    if(this.cooldownMs>0&&!this.started){
      this.cooldownMs=Math.max(0,this.cooldownMs-ms);
      voiced=false;
    }

    if(!this.started){
      // Learn steady background sound and slow changes. Signals well above the
      // learned floor are left untouched so quiet speech is not absorbed into it.
      if(!voiced||rms<this.currentThreshold*1.7){
        this.updateNoiseFloor(rms,voiced?.12:.035);
        this.currentThreshold=Math.max(this.threshold,Math.min(this.maxThreshold,this.noiseFloor*this.noiseMultiplier+this.noiseMargin));
        voiced=!transient&&rms>=this.currentThreshold&&this.cooldownMs===0;
      }
    }

    this.frames.push(frame);this.samples+=frame.length;
    if(!this.started){
      if(voiced){this.onset+=ms;this.onsetVoiced+=ms;this.onsetQuiet=0;}
      else if(this.onset&&this.onsetQuiet<this.onsetGraceMs){this.onset+=ms;this.onsetQuiet+=ms;}
      else{this.onset=0;this.onsetVoiced=0;this.onsetQuiet=0;}
      if(this.onset>=this.onsetMs){this.started=true;this.voiced=this.onsetVoiced;}
      else{while(this.samples>this.sampleRate*this.preRollMs/1000+frame.length){this.samples-=this.frames.shift().length;}return null;}
    }else if(voiced){this.voiced+=ms;this.quiet=0;}else this.quiet+=ms;
    if(this.quiet<this.silenceMs&&this.samples/this.sampleRate*1000<this.maxSpeechMs)return null;
    const valid=this.voiced>=this.minSpeechMs;
    // Retain 150 ms of trailing silence, discard most of the end-detection wait.
    const length=Math.max(0,this.samples-Math.floor(Math.max(0,this.quiet-150)*this.sampleRate/1000));
    const output=new Float32Array(length);let offset=0;
    if(valid)for(const part of this.frames){const n=Math.min(part.length,length-offset);if(n<=0)break;for(let i=0;i<n;i++)output[offset+i]=Number.isFinite(part[i])?part[i]:0;offset+=n;}
    this.lastDetectionDelayMs=this.quiet;
    if(!valid&&this.rejectCooldownMs>0)this.cooldownMs=this.rejectCooldownMs;
    this.reset();return valid?output:null;
  }
}
