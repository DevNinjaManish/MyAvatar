/** Small energy-based local turn detector. No model download or network required. */
export class TurnDetector {
  constructor(sampleRate,{threshold=.009,silenceMs=600,minSpeechMs=280,maxSpeechMs=20000,preRollMs=250}={}){
    Object.assign(this,{sampleRate,threshold,silenceMs,minSpeechMs,maxSpeechMs,preRollMs});this.reset();
  }
  reset(){this.frames=[];this.samples=0;this.voiced=0;this.quiet=0;this.started=false;this.onset=0;}
  push(frame){
    const ms=frame.length/this.sampleRate*1000;
    const rms=Math.sqrt(frame.reduce((sum,x)=>sum+x*x,0)/frame.length);
    const voiced=rms>=this.threshold;
    this.frames.push(frame);this.samples+=frame.length;
    if(!this.started){
      this.onset=voiced?this.onset+ms:0;
      if(this.onset>=100){this.started=true;this.voiced=this.onset;}
      else{while(this.samples>this.sampleRate*this.preRollMs/1000+frame.length){this.samples-=this.frames.shift().length;}return null;}
    }else if(voiced){this.voiced+=ms;this.quiet=0;}else this.quiet+=ms;
    if(this.quiet<this.silenceMs&&this.samples/this.sampleRate*1000<this.maxSpeechMs)return null;
    const valid=this.voiced>=this.minSpeechMs;
    // Retain 150 ms of trailing silence, discard most of the end-detection wait.
    const length=Math.max(0,this.samples-Math.floor(Math.max(0,this.quiet-150)*this.sampleRate/1000));
    const output=new Float32Array(length);let offset=0;
    if(valid)for(const part of this.frames){const n=Math.min(part.length,length-offset);if(n<=0)break;output.set(part.subarray(0,n),offset);offset+=n;}
    this.lastDetectionDelayMs=this.quiet;this.reset();return valid?output:null;
  }
}
