import * as THREE from 'three';
import {PortraitFace} from './PortraitFace.js';

/** Shared renderer and animation state for the four built-in robot portraits. */
export class Avatar {
  constructor(container){
    this.container=container;this.performance={maxFps:45,pixelRatio:1.25,portraitSize:512,effectFps:24};
    this.state='IDLE';this.mouth=0;this.emotion='relaxed';this.time=0;this.nextBlink=2;this.blinkStart=-10;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(30,1,.1,100);this.camera.position.set(0,1.30,1.95);this.camera.lookAt(0,1.30,0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.performance.pixelRatio));container.append(this.renderer.domElement);
    this.robot=new PortraitFace('robot',this.performance);this.bot='robot';this.scene.add(this.robot.scene);
    this.resize=()=>{const {width,height}=this.container.getBoundingClientRect();this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);};
    new ResizeObserver(this.resize).observe(container);
    this.clock=new THREE.Clock();this.frames=0;this.frameTime=0;this.fps=0;this.maxFps=this.performance.maxFps;this.lastFrame=0;
    this.renderer.setAnimationLoop(now=>{if(now-this.lastFrame<1000/this.maxFps-.5)return;this.lastFrame=now;this.update();});
  }
  showRobot(bot='robot'){
    if(this.bot===bot)return;
    this.scene.remove(this.robot.scene);this.robot.dispose();this.robot=new PortraitFace(bot,this.performance);this.bot=bot;this.scene.add(this.robot.scene);
  }
  configure(options={}){for(const key of ['maxFps','pixelRatio','portraitSize','effectFps'])if(Number.isFinite(options[key]))this.performance[key]=options[key];this.maxFps=this.performance.maxFps;this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.performance.pixelRatio));this.resize();this.robot.configure(this.performance);}
  setState(state){this.state=state;}
  setMouth(value){this.mouth=THREE.MathUtils.clamp(value,0,1);}
  setExpression(value){this.emotion=value;this.onExpression?.(value);}
  update(){
    const elapsed=this.clock.getDelta(),dt=Math.min(elapsed,.05);this.time+=dt;
    if(this.time>this.nextBlink){this.blinkStart=this.time;this.nextBlink=this.time+2.5+Math.random()*3;}
    const blink=Math.max(0,1-Math.abs((this.time-this.blinkStart-.09)/.09));
    this.robot.update(this.time,blink,this.mouth,this.state,this.emotion);
    this.renderer.render(this.scene,this.camera);this.frames++;this.frameTime+=elapsed;
    if(this.frameTime>1){this.fps=Math.round(this.frames/this.frameTime);this.frames=0;this.frameTime=0;}
  }
}
