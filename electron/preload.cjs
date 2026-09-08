const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  mode: mode=>ipcRenderer.invoke('window-mode',mode),
  startDrag:()=>ipcRenderer.send('widget-drag-start'),
  stopDrag:()=>ipcRenderer.send('widget-drag-stop'),
  minimize:()=>ipcRenderer.send('window-minimize'),
  close:()=>ipcRenderer.send('window-close'),
  onMode:callback=>ipcRenderer.on('window-mode-changed',(_event,mode)=>callback(mode))
});
