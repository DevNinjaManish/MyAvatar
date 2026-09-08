import * as THREE from 'three';

/**
 * Art-directed 2.5D face used for the compact widget.
 * The illustration supplies the premium silhouette and materials. Dynamic LEDs
 * and camera shutters are composited into their real hardware locations.
 */
export class PortraitFace {
  constructor(bot,performance={}){
    this.performance={portraitSize:512,effectFps:24,...performance};
    this.bot=bot;this.scene=new THREE.Group();this.root=new THREE.Group();this.scene.add(this.root);this.root.position.y=1.30;
    const portraits={robot:'rivet',nova:'nova',butler:'sterling',pixel:'pixel'};
    this.canvas=document.createElement('canvas');this.canvas.width=this.performance.portraitSize;this.canvas.height=this.performance.portraitSize;
    this.context=this.canvas.getContext('2d');
    const map=new THREE.CanvasTexture(this.canvas);map.colorSpace=THREE.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=1;
    const portrait=new THREE.Mesh(new THREE.CircleGeometry(.625,48),new THREE.MeshBasicMaterial({map,transparent:true}));
    portrait.position.z=-.015;this.root.add(portrait);
    // Source-pixel maps place the live effects within each illustrated device.
    this.hardware={
      robot:{speaker:[314,340,110,70,'vertical','#ff9d4d'],eyes:[[198,221,64,58],[407,221,48,48]]},
      nova:{speaker:[314,381,58,72,'vertical','#ff9ab9'],eyes:[[220,260,57,42],[405,260,57,42]]},
      butler:{speaker:[314,344,47,60,'dots','#75d8ff'],eyes:[[228,231,48,45],[399,231,48,45]]},
      pixel:{speaker:[314,344,82,52,'dots','#c9ff55'],eyes:[[225,242,53,43],[404,242,53,43]]}
    }[bot]||null;
    this.texture=map;this.lastLevel=-1;this.lastBlink=-1;this.lastState='';this.mouthValue=0;this.imageReady=false;this.lastPaintAt=0;this.lastTime=0;
    this.image=new Image();this.image.decoding='async';
    this.image.onload=()=>{this.imageReady=true;this.paintHardware(0,0);};
    this.image.src=`/assets/bots/${portraits[bot]||'rivet'}-portrait.png`;
  }
  update(t,blink,mouth,state){
    const speaking=state==='SPEAKING',listening=state==='LISTENING',thinking=state==='THINKING';
    const breath=Math.sin(t*(speaking?2.8:1.45));
    this.root.position.y=1.30+breath*(speaking ? .014 : .008);
    this.root.scale.setScalar(1+(speaking ? .008 : Math.sin(t*.9)*.002));
    this.root.rotation.set(Math.sin(t*(thinking ? 1.6 : .72))*(thinking ? .018 : .010),Math.sin(t*(listening ? 1.15 : .40))*(listening ? .052 : thinking ? .068 : .032),listening ? .035 : thinking ? -.028 : Math.sin(t*.6)*.008);
    this.mouthValue=THREE.MathUtils.lerp(this.mouthValue,mouth,.42);
    const enoughTime=performance.now()-this.lastPaintAt>=1000/this.performance.effectFps;
    if(this.imageReady&&enoughTime&&(Math.abs(this.mouthValue-this.lastLevel)>.025||Math.abs(blink-this.lastBlink)>.04||state!==this.lastState||speaking||listening||thinking))this.paintHardware(this.mouthValue,blink,state,t);
  }
  configure(options={}){if(Number.isFinite(options.effectFps))this.performance.effectFps=options.effectFps;}
  paintHardware(level,blink,state='IDLE',t=0){
    const ctx=this.context,hardware=this.hardware;if(!hardware)return;
    const size=this.canvas.width,scale=size/627;
    ctx.clearRect(0,0,size,size);ctx.drawImage(this.image,0,0,size,size);ctx.save();ctx.scale(scale,scale);
    const [x,y,width,height,mode,color]=hardware.speaker;
    if(level>.015){
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
    if(state==='THINKING'){
      ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle=color;ctx.globalAlpha=.75;
      for(const [eyeX,eyeY,rx] of hardware.eyes){const sweep=eyeX-rx*.46+(Math.sin(t*3)+1)*rx*.46;ctx.fillRect(sweep,eyeY-2,3,4);}ctx.restore();
    }
    ctx.restore();
    this.texture.needsUpdate=true;this.lastLevel=level;this.lastBlink=blink;this.lastState=state;this.lastTime=t;this.lastPaintAt=performance.now();
  }
  dispose(){this.scene.traverse(object=>{object.geometry?.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>{material.map?.dispose();material.dispose();});}});}
}
