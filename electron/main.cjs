const {app,BrowserWindow,session,systemPreferences,ipcMain,screen,desktopCapturer,dialog}=require('electron');
const {execFile}=require('node:child_process');
const path=require('node:path');
const {accessSync,constants,readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const PROJECT_ROOT=((() => {
  if (typeof process === 'object' && typeof process.cwd === 'function') return process.cwd();
  return path.resolve(__dirname, '..');
})());
let activeProjectRoot=PROJECT_ROOT;
let activeProjectSource='app folder';
const activeAgentProcesses=new Map();
const {widgetLayout,validPanelsRequest,WIDTH,COMPACT_HEIGHT}=require('./widget-layout.cjs');

const ALLOWED_AGENT_COMMANDS={
  build:{label:'npm run build',command:'npm',args:['run','build'],shell:false},
  test:{label:'npm run test',command:'npm',args:['run','test'],shell:false},
  testJs:{label:'npm run test:js',command:'npm',args:['run','test:js'],shell:false},
  testPy:{label:'npm run test:py',command:'.venv/bin/python',args:['-m','unittest','discover','-s','tests/py','-p','test_*.py'],shell:false},
  gitStatus:{label:'git status --short',command:'git',args:['status','--short'],shell:false},
  gitDiff:{label:'git diff --stat',command:'git',args:['diff','--stat'],shell:false},
  gitFiles:{label:'git ls-files',command:'git',args:['ls-files'],shell:false},
  gitLog:{label:'git log --oneline -7',command:'git',args:['log','--oneline','-7'],shell:false},
  gitBranch:{label:'git branch --show-current',command:'git',args:['branch','--show-current'],shell:false},
  gitCommit:{label:'git commit -am',command:'git',args:['commit','-am',''],shell:false}
};

const commandError=(message)=>({ok:false,error:message||'Command rejected.'});
const parseAgentRequest=request=>{
  if(!request||typeof request!=='object')return null;
  const {kind}=request;
  if(kind==='custom'){
    if(request.id!=='custom')return null;
    if(typeof request.command!=='string'||typeof request.args==='undefined')return null;
    const command=request.command.trim();
    const args=Array.isArray(request.args)?request.args:[];
    if(!command||!Array.isArray(args)||args.some(item=>typeof item!=='string'))return null;
    return {command,args,shell:false,label:`${command} ${args.join(' ')}`.trim()};
  }
  if(kind==='gitCommit'){
    const commitMessage=(request.commitMessage||'').toString().trim();
    if(!commitMessage) return null;
    return {command:'git',args:['commit','-am',commitMessage],shell:false,label:`git commit -am "${commitMessage}"`};
  }
  const preset=ALLOWED_AGENT_COMMANDS[kind];
  if(!preset)return null;
  return {...preset,id:kind};
};

const sanitizeProjectRoot=(candidate)=> {
  if (typeof candidate !== 'string' || !candidate.trim()) return PROJECT_ROOT;
  const root=candidate.trim();
  if (!path.isAbsolute(root)) return PROJECT_ROOT;
  try{
    accessSync(root, constants.F_OK | constants.R_OK);
  } catch {
    return PROJECT_ROOT;
  }
  return root;
};

const runCommand=(command,args,shell=false,cwd=PROJECT_ROOT,taskId='command')=>new Promise(resolve=>{
  const child=execFile(command,args,{cwd,timeout:120000,maxBuffer:2_000_000,shell},(error,stdout,stderr)=>{
    activeAgentProcesses.delete(taskId);
    if(error)return resolve({ok:false,error:error.message,stdout:(stdout||'').trim(),stderr:(stderr||'').trim(),code:error.code||1});
    resolve({ok:true,stdout:(stdout||'').trim(),stderr:(stderr||'').trim(),code:0});
  });
  activeAgentProcesses.set(taskId,child);
});
const readMacCalendar=()=>new Promise(resolve=>{
  const namesScript='tell application "Calendar" to get name of calendars';
  execFile('/usr/bin/osascript',['-e',namesScript],{timeout:4000,maxBuffer:100_000},(nameError,namesOut,nameErr)=>{
    if(nameError)return resolve({ok:false,error:nameErr?.trim()||nameError.message,code:nameError.code||1});
    const names=(namesOut||'').trim().split(/,\s*/).filter(Boolean);
    const eventScript=`on run argv
set calName to item 1 of argv
tell application "Calendar"
set nowDate to current date
set endDate to nowDate + (14 * days)
set rows to ""
set cal to calendar calName
repeat with itemRef in (every event of cal whose start date is greater than or equal to nowDate and start date is less than endDate)
set rows to rows & (summary of itemRef) & tab & (start date of itemRef as string) & tab & (end date of itemRef as string) & tab & calName & linefeed
end repeat
return rows
end tell
end run`;
    Promise.all(names.map(name=>new Promise(done=>execFile('/usr/bin/osascript',['-e',eventScript,name],{timeout:2500,maxBuffer:200_000},(error,stdout)=>done(error?'':(stdout||'')))))).then(outputs=>{
      const events=outputs.join('').trim().split('\n').filter(Boolean).map((line,index)=>{const [title,start,end,calendar]=line.split('\t');return {id:`calendar-${index}`,title:title||'Untitled event',start:start||'',end:end||'',calendar:calendar||'Calendar'};});
      resolve({ok:true,events});
    });
  });
});

const executeAgentCommand=async request=>{
  const parsed=parseAgentRequest(request);
  if(!parsed)return commandError('This command type is not allowed.');
  if(parsed.command!=='git'&&parsed.command!=='npm'&&parsed.command!=='.venv/bin/python') return commandError('Command is blocked by the current policy.');
  return runCommand(parsed.command,parsed.args,parsed.shell,activeProjectRoot,request.taskId||'command');
};
let mainWindow=null;

if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  const projectStateDir=typeof app.getPath==='function' ? app.getPath('userData') : path.join(PROJECT_ROOT,'.local-state');
  const projectStateFile=path.join(projectStateDir,'coding-project.json');
  try{
    const saved=JSON.parse(readFileSync(projectStateFile,'utf8'));
    const candidate=sanitizeProjectRoot(saved?.path);
    if(candidate!==PROJECT_ROOT||saved?.path===PROJECT_ROOT){activeProjectRoot=candidate;activeProjectSource='saved workspace';}
  }catch{}
  const local=url=>{try{return new URL(url).origin==='http://127.0.0.1:5173';}catch{return false;}};
  session.defaultSession.setPermissionRequestHandler((wc,permission,callback)=>callback(local(wc.getURL())&&permission==='media'));
  if(process.platform==='darwin')await systemPreferences.askForMediaAccess('microphone');
  const area=screen.getPrimaryDisplay().workArea;
  const win=new BrowserWindow({width:WIDTH,height:COMPACT_HEIGHT,x:area.x+area.width-270,y:area.y+80,minWidth:WIDTH,minHeight:COMPACT_HEIGHT,title:'MyAvatar',frame:false,acceptFirstMouse:true,transparent:true,hasShadow:false,resizable:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  mainWindow=win;
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!local(url))event.preventDefault();});
  let anchor={x:win.getBounds().x,y:win.getBounds().y},mode='widget';
  let view={chat:false,tools:false,wide:false,calendar:false},layout=widgetLayout(anchor,view,area);
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
  win.webContents.on('did-start-loading',()=>{stopDrag();view={chat:false,tools:false,wide:false,calendar:false};reflow();});
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
  ipcMain.handle('agent-run-command',async(event,request)=>{
    if(!trusted(event))return commandError('Command request is unavailable.');
    return executeAgentCommand(request);
  });
  ipcMain.handle('agent-run-query',async(event,request)=>{
    if(!trusted(event))return {ok:false,error:'Query request is unavailable.'};
    const parsed=parseAgentRequest(request);
    if(!parsed||!parsed.id||parsed.command!=='git')return commandError('This query is not allowed.');
    return runCommand(parsed.command,parsed.args,parsed.shell,activeProjectRoot);
  });
  ipcMain.handle('agent-project-state',async event=>{
    if(!trusted(event))return {ok:false,error:'Project state is unavailable.'};
    return {ok:true,project:{name:path.basename(activeProjectRoot)||activeProjectRoot,source:activeProjectSource}};
  });
  ipcMain.handle('agent-cancel-task',async(event,taskId)=>{
    if(!trusted(event)||typeof taskId!=='string')return {ok:false,error:'Task cancellation is unavailable.'};
    const child=activeAgentProcesses.get(taskId);
    if(!child||child.killed)return {ok:false,error:'No running task found.'};
    child.kill('SIGTERM');
    return {ok:true};
  });
  ipcMain.handle('calendar-events',async event=>{
    if(!trusted(event))return {ok:false,error:'Calendar access is unavailable.'};
    return readMacCalendar();
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
  ipcMain.handle('widget-calendar',async(event,next)=>{
    if(!trusted(event)||!next||typeof next.open!=='boolean')return {ok:false,error:'Invalid calendar view request.'};
    stopDrag();view.calendar=next.open;view.tools=false;view.wide=false;view.chat=false;return {ok:true,...reflow()};
  });
  // Explicit directory selection only. No arbitrary path arguments, file reads,
  // shell commands, writes, or backend permissions are exposed by this handler.
  ipcMain.handle('widget-choose-project',async event=>{
    if(!trusted(event))return {ok:false,error:'Folder selection is unavailable.'};
    if(selectingProject)return {ok:false,error:'A folder picker is already open.'};
    selectingProject=true;stopDrag();
    try{
      const result=await dialog.showOpenDialog(win,{title:'Choose a coding project',buttonLabel:'Select folder',properties:['openDirectory','createDirectory'],message:'Select a workspace to run allowed local commands.'});
      if(win.isDestroyed())return {ok:false,error:'The widget was closed.'};
      if(result.canceled||!result.filePaths.length)return {ok:true,canceled:true};
      const selected=path.resolve(result.filePaths[0] || '');
      activeProjectRoot=sanitizeProjectRoot(selected);
      activeProjectSource='selected workspace';
      try{
        mkdirSync(path.dirname(projectStateFile),{recursive:true});
        writeFileSync(projectStateFile,JSON.stringify({path:activeProjectRoot},{space:2}),'utf8');
      }catch{}
      return {ok:true,project:{name:path.basename(selected)||selected}};
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
  win.on('closed',()=>{mainWindow=null;screen.removeListener('display-metrics-changed',displayChanged);screen.removeListener('display-removed',displayChanged);});
  win.webContents.on('did-finish-load',()=>{reflow();notify();});
  await win.loadURL('http://127.0.0.1:5173');
});
app.on('second-instance',()=>{
  if(!mainWindow||mainWindow.isDestroyed())return;
  if(mainWindow.isMinimized?.())mainWindow.restore?.();
  mainWindow.show?.();mainWindow.focus?.();
});
app.on('window-all-closed',()=>app.quit());
