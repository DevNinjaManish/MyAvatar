const {app,BrowserWindow,ipcMain,screen,session}=require('electron');
const path=require('node:path');
const COMPACT_HEIGHT=520;
const CHAT_HEIGHT=770;
const PREFERENCES_HEIGHT=850;

// V1 voice is intentionally automatic after runtime readiness. Allow the
// local widget to resume its AudioContext and play the greeting without a
// second click; macOS still owns the actual microphone permission prompt.
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');

let mainWindow=null;
let dragTimer=null;

const createWindow=()=>{
  const area=screen.getPrimaryDisplay().workArea;
  const width=260;
  const height=COMPACT_HEIGHT;
  const win=new BrowserWindow({
    width,height,
    x:area.x+area.width-width-24,
    y:area.y+Math.max(0,area.height-PREFERENCES_HEIGHT-24),
    minWidth:width,minHeight:height,maxWidth:350,maxHeight:PREFERENCES_HEIGHT,
    frame:false,transparent:true,hasShadow:false,resizable:false,
    backgroundColor:'#00000000',title:'MyAvatar',
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  mainWindow=win;
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.loadURL('http://127.0.0.1:5173');
  win.on('closed',()=>{mainWindow=null;});
};

if(!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((webContents,permission,callback)=>{
    callback(permission==='media');
  });
  ipcMain.on('window-close',event=>{if(event.sender===mainWindow?.webContents) mainWindow.close();});
  ipcMain.on('window-minimize',event=>{if(event.sender===mainWindow?.webContents) mainWindow.minimize();});
  ipcMain.on('window-resize',(event,height,width=260)=>{
    if(event.sender!==mainWindow?.webContents)return;
    const nextHeight=[CHAT_HEIGHT,PREFERENCES_HEIGHT].includes(height)?height:COMPACT_HEIGHT;
    const bounds=mainWindow.getBounds();
    const nextWidth=width===350?350:260;
    if(bounds.height===nextHeight&&bounds.width===nextWidth)return;
    // Keep the lower edge stable while a panel opens. A taller Preferences
    // sheet must grow upward rather than disappearing below the desktop.
    const display=screen.getDisplayMatching(bounds).workArea;
    const bottom=Math.min(bounds.y+bounds.height,display.y+display.height-24);
    const nextY=Math.max(display.y,bottom-nextHeight),right=Math.min(bounds.x+bounds.width,display.x+display.width-24);
    mainWindow.setBounds({x:Math.max(display.x,right-nextWidth),y:nextY,width:nextWidth,height:nextHeight});
  });
  ipcMain.on('widget-drag-start',event=>{
    if(event.sender!==mainWindow?.webContents) return;
    if(dragTimer) clearInterval(dragTimer);
    const origin=screen.getCursorScreenPoint();
    const bounds=mainWindow.getBounds();
    dragTimer=setInterval(()=>{
      if(mainWindow?.isDestroyed()){clearInterval(dragTimer);dragTimer=null;return;}
      const cursor=screen.getCursorScreenPoint();
      mainWindow.setPosition(bounds.x+cursor.x-origin.x,bounds.y+cursor.y-origin.y);
    },16);
  });
  ipcMain.on('widget-drag-stop',event=>{if(event.sender===mainWindow?.webContents&&dragTimer){clearInterval(dragTimer);dragTimer=null;}});
  createWindow();
});

app.on('second-instance',()=>mainWindow?.show());
app.on('window-all-closed',()=>app.quit());
