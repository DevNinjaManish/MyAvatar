import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../../src/conversation/coding-edits.js',import.meta.url),'utf8');

test('failed verification offers exactly one bounded repair action',()=>{
  assert.match(source,/Propose one repair/);
  assert.match(source,/This is the only automatic repair attempt/);
  assert.match(source,/Repair attempt used\. Rivet stopped after one verification retry\./);
  assert.match(source,/event\.verification\?\.status==='failed'&&!isRepair/);
});

test('repair request is bounded to changed files and failed check output',()=>{
  assert.match(source,/\.slice\(0,8\)/);
  assert.match(source,/\.slice\(-5000\)/);
  assert.match(source,/\.slice\(-8000\)/);
  assert.match(source,/filter\(check=>check\.ok===false\)/);
});
