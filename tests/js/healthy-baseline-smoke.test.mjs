import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../src/app/widget-runtime.js',import.meta.url),'utf8');
const stack=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');
const preload=readFileSync(new URL('../../electron/preload.cjs',import.meta.url),'utf8');
const electron=readFileSync(new URL('../../electron/main.cjs',import.meta.url),'utf8');
const start=readFileSync(new URL('../../scripts/start.mjs',import.meta.url),'utf8');

test('desktop bootstrap still launches backend, Vite and Electron',()=>{
  assert.match(start,/uvicorn/);
  assert.match(start,/vite\.js/);
  assert.match(start,/run\(electronPath,\[root\]\)/);
});

test('ready event still releases the primary microphone gate',()=>{
  assert.match(runtime,/m\.type==='ready'/);
  assert.match(runtime,/\$\('mic'\)\.disabled=false/);
  assert.match(runtime,/state\.set\('IDLE'\)/);
});

test('core widget controls remain wired',()=>{
  assert.match(runtime,/\$\('widget-chat-toggle'\)\.onclick/);
  assert.match(runtime,/\$\('widget-mic'\)/);
  assert.match(runtime,/function switchBot\(id\)/);
  assert.match(runtime,/send\(\{type:'bot',bot:id\}\)/);
});

test('More menu can be shown and hidden in widget mode',()=>{
  assert.match(runtime,/\$\('widget-more'\)\.onclick/);
  assert.match(runtime,/\$\('widget-menu'\)\.hidden=false/);
  assert.match(stack,/body\.widget #widget-menu \{[\s\S]*display: block !important;/);
  assert.match(stack,/body\.widget #widget-menu\[hidden\][\s\S]*display: none !important;/);
});

test('More menu desktop actions retain the trusted preload IPC bridge',()=>{
  assert.match(runtime,/\$\('widget-settings'\)\.onclick=openSettings/);
  assert.match(runtime,/\$\('widget-minimize'\)\.onclick=.*desktop\?\.minimize/);
  assert.match(runtime,/\$\('widget-close'\)\.onclick=.*desktop\?\.close/);
  assert.match(preload,/minimize:\(\)=>ipcRenderer\.send\('window-minimize'\)/);
  assert.match(preload,/close:\(\)=>ipcRenderer\.send\('window-close'\)/);
  assert.match(electron,/ipcMain\.on\('window-minimize'/);
  assert.match(electron,/ipcMain\.on\('window-close'/);
});
