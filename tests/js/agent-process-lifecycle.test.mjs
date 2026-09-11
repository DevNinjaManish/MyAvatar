import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../../electron/main.cjs',import.meta.url),'utf8');

test('Electron shutdown terminates tracked Rivet child processes',()=>{
  assert.match(source,/const stopAgentProcesses=\(\)=>\{for\(const \[id,child\] of activeAgentProcesses\)/);
  assert.match(source,/app\.on\('before-quit',stopAgentProcesses\)/);
  assert.match(source,/win\.on\('closed',\(\)=>\{stopAgentProcesses\(\)/);
});

test('duplicate live task IDs are rejected instead of orphaning the previous child',()=>{
  assert.match(source,/const existing=activeAgentProcesses\.get\(id\)/);
  assert.match(source,/if\(existing&&!existing\.killed\)return resolve\(commandError\('A task with this ID is already running\.'\)\)/);
});

test('command completion only deletes the child it actually owns',()=>{
  assert.match(source,/if\(activeAgentProcesses\.get\(id\)===child\)activeAgentProcesses\.delete\(id\)/);
});

test('explicit cancellation removes the tracked task immediately',()=>{
  assert.match(source,/child\.kill\('SIGTERM'\);activeAgentProcesses\.delete\(taskId\);return \{ok:true\}/);
});
