import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync(new URL('../../src/conversation/coding-edits.js',import.meta.url),'utf8');
const repair=readFileSync(new URL('../../backend/core/coding_repair.py',import.meta.url),'utf8');

test('failed verification offers exactly one backend repair action',()=>{
  assert.match(ui,/Propose one repair/);
  assert.match(ui,/type:'coding_repair'/);
  assert.match(ui,/Repair attempt used\. Rivet stopped after one verification retry\./);
  assert.match(ui,/event\.verification\?\.status==='failed'&&!isRepair/);
});

test('repair evidence is bounded in the backend',()=>{
  assert.match(repair,/MAX_FAILURE_CHARS\s*=\s*8000/);
  assert.match(repair,/MAX_REPAIR_FILES\s*=\s*8/);
  assert.match(repair,/exactly one bounded repair attempt/i);
  assert.match(repair,/if check\.get\('ok'\) is False/);
  assert.match(repair,/files\[:MAX_REPAIR_FILES\]/);
});
