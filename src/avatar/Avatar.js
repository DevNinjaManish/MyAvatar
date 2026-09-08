import * as THREE from 'three';
import {PortraitFace} from './PortraitFace.js';

/** Shared renderer and animation state for the four built-in robot portraits. */
export class Avatar {
  constructor(container){
    this.state='IDLE';this.mouth=0;this.emotion='relaxed';this.time=0;this.nextBlink=2;this.blinkStart=-10;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(30,1,.1,100);this.camera.position.set(0,1.30,1.95);this.camera.lookAt(0,1.30,0);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));container.append(this.renderer.domElement);
    this.robot=new PortraitFace('robot');this.bot='robot';this.scene.add(this.robot.scene);
    new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);}).observe(container);
    this.clock=new THREE.Clock();this.frames=0;this.frameTime=0;this.fps=0;this.maxFps=60;this.lastFrame=0;
    this.renderer.setAnimationLoop(now=>{if(now-this.lastFrame<1000/this.maxFps-.5)return;this.lastFrame=now;this.update();});
  }
  showRobot(bot='robot'){
    if(this.bot===bot)return;
    this.scene.remove(this.robot.scene);this.robot.dispose();this.robot=new PortraitFace(bot);this.bot=bot;this.scene.add(this.robot.scene);
  }
  setState(state){this.state=state;}
  setMouth(value){this.mouth=THREE.MathUtils.clamp(value,0,1);}
  setExpression(value){this.emotion=value;}
  update(){
    const elapsed=this.clock.getDelta(),dt=Math.min(elapsed,.05);this.time+=dt;
    if(this.time>this.nextBlink){this.blinkStart=this.time;this.nextBlink=this.time+2.5+Math.random()*3;}
    const blink=Math.max(0,1-Math.abs((this.time-this.blinkStart-.09)/.09));
    this.robot.update(this.time,blink,this.mouth,this.state,this.emotion);
    this.renderer.render(this.scene,this.camera);this.frames++;this.frameTime+=elapsed;
    if(this.frameTime>1){this.fps=Math.round(this.frames/this.frameTime);this.frames=0;this.frameTime=0;}
  }
}
