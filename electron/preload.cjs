const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
  mode: mode=>ipcRenderer.invoke('window-mode',mode),
  widgetChat: expanded=>ipcRenderer.invoke('widget-chat',Boolean(expanded)),
  widgetPanels: view=>ipcRenderer.invoke('widget-panels',view),
  runAgentCommand: request=>ipcRenderer.invoke('agent-run-command',request),
  runAgentQuery: request=>ipcRenderer.invoke('agent-run-query',request),
  getAgentProject:()=>ipcRenderer.invoke('agent-project-state'),
  cancelAgentTask:taskId=>ipcRenderer.invoke('agent-cancel-task',taskId),
  getCalendarEvents:()=>ipcRenderer.invoke('calendar-events'),
  chooseProject:()=>ipcRenderer.invoke('widget-choose-project'),
  onWidgetLayout:callback=>{
    const listener=(_event,layout)=>callback(layout);
    ipcRenderer.on('widget-layout-changed',listener);
    return ()=>ipcRenderer.removeListener('widget-layout-changed',listener);
  },
  captureScreen:()=>ipcRenderer.invoke('screen-capture'),
  startDrag:()=>ipcRenderer.send('widget-drag-start'),
  stopDrag:()=>ipcRenderer.send('widget-drag-stop'),
  minimize:()=>ipcRenderer.send('window-minimize'),
  close:()=>ipcRenderer.send('window-close'),
  onMode:callback=>ipcRenderer.on('window-mode-changed',(_event,mode)=>callback(mode))
});
