const {app,BrowserWindow}=require('electron');
const {mkdirSync,writeFileSync}=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const OUTPUT=path.join(ROOT,'artifacts','ui-regression');
const STATES=(process.env.MYAVATAR_UI_STATES||'compact,chat,rivet,chat-rivet,menu,picker,running,approval,complete,offline,limited')
  .split(',').map(value=>value.trim()).filter(Boolean);

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function capture(win,state){
  await win.loadFile(path.join(ROOT,'dist','index.html'),{query:{fixture:state}});
  await win.webContents.executeJavaScript(`new Promise(resolve=>{
    const done=()=>document.documentElement.dataset.fixtureReady==='true';
    if(done())return resolve(true);
    const observer=new MutationObserver(()=>{if(done()){observer.disconnect();resolve(true);}});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-fixture-ready']});
    setTimeout(()=>{observer.disconnect();resolve(done());},2000);
  })`);
  await wait(80);
  const image=await win.webContents.capturePage();
  const file=path.join(OUTPUT,`${state}.png`);
  writeFileSync(file,image.toPNG());
  console.log(`captured ${path.relative(ROOT,file)}`);
}

app.whenReady().then(async()=>{
  mkdirSync(OUTPUT,{recursive:true});
  const win=new BrowserWindow({
    width:640,height:820,show:false,frame:false,transparent:false,resizable:false,
    backgroundColor:'#0b1012',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true},
  });
  try{
    for(const state of STATES)await capture(win,state);
    console.log(`UI regression capture complete: ${STATES.length} states.`);
    app.exit(0);
  }catch(error){
    console.error(error);
    app.exit(1);
  }
});
