import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../../scripts/start.mjs',import.meta.url),'utf8');

test('startup resolves the Python environment from the repository root',()=>{
  assert.match(source,/existsSync\(resolve\(root,'\.venv\/bin\/python'\)\)/);
  assert.doesNotMatch(source,/existsSync\('\.venv\/bin\/python'\)/);
});

test('closing Electron tears down the local service stack',()=>{
  assert.match(source,/const desktop=run\(electronPath,\[root\]\)/);
  assert.match(source,/desktop\.on\('exit',\(\)=>stop\(\)\)/);
});

test('shutdown only signals live child processes',()=>{
  assert.match(source,/if\(c&&!c\.killed\)c\.kill\('SIGTERM'\)/);
});
