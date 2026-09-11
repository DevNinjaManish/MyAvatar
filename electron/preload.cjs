const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('desktop',{
  startDrag:()=>ipcRenderer.send('widget-drag-start'),
  stopDrag:()=>ipcRenderer.send('widget-drag-stop'),
  close:()=>ipcRenderer.send('window-close'),
  minimize:()=>ipcRenderer.send('window-minimize')
});
