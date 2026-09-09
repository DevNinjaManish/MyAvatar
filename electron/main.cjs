const {app,BrowserWindow,session,systemPreferences,ipcMain,screen,desktopCapturer,dialog}=require('electron');
const path=require('node:path');
const {widgetLayout,validPanelsRequest,WIDTH,COMPACT_HEIGHT}=require('./widget-layout.cjs');
app.whenReady().then(async()=>{
  const local=url=>{try{return new URL(url).origin==='http://127.0.0.1:5173';}catch{return false;}};
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(local(wc.getURL())&&permission==='media'));
  if(process.platform==='darwin')await systemPreferences.askForMediaAccess('microphone');
  const area=screen.getPrimaryDisplay().workArea;
  const win=new BrowserWindow({width:WIDTH,height:COMPACT_HEIGHT,x:area.x+area.width-270,y:area.y+80,minWidth:WIDTH,minHeight:COMPACT_HEIGHT,title:'MyAvatar',frame:false,acceptFirstMouse:true,transparent:true,hasShadow:false,resizable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!local(url))event.preventDefault();});
  let anchor={x:win.getBounds().x,y:win.getBounds().y},mode='widget';
  let view={chat:false,tools:false,wide:false},layout=widgetLayout(anchor,view,area);
  let dragTimer=null,selectingProject=false;
  const trusted=event=>!win.isDestroyed()&&event.sender===win.webContents
    &&event.senderFrame===win.webContents.mainFrame&&local(win.webContents.getURL());
  const notify=()=>{if(!win.isDestroyed())win.webContents.send('window-mode-changed',mode);};
  const reflow=()=>{
    if(win.isDestroyed()||mode!=='widget')return null;
    const display=screen.getDisplayNearestPoint({x:Math.round(anchor.x+WIDTH/2),y:Math.round(anchor.y+COMPACT_HEIGHT/2)});
    layout=widgetLayout(anchor,view,display.workArea);
    win.setMinimumSize(Math.min(WIDTH,display.workArea.width),Math.min(COMPACT_HEIGHT,display.workArea.height));
    win.setBounds(layout.bounds);
    win.webContents.send('widget-layout-changed',layout);
    return layout;
  };
  const stopDrag=()=>{
    if(!dragTimer)return;
    clearInterval(dragTimer);dragTimer=null;
    if(!win.isDestroyed()&&mode==='widget'){
      const bounds=win.getBounds();anchor={x:bounds.x+layout.offset,y:bounds.y};reflow();
    }
  };
  ipcMain.on('widget-drag-start',event=>{
    if(!trusted(event)||mode!=='widget'||win.isFullScreen())return;
    stopDrag();
    const origin=screen.getCursorScreenPoint(),bounds=win.getBounds();
    dragTimer=setInterval(()=>{
      if(win.isDestroyed()){clearInterval(dragTimer);dragTimer=null;return;}
      const cursor=screen.getCursorScreenPoint();
      win.setPosition(bounds.x+cursor.x-origin.x,bounds.y+cursor.y-origin.y);
    },16);
  });
  ipcMain.on('widget-drag-stop',event=>{if(trusted(event))stopDrag();});
  win.on('blur',stopDrag);win.on('closed',stopDrag);
  win.webContents.on('did-start-loading',()=>{stopDrag();view={chat:false,tools:false,wide:false};reflow();});
  const restoreWidget=()=>{win.setResizable(false);reflow();notify();};
  ipcMain.handle('window-mode',async(event,next)=>{
    if(!trusted(event)||!['widget','full'].includes(next))return mode;
    stopDrag();
    if(next===mode)return mode;
    if(next==='full'){
      mode='full';view={chat:false,tools:false,wide:false};
      win.setResizable(true);win.setMinimumSize(800,560);win.setSize(1120,720);win.center();notify();
    }else{
      mode='widget';
      if(win.isFullScreen()){win.once('leave-full-screen',restoreWidget);win.setFullScreen(false);}
      else restoreWidget();
    }
    return mode;
  });
  ipcMain.handle('widget-chat',async(event,expanded)=>{
    if(!trusted(event)||mode!=='widget'||typeof expanded!=='boolean')return false;
    stopDrag();view.chat=expanded;reflow();return expanded;
  });
  ipcMain.handle('widget-panels',async(event,next)=>{
    if(!trusted(event)||mode!=='widget'||!validPanelsRequest(next))return {ok:false,error:'Invalid widget panel request.'};
    stopDrag();view.tools=next.open;view.wide=next.wide;
    return {ok:true,...reflow()};
  });
  // Explicit directory selection only. No arbitrary path arguments, file reads,
  // shell commands, writes, or backend permissions are exposed by this handler.
  ipcMain.handle('widget-choose-project',async event=>{
    if(!trusted(event))return {ok:false,error:'Folder selection is unavailable.'};
    if(selectingProject)return {ok:false,error:'A folder picker is already open.'};
    selectingProject=true;stopDrag();
    try{
      const result=await dialog.showOpenDialog(win,{title:'Choose a coding project',buttonLabel:'Select folder',properties:['openDirectory'],message:'Select a workspace label. File access and coding execution are not connected yet.'});
      if(win.isDestroyed())return {ok:false,error:'The widget was closed.'};
      if(result.canceled||!result.filePaths.length)return {ok:true,canceled:true};
      // A display name only: this UI phase deliberately creates no access grant.
      return {ok:true,project:{name:path.basename(result.filePaths[0])||result.filePaths[0]}};
    }catch{return {ok:false,error:'The folder picker could not be opened.'};}
    finally{selectingProject=false;}
  });
  ipcMain.handle('screen-capture',async event=>{
    if(!trusted(event))return {ok:false,error:'Screen capture is unavailable.'};
    if(process.platform==='darwin'&&systemPreferences.getMediaAccessStatus('screen')==='denied')return {ok:false,error:'Allow screen recording for MyAvatar in System Settings, then restart the app.'};
    try{
      const display=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:960,height:540},fetchWindowIcons:false});
      const source=sources.find(item=>item.display_id===String(display.id))||sources[0];
      if(!source||source.thumbnail.isEmpty())return {ok:false,error:'No screen image was available.'};
      return {ok:true,source:source.name,image:source.thumbnail.toDataURL()};
    }catch(error){return {ok:false,error:error.message||'Screen capture failed.'};}
  });
  ipcMain.on('window-close',event=>{if(trusted(event))win.close();});
  ipcMain.on('window-minimize',event=>{if(trusted(event))win.minimize();});
  win.on('leave-full-screen',()=>{if(mode==='full'){mode='widget';restoreWidget();}});
  const displayChanged=()=>{stopDrag();reflow();};
  screen.on('display-metrics-changed',displayChanged);screen.on('display-removed',displayChanged);
  win.on('closed',()=>{screen.removeListener('display-metrics-changed',displayChanged);screen.removeListener('display-removed',displayChanged);});
  win.webContents.on('did-finish-load',()=>{reflow();notify();});
  await win.loadURL('http://127.0.0.1:5173');
});
app.on('window-all-closed',()=>app.quit());
