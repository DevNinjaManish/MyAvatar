const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('desktop',{
  startDrag:()=>ipcRenderer.send('widget-drag-start'),
  stopDrag:()=>ipcRenderer.send('widget-drag-stop'),
  close:()=>ipcRenderer.send('window-close'),
  minimize:()=>ipcRenderer.send('window-minimize'),
  resize:(height,width=260)=>ipcRenderer.send('window-resize',height,width),
  chooseProject:()=>ipcRenderer.invoke('project-choose'),
  inspectProject:path=>ipcRenderer.invoke('project-inspect',path),
  listProjectFiles:path=>ipcRenderer.invoke('project-list-files',path),
  readProjectFile:(path,file)=>ipcRenderer.invoke('project-read-file',path,file),
  createImage:request=>ipcRenderer.invoke('luma-create',request),
  lumaModelStatus:()=>ipcRenderer.invoke('luma-model-status'),
  repairLumaModel:()=>ipcRenderer.invoke('luma-model-repair')
});
