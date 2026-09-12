import {PortraitFace} from './PortraitFace.js';
import {dualSpeakerLevels,equalizerActive} from './speaker-equalizer.js';

let installed=false;

export function installDualSpeakerEqualizers(){
  if(installed)return;
  installed=true;
  const original=PortraitFace.prototype.paintHardware;
  PortraitFace.prototype.paintHardware=function(level,blink,state='IDLE',t=0,emotion='relaxed',now=performance.now()){
    // Suppress the old single-channel speech bars, while preserving every
    // other hardware/state effect drawn by PortraitFace.
    original.call(this,equalizerActive(state,level)?0:level,blink,state,t,emotion,now);
    const hardware=this.hardware;
    if(!hardware||!equalizerActive(state,level))return;
    const [x,y,width,height,mode,color]=hardware.speaker;
    // Hardware coordinates use the pack's stable 627-unit reference space,
    // independent of the source PNG resolution.
    const size=this.canvas.width,scale=size/627,ctx=this.context;
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    const levels=dualSpeakerLevels(level,t,{reducedMotion:reduced});
    const halfWidth=width*.42,gap=width*.08;
    const centres=[x-gap/2-halfWidth/2,x+gap/2+halfWidth/2];
    ctx.save();ctx.scale(scale,scale);ctx.globalCompositeOperation='screen';ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;
    const draw=(centre,values,mirror=false)=>{
      const spacing=halfWidth/4;
      values.forEach((energy,index)=>{
        const slot=mirror?2-index:index;
        if(mode==='vertical'){
          const barHeight=Math.max(5,height*(.16+energy*.72));
          ctx.fillRect(centre-halfWidth*.28+slot*spacing,y-barHeight/2,Math.max(2,halfWidth*.085),barHeight);
        }else{
          const radius=Math.max(1.8,2+energy*3.5);
          ctx.beginPath();ctx.arc(centre-halfWidth*.25+slot*spacing,y,radius,0,Math.PI*2);ctx.fill();
        }
      });
    };
    draw(centres[0],levels.left,false);draw(centres[1],levels.right,true);
    ctx.globalAlpha=.2;ctx.fillRect(x-1,y-height*.28,2,height*.56);ctx.restore();
    this.texture.needsUpdate=true;
    // Preserve the actual amplitude for paint-threshold bookkeeping.
    this.lastLevel=level;
  };
}
