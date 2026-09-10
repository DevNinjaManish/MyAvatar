import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {EventEmitter} from 'node:events';
import layoutAPI from '../../electron/widget-layout.cjs';
const {WIDTH}=layoutAPI;

async function boot({lock=true}={}) {
  const ipcMain=new EventEmitter(),handlers=new Map();ipcMain.handle=(name,handler)=>handlers.set(name,handler);
  let quitCalls=0;
  const app=new EventEmitter();app.whenReady=()=>Promise.resolve();app.quit=()=>{quitCalls++;};app.requestSingleInstanceLock=()=>lock;
  const screen=new EventEmitter();screen.getPrimaryDisplay=()=>({workArea:{x:0,y:24,width:1440,height:820}});screen.getDisplayNearestPoint=screen.getPrimaryDisplay;screen.getCursorScreenPoint=()=>({x:1100,y:100});
  let window,selection={canceled:false,filePaths:['/private/MyAvatar']},dialogCalls=0;
  class BrowserWindow extends EventEmitter {
    constructor(options){super();this.options=options;this.bounds={x:options.x,y:options.y,width:options.width,height:options.height};this.webContents=new EventEmitter();this.webContents.mainFrame={};this.webContents.getURL=()=> 'http://127.0.0.1:5173';this.webContents.setWindowOpenHandler=()=>{};this.webContents.send=()=>{};window=this;}
    isDestroyed(){return false;}isFullScreen(){return false;}getBounds(){return {...this.bounds};}setBounds(bounds){this.bounds={...bounds};}setMinimumSize(){}setResizable(){}center(){}setSize(width,height){this.bounds.width=width;this.bounds.height=height;}setPosition(x,y){this.bounds.x=x;this.bounds.y=y;}async loadURL(){}close(){}minimize(){}show(){}focus(){}isMinimized(){return false;}restore(){}
  }
  const electron={app,BrowserWindow,ipcMain,screen,session:{defaultSession:{setPermissionRequestHandler(){}}},systemPreferences:{askForMediaAccess:async()=>true},desktopCapturer:{},dialog:{showOpenDialog:async()=>{dialogCalls++;return selection;}}};
  const fakeFs={accessSync(){},constants:{F_OK:0,R_OK:4},readFileSync(){throw new Error('missing');},writeFileSync(){},mkdirSync(){}};
  const context={require:name=>name==='electron'?electron:name==='node:path'?path:name==='node:fs'?fakeFs:name==='node:child_process'?{execFile(){}}:layoutAPI,URL,__dirname:'/app/electron',process:{platform:'linux'},setInterval,clearInterval,console};
  vm.runInNewContext(readFileSync(new URL('../../electron/main.cjs',import.meta.url),'utf8'),context);await new Promise(resolve=>setImmediate(resolve));
  const trusted=window&&{sender:window.webContents,senderFrame:window.webContents.mainFrame};return {window,handlers,trusted,getDialogCalls:()=>dialogCalls,getQuitCalls:()=>quitCalls,setSelection:value=>selection=value};
}
test('a second app launch exits before creating another widget window',async()=>{const {window,getQuitCalls}=await boot({lock:false});assert.equal(window,undefined);assert.equal(getQuitCalls(),1);});
test('native window still has a sandboxed isolated renderer',async()=>{const {window}=await boot();assert.equal(window.options.webPreferences.sandbox,true);assert.equal(window.options.webPreferences.contextIsolation,true);assert.equal(window.options.webPreferences.nodeIntegration,false);});
test('tools and chat resize independently without dropping the other state',async()=>{const {window,handlers,trusted}=await boot();await handlers.get('widget-panels')(trusted,{open:true,wide:false});assert.equal(window.bounds.height,820);await handlers.get('widget-chat')(trusted,true);assert.equal(window.bounds.height,820);await handlers.get('widget-chat')(trusted,false);assert.equal(window.bounds.height,820);await handlers.get('widget-panels')(trusted,{open:false,wide:false});assert.equal(window.bounds.height,820);});
test('utility toggles preserve the native platform anchor',async()=>{const {window,handlers,trusted}=await boot();const before=window.getBounds();await handlers.get('widget-chat')(trusted,true);assert.deepEqual(window.getBounds(),before);await handlers.get('widget-chat')(trusted,false);assert.deepEqual(window.getBounds(),before);await handlers.get('widget-panels')(trusted,{open:true,wide:false});assert.deepEqual(window.getBounds(),before);await handlers.get('widget-panels')(trusted,{open:false,wide:false});assert.deepEqual(window.getBounds(),before);});
test('foreign renderer and subframe IPC requests cannot resize the widget',async()=>{const {window,handlers,trusted}=await boot();const before=window.getBounds();assert.equal((await handlers.get('widget-panels')({sender:{}},{open:true,wide:true})).ok,false);assert.equal((await handlers.get('widget-panels')({...trusted,senderFrame:{}},{open:true,wide:true})).ok,false);assert.deepEqual(window.getBounds(),before);});
test('invalid requests are rejected without resizing',async()=>{const {window,handlers,trusted}=await boot();const before=window.getBounds();assert.equal((await handlers.get('widget-panels')(trusted,{open:'yes',wide:true})).ok,false);assert.deepEqual(window.getBounds(),before);});
test('general folder chooser returns a display name, not the private full path',async()=>{const {handlers,trusted,getDialogCalls}=await boot();const result=await handlers.get('widget-choose-project')(trusted);assert.equal(result.ok,true);assert.equal(result.project.name,'MyAvatar');assert.equal(JSON.stringify(result).includes('/private/'),false);assert.equal(getDialogCalls(),1);});
test('Rivet picker scopes the path to its dedicated trusted call',async()=>{const {handlers,trusted}=await boot();const result=await handlers.get('rivet-choose-workspace')(trusted);assert.equal(result.ok,true);assert.equal(result.project.name,'MyAvatar');assert.equal(result.workspacePath,'/private/MyAvatar');assert.equal((await handlers.get('rivet-choose-workspace')({sender:{}})).ok,false);});
test('cancelled folder selection is not a failure',async()=>{const {handlers,trusted,setSelection}=await boot();setSelection({canceled:true,filePaths:[]});const result=await handlers.get('widget-choose-project')(trusted);assert.equal(result.canceled,true);assert.equal(result.ok,true);});
test('foreign windows cannot open the folder picker',async()=>{const {handlers,getDialogCalls}=await boot();assert.equal((await handlers.get('widget-choose-project')({sender:{}})).ok,false);assert.equal(getDialogCalls(),0);});
test('full conversation remains optional and returns to compact widget',async()=>{const {handlers,trusted,window}=await boot();await handlers.get('widget-panels')(trusted,{open:true,wide:true});assert.equal(await handlers.get('window-mode')(trusted,'full'),'full');assert.equal(window.bounds.width,1120);assert.equal(await handlers.get('window-mode')(trusted,'widget'),'widget');assert.equal(window.bounds.width,WIDTH);assert.equal(window.bounds.height,820);});
