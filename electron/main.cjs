const {app,BrowserWindow,ipcMain,screen,session,dialog}=require('electron');
const path=require('node:path');
const {promises:fs}=require('node:fs');
const {spawn,spawnSync}=require('node:child_process');
// The compact card ends at roughly 500px; reserve a little space below it so
// transient system notices are never clipped by the transparent window.
const COMPACT_HEIGHT=550;
const CHAT_HEIGHT=805;
const PREFERENCES_HEIGHT=850;
const WORKSPACE_WIDTH=630;

// V1 voice is intentionally automatic after runtime readiness. Allow the
// local widget to resume its AudioContext and play the greeting without a
// second click; macOS still owns the actual microphone permission prompt.
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');

let mainWindow=null;
let dragTimer=null;
const approvedProjectPaths=new Set();
const SKIPPED_PROJECT_DIRECTORIES=new Set(['.git','node_modules','dist','models','data','coverage']);
const TEXT_EXTENSIONS=new Set(['.c','.cc','.cjs','.cpp','.css','.go','.h','.html','.java','.js','.json','.jsx','.md','.mjs','.py','.rs','.sh','.sql','.svg','.toml','.ts','.tsx','.txt','.yaml','.yml']);
const isApprovedProject=projectPath=>approvedProjectPaths.has(path.resolve(projectPath));
const safeProjectFile=(projectPath,relativePath)=>{if(typeof relativePath!=='string'||!relativePath||path.isAbsolute(relativePath))return null;const resolved=path.resolve(projectPath,relativePath);return resolved.startsWith(projectPath+path.sep)?resolved:null;};
const projectRoot=path.resolve(__dirname,'..');
const imagePython=process.env.MYAVATAR_IMAGE_PYTHON||path.join(projectRoot,'.venv/bin/python');
const imageWorker=path.join(projectRoot,'scripts/luma-image-worker.py');
let lumaJob=null;
const runLumaWorker=request=>new Promise(resolve=>{
  if(lumaJob)return resolve({error:'Luma is already creating one image.'});
  const modelPath=path.join(app.getPath('userData'),'models','stable-diffusion-v1-5');
  const outputPath=path.join(app.getPath('userData'),'creations');
  const child=spawn(imagePython,[imageWorker,modelPath,outputPath],{stdio:['pipe','pipe','pipe'],env:{...process.env,HF_HUB_DISABLE_XET:'1'}});let stdout='',stderr='',settled=false;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);lumaJob=null;resolve(value);};
  const timer=setTimeout(()=>{child.kill('SIGTERM');finish({error:'Luma took too long. Try again after closing other memory-heavy apps.'});},600000);
  lumaJob=child;child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});child.on('error',()=>finish({error:'Luma’s local image worker could not start. Run setup for image support.'}));child.on('close',()=>{try{const result=JSON.parse(stdout);finish(result.error?{error:result.error}:result);}catch{finish({error:stderr.trim()||'Luma could not finish that image.'});}});
  child.stdin.end(JSON.stringify(request));
});
const stopDragging=()=>{if(dragTimer){clearInterval(dragTimer);dragTimer=null;}};

const createWindow=()=>{
  const area=screen.getPrimaryDisplay().workArea;
  const width=260;
  const height=COMPACT_HEIGHT;
  const win=new BrowserWindow({
    width,height,
    x:area.x+area.width-width-24,
    y:area.y+Math.max(0,area.height-PREFERENCES_HEIGHT-24),
    minWidth:width,minHeight:height,maxWidth:WORKSPACE_WIDTH,maxHeight:PREFERENCES_HEIGHT,
    frame:false,transparent:true,hasShadow:false,resizable:false,
    backgroundColor:'#00000000',title:'MyAvatar',
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  mainWindow=win;
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.loadURL('http://127.0.0.1:5173');
  win.on('blur',stopDragging);
  win.on('closed',()=>{stopDragging();mainWindow=null;});
};

if(!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((webContents,permission,callback)=>{
    callback(permission==='media'&&webContents===mainWindow?.webContents);
  });
  ipcMain.on('window-close',event=>{if(event.sender===mainWindow?.webContents) mainWindow.close();});
  ipcMain.on('window-minimize',event=>{if(event.sender===mainWindow?.webContents) mainWindow.minimize();});
  ipcMain.on('window-resize',(event,height,width=260)=>{
    if(event.sender!==mainWindow?.webContents)return;
    const nextHeight=[CHAT_HEIGHT,PREFERENCES_HEIGHT].includes(height)?height:COMPACT_HEIGHT;
    const bounds=mainWindow.getBounds();
    const nextWidth=width===WORKSPACE_WIDTH?WORKSPACE_WIDTH:width===350?350:260;
    if(bounds.height===nextHeight&&bounds.width===nextWidth)return;
    // The companion itself is the visual anchor. Expand panels below it where
    // possible, so opening Chat or More never appears to make the bot jump.
    const display=screen.getDisplayMatching(bounds).workArea;
    const nextY=Math.max(display.y,Math.min(bounds.y,display.y+display.height-nextHeight-24));
    const right=Math.min(bounds.x+bounds.width,display.x+display.width-24);
    mainWindow.setBounds({x:Math.max(display.x,right-nextWidth),y:nextY,width:nextWidth,height:nextHeight});
  });
  ipcMain.on('widget-drag-start',event=>{
    if(event.sender!==mainWindow?.webContents) return;
    stopDragging();
    const origin=screen.getCursorScreenPoint();
    const bounds=mainWindow.getBounds();
    dragTimer=setInterval(()=>{
      if(mainWindow?.isDestroyed()){stopDragging();return;}
      const cursor=screen.getCursorScreenPoint();
      mainWindow.setPosition(bounds.x+cursor.x-origin.x,bounds.y+cursor.y-origin.y);
    },16);
  });
  ipcMain.on('widget-drag-stop',event=>{if(event.sender===mainWindow?.webContents)stopDragging();});
  ipcMain.handle('project-choose',async event=>{
    if(event.sender!==mainWindow?.webContents)return null;
    const result=await dialog.showOpenDialog(mainWindow,{title:'Choose a project folder for Rivit',properties:['openDirectory']});
    const selected=result.canceled?null:result.filePaths[0]||null;
    if(selected)approvedProjectPaths.add(path.resolve(selected));
    return selected;
  });
  ipcMain.handle('project-inspect',async(event,requestedPath)=>{
    if(event.sender!==mainWindow?.webContents||typeof requestedPath!=='string')return null;
    const projectPath=path.resolve(requestedPath);
    if(!approvedProjectPaths.has(projectPath))return {error:'Choose this folder in Rivit before inspecting it.'};
    try{
      const stat=await fs.stat(projectPath);if(!stat.isDirectory())return {error:'That selection is not a folder.'};
      const entries=await fs.readdir(projectPath,{withFileTypes:true});
      const visibleEntries=entries.filter(entry=>!entry.name.startsWith('.')).slice(0,200);
      const git=spawnSync('git',['-C',projectPath,'status','--porcelain=v1','-b'],{encoding:'utf8',timeout:3000});
      const lines=git.status===0?git.stdout.trim().split('\n').filter(Boolean):[];
      const branch=lines.find(line=>line.startsWith('## '))?.slice(3).split('...')[0]||null;
      return {path:projectPath,name:path.basename(projectPath),fileCount:visibleEntries.length,hasMore:entries.length>visibleEntries.length,git:{available:git.status===0,branch,changes:lines.filter(line=>!line.startsWith('## ')).length}};
    }catch{return {error:'Rivit could not inspect that folder.'};}
  });
  ipcMain.handle('project-list-files',async(event,requestedPath)=>{
    if(event.sender!==mainWindow?.webContents||typeof requestedPath!=='string')return null;
    const projectPath=path.resolve(requestedPath);if(!isApprovedProject(projectPath))return {error:'Choose this folder in Rivit before listing files.'};
    const files=[];const visit=async(directory,depth=0)=>{if(files.length>=80||depth>2)return;let entries;try{entries=await fs.readdir(directory,{withFileTypes:true});}catch{return;}for(const entry of entries){if(files.length>=80)break;if(entry.name.startsWith('.'))continue;const absolute=path.join(directory,entry.name),relative=path.relative(projectPath,absolute);if(entry.isDirectory()){if(!SKIPPED_PROJECT_DIRECTORIES.has(entry.name))await visit(absolute,depth+1);}else if(entry.isFile()&&TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())){const stat=await fs.stat(absolute);if(stat.size<=120000)files.push({path:relative,size:stat.size});}}};
    await visit(projectPath);return {files,hasMore:files.length>=80};
  });
  ipcMain.handle('project-read-file',async(event,requestedPath,relativePath)=>{
    if(event.sender!==mainWindow?.webContents||typeof requestedPath!=='string')return null;
    const projectPath=path.resolve(requestedPath),filePath=isApprovedProject(projectPath)?safeProjectFile(projectPath,relativePath):null;if(!filePath)return {error:'Choose the project and a listed file before reading it.'};
    try{const stat=await fs.stat(filePath);if(!stat.isFile()||stat.size>120000||!TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase()))return {error:'Rivit can only read listed text files up to 120 KB.'};return {path:relativePath,text:await fs.readFile(filePath,'utf8')};}catch{return {error:'Rivit could not read that file.'};}
  });
  ipcMain.handle('luma-create',async(event,request)=>{
    if(event.sender!==mainWindow?.webContents||!request||typeof request!=='object')return null;
    const prompt=typeof request.prompt==='string'?request.prompt.trim():'';
    const image=typeof request.image==='string'?request.image:'';
    if(!prompt||prompt.length>600)return {error:'Describe the image in 600 characters or fewer.'};
    if(image&&(!/^data:image\/(?:png|jpeg|webp);base64,/.test(image)||image.length>16*1024*1024))return {error:'Choose a PNG, JPEG, or WebP image up to 12 MB.'};
    return runLumaWorker({prompt,mode:request.mode==='edit'?'edit':'generate',image});
  });
  createWindow();
});

app.on('second-instance',()=>mainWindow?.show());
app.on('window-all-closed',()=>app.quit());
