import * as THREE from 'three';
import {PortraitFace} from './PortraitFace.js';

/** Shared renderer and animation state for the four built-in robot portraits. */
export class Avatar {
  constructor(container){
    this.container=container;this.performance={maxFps:45,pixelRatio:1.25,portraitSize:512,effectFps:24};
    this.state='IDLE';this.previousState='IDLE';this.stateStarted=0;this.mouth=0;this.mouthTarget=0;this.emotion='relaxed';this.previousEmotion='relaxed';this.emotionStarted=0;this.time=0;this.nextBlink=2;this.blinkStart=-10;
    this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    this.attention={x:0,y:0,targetX:0,targetY:0,dragging:false};
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(30,1,.1,100);this.camera.position.set(0,1.30,1.95);this.camera.lookAt(0,1.30,0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.performance.pixelRatio));container.append(this.renderer.domElement);
    this.robot=new PortraitFace('robot',this.performance);this.bot='robot';this.scene.add(this.robot.scene);
    this.resize=()=>{const {width,height}=this.container.getBoundingClientRect();this.camera.aspect=width/height;this.camera.position.z=2.55/Math.min(1,width/height);this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);};
    new ResizeObserver(this.resize).observe(container);
    container.addEventListener('pointermove',event=>{
      if(this.reducedMotion||document.body.classList.contains('dragging'))return;
      const bounds=container.getBoundingClientRect();
      this.attention.targetX=THREE.MathUtils.clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1);
      this.attention.targetY=THREE.MathUtils.clamp((event.clientY-bounds.top)/bounds.height*2-1,-1,1);
    });
    container.addEventListener('pointerleave',()=>{this.attention.targetX=0;this.attention.targetY=0;});
    this.clock=new THREE.Clock();this.frames=0;this.frameTime=0;this.fps=0;this.maxFps=this.performance.maxFps;this.lastFrame=0;
    this.renderer.setAnimationLoop(now=>{if(now-this.lastFrame<1000/this.maxFps-.5)return;this.lastFrame=now;this.update();});
  }
  showRobot(bot='robot'){
    if(this.bot===bot)return;
    this.scene.remove(this.robot.scene);this.robot.dispose();this.robot=new PortraitFace(bot,this.performance);this.bot=bot;this.scene.add(this.robot.scene);
  }
  configure(options={}){for(const key of ['maxFps','pixelRatio','portraitSize','effectFps'])if(Number.isFinite(options[key]))this.performance[key]=options[key];this.maxFps=this.performance.maxFps;this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.performance.pixelRatio));this.resize();this.robot.configure(this.performance);}
  setState(state){
    if(this.state===state)return;
    this.previousState=this.state;this.state=state;this.stateStarted=this.time;
    this.robot.react(state,this.previousState);
  }
  setMouth(value){this.mouthTarget=THREE.MathUtils.clamp(value,0,1);}
  setDragging(active){this.attention.dragging=active;this.robot.setDragging(active);}
  setExpression(value){
    if(this.emotion===value)return;
    this.previousEmotion=this.emotion;this.emotion=value;this.emotionStarted=this.time;
    this.robot.reactExpression(value,this.previousEmotion);this.onExpression?.(value);
  }
  update(){
    const elapsed=this.clock.getDelta(),dt=Math.min(elapsed,.05);this.time+=dt;
    if(this.time>this.nextBlink){this.blinkStart=this.time;this.nextBlink=this.time+2.7+Math.random()*3.8;}
    const blink=Math.max(0,1-Math.abs((this.time-this.blinkStart-.09)/.09));
    const mouthSpeed=this.mouthTarget>this.mouth?Math.min(1,dt*15):Math.min(1,dt*8);
    this.mouth=THREE.MathUtils.lerp(this.mouth,this.mouthTarget,mouthSpeed);
    this.attention.x=THREE.MathUtils.lerp(this.attention.x,this.attention.targetX,Math.min(1,dt*5));
    this.attention.y=THREE.MathUtils.lerp(this.attention.y,this.attention.targetY,Math.min(1,dt*5));
    this.container.style.setProperty('--avatar-light-x',`${50+this.attention.x*12}%`);
    this.container.style.setProperty('--avatar-light-y',`${44+this.attention.y*9}%`);
    const transition=Math.min(1,(this.time-this.stateStarted)/(this.reducedMotion ? .01 : .32));
    const emotionTransition=Math.min(1,(this.time-this.emotionStarted)/(this.reducedMotion ? .01 : .22));
    this.robot.update(this.time,blink,this.mouth,this.state,this.previousState,transition,this.emotion,this.previousEmotion,emotionTransition,this.reducedMotion?0:1,this.attention);
    this.renderer.render(this.scene,this.camera);this.frames++;this.frameTime+=elapsed;
    if(this.frameTime>1){this.fps=Math.round(this.frames/this.frameTime);this.frames=0;this.frameTime=0;}
  }
}
