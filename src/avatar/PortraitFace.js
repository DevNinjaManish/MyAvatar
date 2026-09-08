import * as THREE from 'three';

const smoothstep=value=>value*value*(3-2*value);
const ease=(rate,dt)=>1-Math.exp(-rate*dt);
const decay=(value,rate,dt)=>value*Math.exp(-rate*dt);
const poses={
  IDLE:{lift:0,pitch:0,yaw:0,roll:0,scale:0},
  LISTENING:{lift:.014,pitch:-.026,yaw:.042,roll:.018,scale:.006},
  THINKING:{lift:.006,pitch:.012,yaw:.068,roll:-.022,scale:.003},
  SPEAKING:{lift:.01,pitch:-.012,yaw:.018,roll:.006,scale:.009}
};
const blend=(from,to,amount,key)=>THREE.MathUtils.lerp(from[key]||0,to[key]||0,amount);
const characters={
  robot:{idle:.85,listening:.9,thinking:1.15,speaking:.95,tilt:.7},
  nova:{idle:1.05,listening:1.2,thinking:.8,speaking:1.1,tilt:1.25},
  butler:{idle:.48,listening:.62,thinking:.55,speaking:.58,tilt:.42},
  pixel:{idle:1.3,listening:1.38,thinking:1.42,speaking:1.35,tilt:1.08},
  luma:{idle:.9,listening:1.03,thinking:.78,speaking:.86,tilt:.9}
};
// Each portrait shares the renderer, but its movement vocabulary belongs to
// the companion. Nova is intentionally more responsive and conversational:
// she makes brief eye-contact gestures instead of looping one large idle pose.
const expressiveProfiles={
  robot:{microInterval:[5.5,10],microLift:.006,microYaw:.018,microRoll:.012,eye:'#ff9d4d'},
  nova:{microInterval:[2.6,5.1],microLift:.012,microYaw:.042,microRoll:.03,eye:'#ffb3d4'},
  butler:{microInterval:[6,11],microLift:.004,microYaw:.012,microRoll:.008,eye:'#9edfff'},
  pixel:{microInterval:[2.1,4],microLift:.01,microYaw:.035,microRoll:.028,eye:'#dcff81'},
  luma:{microInterval:[3.4,6.5],microLift:.008,microYaw:.028,microRoll:.02,eye:'#9fe7ff'}
};
const expressionPose={
  relaxed:{lift:0,pitch:0,yaw:0,roll:0},
  happy:{lift:.008,pitch:-.012,yaw:-.02,roll:.018},
  surprised:{lift:.016,pitch:.02,yaw:0,roll:0},
  sad:{lift:-.007,pitch:.012,yaw:.012,roll:-.01},
  curious:{lift:.01,pitch:.01,yaw:.03,roll:-.02}
};

/**
 * Art-directed 2.5D face used for the compact widget.
 * The illustration supplies the premium silhouette and materials. Dynamic LEDs
 * and camera shutters are composited into their real hardware locations.
 */
export class PortraitFace {
  constructor(bot,performance={}){
    this.performance={portraitSize:512,effectFps:24,...performance};
    // The portrait canvas is deliberately updated less often than the WebGL
    // transform. It keeps the illustrated face responsive without turning an
    // otherwise static 2.5D card into a full-resolution canvas animation.
    this.performance.effectFps=THREE.MathUtils.clamp(Number.isFinite(this.performance.effectFps)?this.performance.effectFps:24,1,60);
    this.bot=bot;this.scene=new THREE.Group();this.root=new THREE.Group();this.scene.add(this.root);this.root.position.y=1.30;
    const portraits={robot:'rivet',nova:'nova',butler:'sterling',pixel:'pixel',luma:'luma'};
    this.canvas=document.createElement('canvas');this.canvas.width=this.performance.portraitSize;this.canvas.height=this.performance.portraitSize;
    this.context=this.canvas.getContext('2d');
    const map=new THREE.CanvasTexture(this.canvas);map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=1;
    const portrait=new THREE.Mesh(new THREE.CircleGeometry(.625,48),new THREE.MeshBasicMaterial({map,transparent:true}));
    portrait.position.z=-.015;this.root.add(portrait);
    // Nova has a matching transparent cutout behind the circular portrait.
    // The circle covers its centre while the shoulders remain visible beyond
    // the frame, preserving all live eye/speaker effects painted above it.
    if(bot==='nova'){
      const bustMap=new THREE.TextureLoader().load('/assets/bots/nova-bust.png');
      bustMap.colorSpace=THREE.SRGBColorSpace;bustMap.generateMipmaps=false;bustMap.minFilter=THREE.LinearFilter;bustMap.magFilter=THREE.LinearFilter;
      const bust=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25),new THREE.MeshBasicMaterial({map:bustMap,transparent:true,depthWrite:false}));
      bust.position.z=-.03;bust.renderOrder=-1;this.root.add(bust);
    }
    // Source-pixel maps place the live effects within each illustrated device.
    this.hardware={
      robot:{speaker:[314,340,110,70,'vertical','#ff9d4d'],eyes:[[198,221,64,58],[407,221,48,48]]},
      nova:{speaker:[314,381,58,72,'vertical','#ff9ab9'],eyes:[[220,260,57,42],[405,260,57,42]]},
      butler:{speaker:[314,344,47,60,'dots','#75d8ff'],eyes:[[228,231,48,45],[399,231,48,45]]},
      pixel:{speaker:[314,344,82,52,'dots','#c9ff55'],eyes:[[225,242,53,43],[404,242,53,43]]},
      luma:{speaker:[314,339,80,54,'vertical','#73d8ff'],eyes:[[192,242,82,24],[435,242,82,24]]}
    }[bot]||null;
    this.character=characters[bot]||characters.robot;
    this.profile=expressiveProfiles[bot]||expressiveProfiles.robot;
    this.texture=map;this.lastLevel=-1;this.lastBlink=-1;this.lastState='';this.lastEmotion='relaxed';this.mouthValue=0;this.imageReady=false;this.lastPaintAt=0;this.lastTime=0;this.reaction=0;this.expressionKick=0;this.nextGaze=1.8;this.gaze=0;this.gazeTarget=0;this.transitionKick=0;this.dragKick=0;this.ambientKick=0;this.nextAmbient=2;this.ambientTarget={lift:0,roll:0};this.surpriseJump=0;this.nextMicroGesture=1.2;this.microGesture={lift:0,yaw:0,roll:0,scale:0};this.microTarget={...this.microGesture};this.nextIdleEyePaintAt=0;
    this.image=new Image();this.image.decoding='async';
    this.image.onload=()=>{this.imageReady=true;this.paintHardware(0,0);};
    this.image.src=`/assets/bots/${portraits[bot]||'rivet'}-portrait.png`;
  }
  update(t,blink,mouth,state,previousState='IDLE',transition=1,emotion='relaxed',previousEmotion='relaxed',emotionTransition=1,motion=1,attention={x:0,y:0,dragging:false},dt=1/60){
    const gazeRange=state==='THINKING'?.4:state==='LISTENING'?.3:state==='CURIOUS'?.1:.9;
    if(t>this.nextGaze){this.gazeTarget=(Math.random()-.5)*gazeRange;this.nextGaze=t+(state==='THINKING'?.8:2.6)+Math.random()*4.2;}
    if(t>this.nextAmbient){this.ambientKick=1;this.ambientTarget={lift:(Math.random()-.5)*.01,roll:(Math.random()-.5)*.02};this.nextAmbient=t+5+Math.random()*10;}
    if(t>this.nextMicroGesture&&!attention.dragging){
      const [minimum,maximum]=this.profile.microInterval;
      // A short lean, glance, or reset: enough to feel present without ever
      // competing with spoken content or looking like an idle-loop animation.
      this.microTarget={
        lift:(Math.random()-.5)*this.profile.microLift,
        yaw:(Math.random()-.5)*this.profile.microYaw,
        roll:(Math.random()-.5)*this.profile.microRoll,
        scale:(Math.random()-.5)*.006
      };
      this.nextMicroGesture=t+minimum+Math.random()*(maximum-minimum);
    }
    this.gaze=THREE.MathUtils.lerp(this.gaze,this.gazeTarget,ease(5.4,dt));
    for(const key of Object.keys(this.microGesture))this.microGesture[key]=THREE.MathUtils.lerp(this.microGesture[key],this.microTarget[key],ease(2.45,dt));
    this.reaction=decay(this.reaction,2.1,dt);this.transitionKick=decay(this.transitionKick,2.8,dt);this.expressionKick=decay(this.expressionKick,7.5,dt);this.dragKick=decay(this.dragKick,3.8,dt);this.ambientKick=decay(this.ambientKick,2.45,dt);this.surpriseJump=decay(this.surpriseJump,9.5,dt);
    const speaking=state==='SPEAKING',listening=state==='LISTENING',thinking=state==='THINKING';
    const eased=smoothstep(transition),from=poses[previousState]||poses.IDLE,to=poses[state]||poses.IDLE;
    const pose={lift:blend(from,to,eased,'lift'),pitch:blend(from,to,eased,'pitch'),yaw:blend(from,to,eased,'yaw'),roll:blend(from,to,eased,'roll'),scale:blend(from,to,eased,'scale')};
    const temperament=this.character[speaking?'speaking':listening?'listening':thinking?'thinking':'idle'];
    const breathSpeed=emotion==='sad'?.8:emotion==='relaxed'?.9:1;
    const breath=Math.sin(t*(speaking?2.65:1.35)*temperament*breathSpeed);
    const speechBeat=speaking?(Math.sin(t*6.2*temperament)+Math.sin(t*3.1*temperament+.8))*.5*Math.max(.18,mouth):0;
    const attentive=listening?Math.sin(t*2.4*temperament)*.009:0;
    const thoughtful=thinking?Math.sin(t*1.65*temperament)*.011:0;
    const emotionMix=smoothstep(emotionTransition),oldExpression=expressionPose[previousEmotion]||expressionPose.relaxed,newExpression=expressionPose[emotion]||expressionPose.relaxed;
    const expression={lift:blend(oldExpression,newExpression,emotionMix,'lift'),pitch:blend(oldExpression,newExpression,emotionMix,'pitch'),yaw:blend(oldExpression,newExpression,emotionMix,'yaw'),roll:blend(oldExpression,newExpression,emotionMix,'roll')};
    const characterGesture=state==='THINKING'?Math.sin(t*4.4*temperament)*.011*this.character.tilt:state==='LISTENING'?Math.sin(t*2.2*temperament)*.008*this.character.tilt:0;
    const proximity=attention.dragging?0:1;
    this.root.position.y=1.30+(breath*(speaking ? .011 : .006)+pose.lift+speechBeat*.006+expression.lift+this.transitionKick*.01+this.expressionKick*.006+this.ambientKick*this.ambientTarget.lift+this.microGesture.lift+this.surpriseJump*.02-attention.y*.008*proximity+this.dragKick*.01)*motion;
    this.root.scale.setScalar(1+(pose.scale+Math.sin(t*.8*temperament)*.0018+speechBeat*.003+this.microGesture.scale+this.dragKick*.006)*motion);
    this.root.rotation.set(
      (pose.pitch+breath*.006+speechBeat*.014+this.reaction*.018+expression.pitch-attention.y*.018*proximity)*motion,
      (pose.yaw+this.gaze*.03+attentive+thoughtful+characterGesture+expression.yaw+this.microGesture.yaw+attention.x*.038*proximity)*motion,
      (pose.roll+Math.sin(t*.56*temperament)*.006+(listening ? .008 : 0)+expression.roll+this.microGesture.roll+this.ambientKick*this.ambientTarget.roll)*motion
    );

    this.mouthValue=THREE.MathUtils.lerp(this.mouthValue,mouth,ease(18,dt));
    const now=performance.now();
    const enoughTime=now-this.lastPaintAt>=1000/this.performance.effectFps;
    // Nova gets a restrained idle eye shimmer (capped at 24 fps). It lets her
    // look present between turns while avoiding a permanent 24 fps canvas
    // repaint for every companion and every static state.
    const novaIdleEyes=this.bot==='nova'&&state==='IDLE'&&emotion==='relaxed'&&now>=this.nextIdleEyePaintAt;
    if(this.imageReady&&enoughTime&&(Math.abs(this.mouthValue-this.lastLevel)>.018||Math.abs(blink-this.lastBlink)>.04||state!==this.lastState||emotion!==this.lastEmotion||emotion!=='relaxed'||speaking||listening||thinking||novaIdleEyes))this.paintHardware(this.mouthValue,blink,state,t,emotion,now);
  }
  configure(options={}){if(Number.isFinite(options.effectFps))this.performance.effectFps=THREE.MathUtils.clamp(options.effectFps,1,60);}
  react(state,previousState='IDLE'){
    this.reaction=state==='SPEAKING'||state==='LISTENING'?1:.45;
    this.transitionKick=state==='LISTENING'||(previousState==='THINKING'&&state==='SPEAKING')?1:.45;
    if(state==='LISTENING')this.gazeTarget=.18;
  }
  reactExpression(emotion,previousEmotion='relaxed'){
    this.expressionKick=emotion==='surprised'?1:emotion==='happy'?-.55:emotion==='curious'?.45:.35;
    if(emotion==='happy')this.gazeTarget=-.24;
    if(emotion==='surprised'){this.gazeTarget=0;this.surpriseJump=1;}
    if(emotion==='curious')this.gazeTarget=0.12;
  }
  setDragging(active){if(active)this.dragKick=1;}
  paintHardware(level,blink,state='IDLE',t=0,emotion='relaxed',now=performance.now()){
    const ctx=this.context,hardware=this.hardware;if(!hardware)return;
    const size=this.canvas.width,scale=size/627;
    ctx.clearRect(0,0,size,size);ctx.drawImage(this.image,0,0,size,size);ctx.save();ctx.scale(scale,scale);
    const [x,y,width,height,mode,color]=hardware.speaker;
    // Rivet's source illustration includes a bright grille. Dim that baked
    // artwork while idle/listening so the equalizer remains an unambiguous
    // playback cue rather than a permanent "talking" signal.
    if(this.bot==='robot'&&state!=='SPEAKING'){
      ctx.save();ctx.beginPath();ctx.ellipse(x,y,width*.37,height*.49,0,0,Math.PI*2);ctx.clip();
      ctx.fillStyle='rgba(8,17,18,.72)';ctx.fillRect(x-width/2,y-height/2,width,height);
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=.22;ctx.fillStyle='#d88951';
      for(let i=0;i<7;i++)ctx.fillRect(x-width*.30+i*width*.10,y-height*.17,width*.035,height*.34);
      ctx.restore();
    }
    // Microphone input can move the shared mouth meter while the companion is
    // listening. The grille is a playback indicator, so it must only animate
    // when the companion is actually speaking.
    if(state==='SPEAKING'&&level>.015){
      ctx.save();ctx.beginPath();ctx.rect(x-width/2,y-height/2,width,height);ctx.clip();
      ctx.globalCompositeOperation='screen';ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;
      for(let i=0;i<7;i++){
        const energy=.35+level*(.65*Math.abs(Math.sin(i*1.31+performance.now()*.018))+.45);
        if(mode==='vertical'){
          const barHeight=Math.max(7,height*energy);ctx.fillRect(x-width*.35+i*width*.10,y-barHeight/2,width*.045,barHeight);
        }else{
          const radius=Math.max(2,3+energy*4);ctx.beginPath();ctx.arc(x-width*.30+i*width*.10,y,radius,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.restore();
    }
    if(blink>.02){
      // A camera iris briefly contracts; it is intentionally subtle, not an eyelid overlay.
      ctx.save();ctx.fillStyle=`rgba(10,16,24,${Math.min(.62,blink*.72)})`;
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){
        ctx.beginPath();ctx.ellipse(eyeX,eyeY,rx*.76,Math.max(3,ry*.48*blink),0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    // Keep state feedback inside the illustrated camera and speaker hardware.
    if(state==='LISTENING'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=color;ctx.globalAlpha=.38+.22*Math.sin(t*5);ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y,Math.max(width,height)*(.53+.05*Math.sin(t*5)),0,Math.PI*2);ctx.stroke();
      for(const [eyeX,eyeY] of hardware.eyes){ctx.fillStyle=color;ctx.beginPath();ctx.arc(eyeX,eyeY,3+Math.sin(t*6)*1.5,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    if(this.bot==='nova'){
      // Nova's image is intentionally kept intact. These lightweight overlays
      // add living eye contact and state cues inside the existing lenses.
      ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=this.profile.eye;
      const shimmer=state==='SPEAKING'?.64+.24*Math.sin(t*7):state==='LISTENING'?.48+.18*Math.sin(t*4):.26;
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){
        const glintX=eyeX+this.gaze*rx*.32;
        ctx.globalAlpha=shimmer;ctx.beginPath();ctx.arc(glintX,eyeY-ry*.18,Math.max(2,rx*.075),0,Math.PI*2);ctx.fill();
        if(state==='LISTENING'){
          ctx.globalAlpha=.24+.14*Math.sin(t*5);ctx.lineWidth=1.5;ctx.strokeStyle=this.profile.eye;
          ctx.beginPath();ctx.ellipse(eyeX,eyeY,rx*.82,ry*.78,0,0,Math.PI*2);ctx.stroke();
        }else if(state==='THINKING'){
          ctx.globalAlpha=.32;ctx.fillRect(eyeX-rx*.55+(Math.sin(t*3+eyeX)*.5+.5)*rx*.8,eyeY-1,rx*.22,2);
        }
      }
      ctx.restore();
    }
    if(state==='THINKING'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=color;ctx.globalAlpha=.75;
      for(const [eyeX,eyeY,rx] of hardware.eyes){const sweep=eyeX-rx*.46+(Math.sin(t*3)+1)*rx*.46;ctx.fillRect(sweep,eyeY-2,3,4);}ctx.restore();
    }
    if(emotion!=='relaxed'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=color;ctx.fillStyle=color;
      if(emotion==='happy'){
        ctx.globalAlpha=.4+.18*Math.sin(t*4);ctx.lineWidth=1.5;
        for(const [eyeX,eyeY,rx,ry] of hardware.eyes){ctx.beginPath();ctx.arc(eyeX,eyeY,Math.max(rx,ry)*.82,0,Math.PI*2);ctx.stroke();}
      }else if(emotion==='surprised'){
        ctx.globalAlpha=.38;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,Math.max(width,height)*.72,0,Math.PI*2);ctx.stroke();
      }else if(emotion==='sad'){
        ctx.globalAlpha=.24;ctx.fillRect(x-width*.22,y+height*.36,width*.44,2);
      }else if(emotion==='curious'){
        ctx.globalAlpha=.4+.18*Math.sin(t*3);ctx.lineWidth=1;ctx.strokeStyle=color;
        ctx.beginPath();ctx.arc(x,y,Math.max(width,height)*(.4+.02*Math.sin(t*3)),0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    }
    // Tiny physical diagnostic panel: a pulse, scan dots, or a confirmation tick.
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=color;ctx.globalAlpha=.55+.35*Math.sin(t*4);
    const panelY=y+height*.62;
    if(state==='THINKING')for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x-7+i*7,panelY,1.7+(i===Math.floor(t*4)%3?1:0),0,Math.PI*2);ctx.fill();}
    else if(state==='LISTENING'){ctx.beginPath();ctx.arc(x,panelY,3.5+Math.sin(t*5),0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();}
    else if(state==='SPEAKING'){ctx.fillRect(x-6,panelY-2,3,4);ctx.fillRect(x-1,panelY-4,3,8);ctx.fillRect(x+4,panelY-2,3,4);}
    else{ctx.fillRect(x-4,panelY,3,2);ctx.fillRect(x-1,panelY+2,3,2);ctx.fillRect(x+2,panelY-2,3,2);}ctx.restore();
    ctx.restore();
    this.texture.needsUpdate=true;this.lastLevel=level;this.lastBlink=blink;this.lastState=state;this.lastEmotion=emotion;this.lastTime=t;this.lastPaintAt=now;
    if(this.bot==='nova')this.nextIdleEyePaintAt=now+1000/Math.min(this.performance.effectFps,24);
  }
  dispose(){this.scene.traverse(object=>{object.geometry?.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>{material.map?.dispose();material.dispose();});}});}
}
