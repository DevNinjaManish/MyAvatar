import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../src/app/widget-runtime.js',import.meta.url),'utf8');
const preload=readFileSync(new URL('../../electron/preload.cjs',import.meta.url),'utf8');
const main=readFileSync(new URL('../../electron/main.cjs',import.meta.url),'utf8');

test('opening Chat refreshes its runtime status label',()=>{
  assert.match(runtime,/if\(shouldOpen\)\{widgetUnread=0;syncWidgetUnread\(\);syncWidgetStatus\(\);\}/);
});

test('Settings action exits widget mode before opening modal',()=>{
  assert.match(runtime,/function openSettings\(\)\{closeWidgetMenu\(false\);if\(document\.body\.classList\.contains\('widget'\)\)\{window\.desktop\?\.mode\('full'\);setTimeout\(\(\)=>\$\('settings'\)\.showModal\(\),180\);\}else \$\('settings'\)\.showModal\(\);\}/);
  assert.match(runtime,/\$\('widget-settings'\)\.onclick=openSettings/);
});

test('System HUD action toggles its panel and publishes state',()=>{
  assert.match(runtime,/\$\('widget-system-hud-toggle'\)\.onclick=\(\)=>\{const hud=\$\('widget-system-hud'\),open=hud\.hidden;hud\.hidden=!open;/);
  assert.match(runtime,/window\.dispatchEvent\(new CustomEvent\('myavatar:system-hud',\{detail:open\}\)\)/);
});

test('Minimize action is wired renderer to trusted Electron handler',()=>{
  assert.match(runtime,/\$\('widget-minimize'\)\.onclick=\(\)=>window\.desktop\?\.minimize\(\)/);
  assert.match(preload,/minimize:\(\)=>ipcRenderer\.send\('window-minimize'\)/);
  assert.match(main,/ipcMain\.on\('window-minimize',event=>\{if\(trusted\(event\)\)win\.minimize\(\);\}\)/);
});

test('Quit action is wired renderer to trusted Electron close handler',()=>{
  assert.match(runtime,/\$\('widget-close'\)\.onclick=\(\)=>window\.desktop\?\.close\(\)/);
  assert.match(preload,/close:\(\)=>ipcRenderer\.send\('window-close'\)/);
  assert.match(main,/ipcMain\.on\('window-close',event=>\{if\(trusted\(event\)\)win\.close\(\);\}\)/);
  assert.match(main,/app\.on\('window-all-closed',\(\)=>app\.quit\(\)\)/);
});
