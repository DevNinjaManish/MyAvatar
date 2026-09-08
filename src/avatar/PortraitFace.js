import * as THREE from 'three';

/**
 * Art-directed 2.5D face used for the compact widget.
 * The illustration supplies the premium silhouette and materials. Dynamic LEDs
 * and camera shutters are composited into their real hardware locations.
 */
export class PortraitFace {
  constructor(bot){
    this.bot=bot;this.scene=new THREE.Group();this.root=new THREE.Group();this.scene.add(this.root);this.root.position.y=1.30;
    const portraits={robot:'rivet',nova:'nova',butler:'sterling',pixel:'pixel'};
    this.canvas=document.createElement('canvas');this.canvas.width=627;this.canvas.height=627;
    this.context=this.canvas.getContext('2d');
    const map=new THREE.CanvasTexture(this.canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
    const portrait=new THREE.Mesh(new THREE.CircleGeometry(.625,80),new THREE.MeshBasicMaterial({map,transparent:true}));
    portrait.position.z=-.015;this.root.add(portrait);
    // Source-pixel maps place the live effects within each illustrated device.
    this.hardware={
      robot:{speaker:[314,340,110,70,'vertical','#ff9d4d'],eyes:[[198,221,64,58],[407,221,48,48]]},
      nova:{speaker:[314,381,58,72,'vertical','#ff9ab9'],eyes:[[220,260,57,42],[405,260,57,42]]},
      butler:{speaker:[314,344,47,60,'dots','#75d8ff'],eyes:[[228,231,48,45],[399,231,48,45]]},
      pixel:{speaker:[314,344,82,52,'dots','#c9ff55'],eyes:[[225,242,53,43],[404,242,53,43]]}
    }[bot]||null;
    this.texture=map;this.lastLevel=-1;this.lastBlink=-1;this.mouthValue=0;this.imageReady=false;
    this.image=new Image();this.image.decoding='async';
    this.image.onload=()=>{this.imageReady=true;this.paintHardware(0,0);};
    this.image.src=`/assets/bots/${portraits[bot]||'rivet'}-portrait.png`;
  }
  update(t,blink,mouth,state){
    this.root.position.y=1.30+Math.sin(t*1.45)*.008;
    this.root.rotation.set(Math.sin(t*.72)*.010,Math.sin(t*.40)*.032,state==='LISTENING'?.045:state==='THINKING'?-.035:Math.sin(t*.6)*.008);
    this.mouthValue=THREE.MathUtils.lerp(this.mouthValue,mouth,.42);
    if(this.imageReady&&(Math.abs(this.mouthValue-this.lastLevel)>.025||Math.abs(blink-this.lastBlink)>.04))this.paintHardware(this.mouthValue,blink);
  }
  paintHardware(level,blink){
    const ctx=this.context,hardware=this.hardware;if(!hardware)return;
    ctx.clearRect(0,0,627,627);ctx.drawImage(this.image,0,0,627,627);
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
    this.texture.needsUpdate=true;this.lastLevel=level;this.lastBlink=blink;
  }
  dispose(){this.scene.traverse(object=>{object.geometry?.dispose();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>{material.map?.dispose();material.dispose();});}});}
}
