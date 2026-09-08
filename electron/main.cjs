const {app,BrowserWindow,session,systemPreferences,ipcMain,screen}=require('electron');
const path=require('node:path');
app.whenReady().then(async()=>{
  const local=url=>{try{return new URL(url).origin==='http://127.0.0.1:5173';}catch{return false;}};
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(local(wc.getURL())&&permission==='media'));
  if(process.platform==='darwin')await systemPreferences.askForMediaAccess('microphone');
  const area=screen.getPrimaryDisplay().workArea;
  const widgetSize=232;
  const win=new BrowserWindow({width:widgetSize,height:widgetSize,x:area.x+area.width-270,y:area.y+80,minWidth:232,minHeight:232,title:'Rivet',frame:false,acceptFirstMouse:true,transparent:true,hasShadow:false,resizable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!local(url))event.preventDefault();});
  let widgetBounds=win.getBounds();let mode='widget';
  let dragTimer=null;
  const stopDrag=()=>{
    if(!dragTimer)return;
    clearInterval(dragTimer);dragTimer=null;
    if(!win.isDestroyed()){widgetBounds=win.getBounds();console.log('[window] drag ended',widgetBounds);}
  };
  ipcMain.on('widget-drag-start',event=>{
    if(event.sender!==win.webContents||mode!=='widget'||win.isFullScreen())return;
    stopDrag();
    const origin=screen.getCursorScreenPoint(),bounds=win.getBounds();
    console.log('[window] drag started',bounds);
    dragTimer=setInterval(()=>{
      const cursor=screen.getCursorScreenPoint();
      win.setPosition(bounds.x+cursor.x-origin.x,bounds.y+cursor.y-origin.y);
    },16);
  });
  ipcMain.on('widget-drag-stop',event=>{if(event.sender===win.webContents)stopDrag();});
  win.on('blur',stopDrag);
  win.on('closed',stopDrag);
  win.webContents.on('did-start-loading',stopDrag);
  const notify=()=>win.webContents.send('window-mode-changed',mode);
  ipcMain.handle('window-mode',async(event,next)=>{
    if(event.sender!==win.webContents||!['widget','full'].includes(next))return mode;
    stopDrag();
    if(next===mode)return mode;
    if(next==='full'){widgetBounds=win.getBounds();mode='full';win.setResizable(true);win.setMinimumSize(800,560);win.setSize(1120,720);win.center();notify();}
    else{mode='widget';if(win.isFullScreen()){win.once('leave-full-screen',()=>{win.setResizable(false);win.setBounds({...widgetBounds,width:widgetSize,height:widgetSize});notify();});win.setFullScreen(false);}else{win.setResizable(false);win.setBounds({...widgetBounds,width:widgetSize,height:widgetSize});notify();}}
    return mode;
  });
  ipcMain.on('window-close',event=>{if(event.sender===win.webContents)win.close();});
  ipcMain.on('window-minimize',event=>{if(event.sender===win.webContents)win.minimize();});
  win.on('leave-full-screen',()=>{if(mode==='full'){mode='widget';win.setResizable(false);win.setBounds(widgetBounds);notify();}});
  win.webContents.on('did-finish-load',notify);
  await win.loadURL('http://127.0.0.1:5173');
});
app.on('window-all-closed',()=>app.quit());
