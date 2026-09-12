import * as THREE from 'three';

const smoothstep=value=>value*value*(3-2*value);
const ease=(rate,dt)=>1-Math.exp(-rate*dt);
const decay=(value,rate,dt)=>value*Math.exp(-rate*dt);
const poses={
  IDLE:{lift:0,pitch:0,yaw:0,roll:0,scale:0},
  LISTENING:{lift:.014,pitch:-.026,yaw:.042,roll:.018,scale:.006},
  THINKING:{lift:.006,pitch:.012,yaw:.068,roll:-.022,scale:.003},
  SPEAKING:{lift:.01,pitch:-.012,yaw:.018,roll:.006,scale:.009},
  WORKING:{lift:.003,pitch:.016,yaw:-.035,roll:.012,scale:.001},
  PAUSED:{lift:-.008,pitch:.018,yaw:0,roll:0,scale:-.004},
  SLEEPING:{lift:-.016,pitch:.035,yaw:0,roll:0,scale:-.008},
  ERROR:{lift:-.004,pitch:.012,yaw:.025,roll:-.018,scale:-.002},
  RECOVERY:{lift:.004,pitch:-.006,yaw:-.018,roll:.008,scale:.002}
};
const blend=(from,to,amount,key)=>THREE.MathUtils.lerp(from[key]||0,to[key]||0,amount);
const characters={
  rivet:{idle:.85,listening:.9,thinking:1.15,speaking:.95,tilt:.7},
  nova:{idle:1.05,listening:1.2,thinking:.8,speaking:1.1,tilt:1.25},
  sterling:{idle:.48,listening:.62,thinking:.55,speaking:.58,tilt:.42},
  pixel:{idle:1.3,listening:1.38,thinking:1.42,speaking:1.35,tilt:1.08},
  luma:{idle:.9,listening:1.03,thinking:.78,speaking:.86,tilt:.9}
};
// Each portrait shares the renderer, but its movement vocabulary belongs to
// the companion. Nova is intentionally more responsive and conversational:
// she makes brief eye-contact gestures instead of looping one large idle pose.
const expressiveProfiles={
  rivet:{microInterval:[5.5,10],microLift:.006,microYaw:.018,microRoll:.012,eye:'#ff9d4d',lightSpeed:1.05},
  nova:{microInterval:[2.6,5.1],microLift:.012,microYaw:.042,microRoll:.03,eye:'#ffb3d4',lightSpeed:.82},
  sterling:{microInterval:[6,11],microLift:.004,microYaw:.012,microRoll:.008,eye:'#9edfff',lightSpeed:.48},
  pixel:{microInterval:[2.1,4],microLift:.01,microYaw:.035,microRoll:.028,eye:'#dcff81',lightSpeed:1.55},
  luma:{microInterval:[3.4,6.5],microLift:.008,microYaw:.028,microRoll:.02,eye:'#9fe7ff',lightSpeed:.68}
};
const expressionPose={
  relaxed:{lift:0,pitch:0,yaw:0,roll:0},
  happy:{lift:.008,pitch:-.012,yaw:-.02,roll:.018},
  surprised:{lift:.016,pitch:.02,yaw:0,roll:0},
  sad:{lift:-.007,pitch:.012,yaw:.012,roll:-.01},
  curious:{lift:.01,pitch:.01,yaw:.03,roll:-.02}
};
const personaMotion=(bot,state,t,mouth)=>{
  const speaking=state==='SPEAKING',listening=state==='LISTENING',thinking=state==='THINKING';
  const energy=Math.max(.2,mouth);
  switch(bot){
    case 'rivet':
      // Rivet surveys problems in short, precise mechanical passes and gives
      // compact confirmation nods while explaining a fix.
      return {
        lift:speaking?Math.sin(t*5.2)*.003*energy:0,
        pitch:thinking?Math.sin(t*6.4)*.006:speaking?-Math.abs(Math.sin(t*3.8))*.007*energy:0,
        yaw:thinking?Math.sin(t*2.8)*.018:listening?Math.sin(t*1.3)*.005:0,
        roll:thinking?Math.sin(t*5.6)*.004:0,scale:0
      };
    case 'nova':
      // Nova maintains social eye contact, leans toward the user, and speaks
      // with a gentle conversational sway rather than a mechanical rhythm.
      return {
        lift:listening?.005*Math.sin(t*1.45):speaking?.004*Math.sin(t*2.1):0,
        pitch:listening?-.008+.003*Math.sin(t*1.8):speaking?.006*Math.sin(t*1.7)*energy:0,
        yaw:thinking?.014*Math.sin(t*.9):speaking?.009*Math.sin(t*1.3)*energy:0,
        roll:.006*Math.sin(t*(speaking?1.9:.72)),scale:listening?.003:0
      };
    case 'sterling':
      // Sterling stays composed. His motion is economical: an attentive lean
      // and slow, deliberate nods at the end of spoken phrases.
      return {
        lift:0,
        pitch:listening?-.005:speaking?-Math.abs(Math.sin(t*1.65))*.005*energy:thinking?.003*Math.sin(t*.7):0,
        yaw:thinking?.006*Math.sin(t*.55):0,
        roll:listening?-.003:thinking?.004*Math.sin(t*.48):0,scale:0
      };
    case 'pixel':
      // Pixel anticipates, bounces, and changes direction quickly. The motion
      // remains continuous so the energy never reads as visual jitter.
      return {
        lift:(speaking?Math.abs(Math.sin(t*4.2))*.008*energy:listening?Math.sin(t*2.8)*.005:Math.sin(t*1.9)*.002),
        pitch:speaking?Math.sin(t*4.2)*.008*energy:listening?-.009:0,
        yaw:thinking?Math.sin(t*3.1)*.016:speaking?Math.sin(t*2.8)*.01*energy:0,
        roll:Math.sin(t*(thinking?2.4:1.7))*(thinking?.01:.006),
        scale:listening?.004+Math.sin(t*2.8)*.002:speaking?Math.abs(Math.sin(t*4.2))*.003*energy:0
      };
    case 'luma':
      // Luma inspects a composition from several angles, pausing in thoughtful
      // asymmetry before returning to centre.
      return {
        lift:thinking?.003*Math.sin(t*.8):0,
        pitch:thinking?.006*Math.sin(t*.72):listening?-.004:0,
        yaw:thinking?.013*Math.cos(t*.62):listening?.006*Math.sin(t*.9):0,
        roll:thinking?.014*Math.sin(t*.78):speaking?.005*Math.sin(t*1.2):.003*Math.sin(t*.45),
        scale:thinking?.002*Math.sin(t*.8):0
      };
    default:return {lift:0,pitch:0,yaw:0,roll:0,scale:0};
  }
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
    const portraits={rivet:'rivet',nova:'nova',sterling:'sterling',pixel:'pixel',luma:'luma'};
    this.canvas=document.createElement('canvas');this.canvas.width=this.performance.portraitSize;this.canvas.height=this.performance.portraitSize;
    this.context=this.canvas.getContext('2d');
    const map=new THREE.CanvasTexture(this.canvas);map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=1;
    // The portrait is the live face layer; the dedicated upper-body art below
    // it gets enough room to cross the circular frame for every companion.
    const portraitRadius=.565;
    this.portrait=new THREE.Mesh(new THREE.CircleGeometry(portraitRadius,48),new THREE.MeshBasicMaterial({map,transparent:true}));
    this.portrait.position.z=-.015;this.root.add(this.portrait);
    // One canonical asset pack is used at runtime: portrait.png owns the live
    // face hardware, body.png supplies transparent depth, and hands.png is an
    // optional foreground gesture layer. Stable names keep release labels out
    // of the artwork contract.
    this.body=null;this.bodyShadow=null;this.hands=null;
    const bodyProfiles={
      rivet:{asset:'rivet/body.png',hands:'hands.png',fade:[.44,.59],size:1.48,y:-.15},
      nova:{asset:'nova/body.png',hands:'hands.png',fade:[.47,.62],size:1.48,y:-.145},
      sterling:{asset:'sterling/body.png',hands:'hands.png',fade:[.43,.58],size:1.46,y:-.15},
      pixel:{asset:'pixel/body.png',hands:'hands.png',fade:[.46,.61],size:1.49,y:-.15},
      luma:{asset:'luma/body.png',hands:'hands.png',fade:[.42,.57],size:1.48,y:-.15}
    };
    this.bodyProfile=bodyProfiles[bot]||null;
    if(this.bodyProfile){
      const bodyMap=new THREE.TextureLoader().load(`/assets/bots/${this.bodyProfile.asset}`);
      bodyMap.colorSpace=THREE.SRGBColorSpace;bodyMap.generateMipmaps=false;bodyMap.minFilter=THREE.LinearFilter;bodyMap.magFilter=THREE.LinearFilter;
      const maskCanvas=document.createElement('canvas');maskCanvas.width=4;maskCanvas.height=256;
      const maskContext=maskCanvas.getContext('2d'),maskGradient=maskContext.createLinearGradient(0,0,0,256);
      maskGradient.addColorStop(0,'#000');maskGradient.addColorStop(this.bodyProfile.fade[0],'#000');maskGradient.addColorStop(this.bodyProfile.fade[1],'#fff');maskGradient.addColorStop(.91,'#fff');maskGradient.addColorStop(1,'#000');
      maskContext.fillStyle=maskGradient;maskContext.fillRect(0,0,4,256);
      const bodyMask=new THREE.CanvasTexture(maskCanvas);bodyMask.generateMipmaps=false;bodyMask.minFilter=THREE.LinearFilter;bodyMask.magFilter=THREE.LinearFilter;
      const bodyGeometry=new THREE.PlaneGeometry(this.bodyProfile.size,this.bodyProfile.size);
      this.bodyShadow=new THREE.Mesh(bodyGeometry.clone(),new THREE.MeshBasicMaterial({map:bodyMap,alphaMap:bodyMask,color:'#120b12',opacity:.48,transparent:true,depthWrite:false}));
      this.bodyShadow.position.set(.018,this.bodyProfile.y-.025,-.045);this.bodyShadow.scale.setScalar(1.025);this.bodyShadow.renderOrder=-2;this.root.add(this.bodyShadow);
      this.body=new THREE.Mesh(bodyGeometry,new THREE.MeshBasicMaterial({map:bodyMap,alphaMap:bodyMask,transparent:true,depthWrite:false}));
      this.body.position.set(0,this.bodyProfile.y,-.03);this.body.renderOrder=-1;this.root.add(this.body);
      if(this.bodyProfile.hands){
        const handsMap=new THREE.TextureLoader().load(`/assets/bots/${bot}/${this.bodyProfile.hands}`);
        handsMap.colorSpace=THREE.SRGBColorSpace;handsMap.generateMipmaps=false;handsMap.minFilter=THREE.LinearFilter;handsMap.magFilter=THREE.LinearFilter;
        this.hands=new THREE.Mesh(bodyGeometry.clone(),new THREE.MeshBasicMaterial({map:handsMap,opacity:0,transparent:true,depthWrite:false}));
        this.hands.position.set(0,this.bodyProfile.y-.1,.01);this.hands.scale.setScalar(.84);this.hands.renderOrder=2;this.root.add(this.hands);
      }
    }
    // Source-pixel maps place the live effects within each illustrated device.
    this.hardware={
      rivet:{speaker:[314,340,110,70,'vertical','#ff9d4d'],eyes:[[198,221,64,58],[407,221,48,48]]},
      nova:{speaker:[314,381,58,72,'vertical','#ff9ab9'],eyes:[[220,260,57,42],[405,260,57,42]]},
      sterling:{speaker:[314,344,47,60,'dots','#75d8ff'],eyes:[[228,231,48,45],[399,231,48,45]]},
      pixel:{speaker:[314,344,82,52,'dots','#c9ff55'],eyes:[[225,242,53,43],[404,242,53,43]]},
      luma:{speaker:[314,339,80,54,'vertical','#73d8ff'],eyes:[[192,242,82,24],[435,242,82,24]]}
    }[bot]||null;
    this.character=characters[bot]||characters.rivet;this.visualProfile='balanced';this.reduceEffects=false;
    this.profile=expressiveProfiles[bot]||expressiveProfiles.rivet;
    this.texture=map;this.lastLevel=-1;this.lastBlink=-1;this.lastState='';this.lastEmotion='relaxed';this.mouthValue=0;this.handOpacity=0;this.imageReady=false;this.lastPaintAt=0;this.lastTime=0;this.reaction=0;this.expressionKick=0;this.nextGaze=1.8;this.gaze=0;this.gazeTarget=0;this.transitionKick=0;this.dragKick=0;this.ambientKick=0;this.nextAmbient=2;this.ambientTarget={lift:0,roll:0};this.surpriseJump=0;this.nextMicroGesture=1.2;this.microGesture={lift:0,yaw:0,roll:0,scale:0};this.microTarget={...this.microGesture};this.nextIdleLightPaintAt=0;
    this.image=new Image();this.image.decoding='async';
    this.image.onload=()=>{this.imageReady=true;this.paintHardware(0,0);};
    this.image.src=`/assets/bots/${portraits[bot]||'rivet'}/portrait.png`;
  }
  update(t,blink,mouth,state,previousState='IDLE',transition=1,emotion='relaxed',previousEmotion='relaxed',emotionTransition=1,motion=1,attention={x:0,y:0,dragging:false},dt=1/60){
    const gazeRange=state==='THINKING'||state==='WORKING'?.4:state==='LISTENING'?.3:['SLEEPING','PAUSED'].includes(state)?0:.9;
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
    const speaking=state==='SPEAKING',listening=state==='LISTENING',thinking=state==='THINKING',working=state==='WORKING',sleeping=state==='SLEEPING',errored=state==='ERROR',recovering=state==='RECOVERY';
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
    const characterGesture=thinking?Math.sin(t*4.4*temperament)*.011*this.character.tilt:listening?Math.sin(t*2.2*temperament)*.008*this.character.tilt:working?Math.sin(t*1.3*temperament)*.004:errored?Math.sin(t*13)*.003:recovering?Math.sin(t*2.2)*.003:0;
    const signature=personaMotion(this.bot,state,t,this.mouthValue);
    const proximity=attention.dragging?0:1;
    const stateBreath=sleeping?.002:working?.004:.006;
    const tint=sleeping?'#59636a':state==='PAUSED'?'#818b90':errored?'#ff9ca1':recovering?'#b8f3f5':working?'#fff1d0':'#ffffff';
    this.portrait.material.color.set(tint);
    if(this.body)this.body.material.color.set(tint);
    if(this.hands)this.hands.material.color.set(tint);
    if(this.bodyShadow)this.bodyShadow.material.opacity=sleeping?.68:errored?.56:.48;
    this.root.position.y=1.30+(breath*(speaking ? .011 : stateBreath)+pose.lift+signature.lift+speechBeat*.006+expression.lift+this.transitionKick*.01+this.expressionKick*.006+this.ambientKick*this.ambientTarget.lift+this.microGesture.lift+this.surpriseJump*.02-attention.y*.008*proximity+this.dragKick*.01)*motion;
    this.root.scale.setScalar(1+(pose.scale+signature.scale+Math.sin(t*.8*temperament)*.0018+speechBeat*.003+this.microGesture.scale+this.dragKick*.006)*motion);
    this.root.rotation.set(
      (pose.pitch+signature.pitch+breath*.006+speechBeat*.014+this.reaction*.018+expression.pitch-attention.y*.018*proximity)*motion,
      (pose.yaw+signature.yaw+this.gaze*.03+attentive+thoughtful+characterGesture+expression.yaw+this.microGesture.yaw+attention.x*.038*proximity)*motion,
      (pose.roll+signature.roll+Math.sin(t*.56*temperament)*.006+(listening ? .008 : 0)+expression.roll+this.microGesture.roll+this.ambientKick*this.ambientTarget.roll)*motion
    );
    if(this.body){
      // A small counter-shift separates the torso from the face like two
      // physical depth planes. The circular portrait hides their join.
      this.body.position.x=-attention.x*.016*motion;
      this.body.position.y=this.bodyProfile.y+breath*.005*motion;
      this.body.rotation.z=-this.root.rotation.z*.12;
      this.bodyShadow.position.x=.018-attention.x*.009*motion;
      this.bodyShadow.position.y=this.bodyProfile.y-.025+breath*.002*motion;
      this.bodyShadow.rotation.z=-this.root.rotation.z*.06;
      if(this.hands){
        // Hands are a bounded foreground cue, never a permanent idle layer.
        // Fast/reduced-motion profiles omit them completely; Balanced fades
        // them in only while listening or speaking.
        const handTarget=this.reduceEffects?0:speaking?.52:listening?.14:0;
        this.handOpacity=THREE.MathUtils.lerp(this.handOpacity,handTarget,ease(handTarget>this.handOpacity?4.2:6.5,dt));
        this.hands.material.opacity=this.handOpacity;
        this.hands.visible=this.handOpacity>.01;
        const gesture=speaking?Math.sin(t*2.1)*.006:listening?Math.sin(t*1.2)*.002:0;
        this.hands.position.x=-attention.x*.01*motion;
        this.hands.position.y=this.bodyProfile.y-.1+gesture*motion;
        this.hands.rotation.z=-this.root.rotation.z*.05;
      }
    }

    this.mouthValue=THREE.MathUtils.lerp(this.mouthValue,mouth,ease(18,dt));
    const now=performance.now();
    const enoughTime=now-this.lastPaintAt>=1000/this.performance.effectFps;
    // Presence lights move gently even at rest. Idle repaints are capped at
    // 12 fps; active states still use the configured effect rate.
    const idleLights=state==='IDLE'&&now>=this.nextIdleLightPaintAt;
    const activeState=speaking||listening||thinking||working||sleeping||errored||recovering;
    if(this.imageReady&&enoughTime&&(Math.abs(this.mouthValue-this.lastLevel)>.018||Math.abs(blink-this.lastBlink)>.04||state!==this.lastState||emotion!==this.lastEmotion||emotion!=='relaxed'||activeState||idleLights))this.paintHardware(this.mouthValue,blink,state,t,emotion,now);
  }
  configure(options={}){if(Number.isFinite(options.effectFps))this.performance.effectFps=THREE.MathUtils.clamp(options.effectFps,1,60);if(['fast','balanced'].includes(options.profile))this.visualProfile=options.profile;this.reduceEffects=options.reducedMotion===true||this.visualProfile==='fast';}
  react(state,previousState='IDLE'){
    this.reaction=state==='SPEAKING'||state==='LISTENING'?1:state==='ERROR'?.15:.45;
    this.transitionKick=state==='LISTENING'||(previousState==='THINKING'&&state==='SPEAKING')?1:.45;
    if(state==='LISTENING')this.gazeTarget=.18;
    if(state==='SLEEPING'||state==='PAUSED')this.gazeTarget=0;
    if(state==='RECOVERY')this.gazeTarget=-.12;
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
    // Every source portrait contains a baked grille highlight. Neutralize it
    // first so a lit mouth always means audible companion speech. Microphone
    // input, listening, thinking, and idle states never illuminate the grille.
    ctx.save();ctx.beginPath();
    if(this.bot==='rivet')ctx.ellipse(x,y,width*.39,height*.49,0,0,Math.PI*2);
    else ctx.roundRect(x-width/2,y-height/2,width,height,Math.min(width,height)*.24);
    ctx.clip();ctx.fillStyle=state==='SPEAKING'?'rgba(5,9,11,.64)':'rgba(5,9,11,.84)';ctx.fillRect(x-width/2,y-height/2,width,height);
    ctx.strokeStyle='rgba(184,194,190,.22)';ctx.lineWidth=1;
    if(mode==='vertical'){
      for(let i=0;i<7;i++){const barX=x-width*.30+i*width*.10;ctx.beginPath();ctx.moveTo(barX,y-height*.24);ctx.lineTo(barX,y+height*.24);ctx.stroke();}
    }else{
      ctx.fillStyle='rgba(184,194,190,.2)';
      for(let row=-1;row<=1;row++)for(let column=-2;column<=2;column++){ctx.beginPath();ctx.arc(x+column*width*.13,y+row*height*.18,1.5,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
    // The TTS output level is the sole source of active mouth light.
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
    this.paintPresenceLights(ctx,hardware,state,t,blink);
    // Keep state feedback inside the illustrated camera and speaker hardware.
    if(state==='LISTENING'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=color;ctx.globalAlpha=.38+.22*Math.sin(t*5);ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x,y,Math.max(width,height)*(.53+.05*Math.sin(t*5)),0,Math.PI*2);ctx.stroke();
      for(const [eyeX,eyeY] of hardware.eyes){ctx.fillStyle=color;ctx.beginPath();ctx.arc(eyeX,eyeY,3+Math.sin(t*6)*1.5,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    if(state==='THINKING'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=color;ctx.globalAlpha=.75;
      for(const [eyeX,eyeY,rx] of hardware.eyes){const sweep=eyeX-rx*.46+(Math.sin(t*3)+1)*rx*.46;ctx.fillRect(sweep,eyeY-2,3,4);}ctx.restore();
    }
    if(state==='WORKING'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=color;ctx.globalAlpha=.35;ctx.lineWidth=2;
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){const sweep=(Math.sin(t*2.2)*.5+.5)*rx*1.2-rx*.6;ctx.beginPath();ctx.moveTo(eyeX+sweep,eyeY-ry*.45);ctx.lineTo(eyeX+sweep,eyeY+ry*.45);ctx.stroke();}ctx.restore();
    }
    if(state==='SLEEPING'||state==='PAUSED'){
      ctx.save();ctx.fillStyle=`rgba(4,7,10,${state==='SLEEPING'?.68:.46})`;
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){ctx.beginPath();ctx.ellipse(eyeX,eyeY,rx*.82,Math.max(3,ry*(state==='SLEEPING'?.13:.28)),0,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    if(state==='ERROR'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='#ff696f';ctx.fillStyle='#ff696f';ctx.globalAlpha=.58;ctx.lineWidth=2;
      for(const [eyeX,eyeY,rx] of hardware.eyes){ctx.beginPath();ctx.moveTo(eyeX-rx*.35,eyeY);ctx.lineTo(eyeX+rx*.35,eyeY);ctx.stroke();}
      if(!this.reduceEffects){const jitter=Math.sin(t*31)*4;ctx.fillRect(x-width*.28+jitter,y-height*.08,width*.56,2);}ctx.restore();
    }
    if(state==='RECOVERY'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=color;ctx.globalAlpha=.25+.22*Math.sin(t*3);ctx.lineWidth=2;
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){ctx.beginPath();ctx.ellipse(eyeX,eyeY,rx*(.45+.2*Math.sin(t*1.7)),ry*(.45+.2*Math.sin(t*1.7)),0,0,Math.PI*2);ctx.stroke();}ctx.restore();
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
    else if(state==='WORKING'){const progress=(Math.sin(t*1.8)*.5+.5)*12;ctx.fillRect(x-7,panelY-1,progress,2);}
    else if(state==='SLEEPING'||state==='PAUSED'){ctx.globalAlpha=.25;ctx.fillRect(x-5,panelY,10,1);}
    else if(state==='ERROR'){ctx.fillStyle='#ff696f';ctx.fillRect(x-5,panelY-1,10,2);}
    else if(state==='RECOVERY'){ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,panelY,4+Math.sin(t*2),0,Math.PI*2);ctx.stroke();}
    else if(state==='LISTENING'){ctx.beginPath();ctx.arc(x,panelY,3.5+Math.sin(t*5),0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();}
    else if(state==='SPEAKING'){ctx.fillRect(x-6,panelY-2,3,4);ctx.fillRect(x-1,panelY-4,3,8);ctx.fillRect(x+4,panelY-2,3,4);}
    else{ctx.fillRect(x-4,panelY,3,2);ctx.fillRect(x-1,panelY+2,3,2);ctx.fillRect(x+2,panelY-2,3,2);}ctx.restore();
    ctx.restore();
    this.texture.needsUpdate=true;this.lastLevel=level;this.lastBlink=blink;this.lastState=state;this.lastEmotion=emotion;this.lastTime=t;this.lastPaintAt=now;
    this.nextIdleLightPaintAt=now+1000/Math.min(this.performance.effectFps,12);
  }
  paintPresenceLights(ctx,hardware,state,t,blink){
    const active=state==='SPEAKING'?1:state==='LISTENING'?.82:state==='THINKING'?.7:state==='WORKING'?.62:state==='RECOVERY'?.5:state==='ERROR'?.25:state==='SLEEPING'?.08:state==='PAUSED'?.14:.42;
    const phase=t*this.profile.lightSpeed;
    const color=this.profile.eye;
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=color;ctx.strokeStyle=color;
    if(this.bot==='rivet'){
      // Rivet performs a measured diagnostic sweep across the camera and scope.
      const [camera,scope]=hardware.eyes,angle=phase%(Math.PI*2);
      ctx.globalAlpha=.16+.18*active;ctx.lineWidth=2.2;
      ctx.beginPath();ctx.arc(camera[0],camera[1],camera[2]*.72,angle,angle+Math.PI*.42);ctx.stroke();
      const scan=(Math.sin(phase*2.4)*.5+.5)*scope[2]*1.1;
      ctx.globalAlpha=.12+.24*active;ctx.fillRect(scope[0]-scope[2]*.55+scan,scope[1]-scope[3]*.42,2,scope[3]*.84);
    }else if(this.bot==='nova'){
      // Nova uses soft moving catchlights that follow her conversational gaze.
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){
        const orbit=phase+(eyeX<314?0:Math.PI*.28),glintX=eyeX+this.gaze*rx*.32+Math.sin(orbit)*rx*.1;
        ctx.globalAlpha=(.2+.34*active)*(1-blink*.65);ctx.shadowColor=color;ctx.shadowBlur=6;
        ctx.beginPath();ctx.arc(glintX,eyeY-ry*.2+Math.cos(orbit)*ry*.06,Math.max(2,rx*.075),0,Math.PI*2);ctx.fill();
      }
    }else if(this.bot==='sterling'){
      // Sterling's slow paired glints move in lockstep like polished optics.
      for(const [eyeX,eyeY,rx,ry] of hardware.eyes){
        const travel=Math.sin(phase)*rx*.2;
        ctx.globalAlpha=(.16+.2*active)*(1-blink*.7);ctx.beginPath();ctx.ellipse(eyeX+travel,eyeY-ry*.22,rx*.07,ry*.11,0,0,Math.PI*2);ctx.fill();
      }
    }else if(this.bot==='pixel'){
      // Pixel's lively LEDs chase between the two lenses without touching the mouth.
      hardware.eyes.forEach(([eyeX,eyeY,rx,ry],index)=>{
        const angle=phase*2.4+index*Math.PI;
        ctx.globalAlpha=.16+.3*active;ctx.beginPath();ctx.arc(eyeX+Math.cos(angle)*rx*.62,eyeY+Math.sin(angle)*ry*.54,2.4,0,Math.PI*2);ctx.fill();
      });
    }else if(this.bot==='luma'){
      // Luma's visor carries a slow cyan composition scan and two focus points.
      const left=hardware.eyes[0],right=hardware.eyes[1];
      const scanX=left[0]-left[2]*.58+(Math.sin(phase)*.5+.5)*(right[0]-left[0]+right[2]*1.16);
      ctx.globalAlpha=.1+.19*active;ctx.fillRect(scanX,left[1]-left[3]*.72,2,left[3]*1.44);
      for(const [eyeX,eyeY,rx] of hardware.eyes){ctx.globalAlpha=.18+.24*active;ctx.beginPath();ctx.arc(eyeX+Math.sin(phase*.7)*rx*.08,eyeY,2.2,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  dispose(){this.scene.traverse(object=>{object.geometry?.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>{material.map?.dispose();material.dispose();});}});}
}
