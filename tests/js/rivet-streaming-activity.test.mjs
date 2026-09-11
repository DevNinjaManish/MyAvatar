import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../../backend/core/app.py',import.meta.url),'utf8');
const ui=readFileSync(new URL('../../src/conversation/coding-edits.js',import.meta.url),'utf8');
const provider=readFileSync(new URL('../../backend/providers/coding.py',import.meta.url),'utf8');

test('automatic Rivet planning streams bounded tool activity from the provider',()=>{
  assert.match(provider,/on_activity=on_activity/);
  assert.match(app,/async def on_inspection_activity\(activity\):/);
  assert.match(app,/inspect_code\(messages,coding_config,on_activity=on_inspection_activity\)/);
  assert.match(app,/await send\('coding_activity',turn,/);
});

test('streamed repository activity exposes metadata only and stays bounded',()=>{
  assert.match(app,/label=str\(activity\.get\('label',''\)\)\.strip\(\)\[:160\]/);
  assert.match(app,/refs=\[str\(ref\)\.strip\(\).*\]\[:8\]/s);
  assert.match(app,/tool=str\(activity\.get\('tool',''\)\)\.strip\(\)\[:80\]/);
  assert.doesNotMatch(app,/coding_activity'.*result=/s);
  assert.doesNotMatch(app,/coding_activity'.*args=/s);
});

test('renderer forwards coding activity into the existing Rivet workspace channel',()=>{
  assert.match(ui,/event\.type==='coding_activity'/);
  assert.match(ui,/label:String\(event\.label\|\|''\)\.slice\(0,160\)/);
  assert.match(ui,/refs:\(event\.refs\|\|\[\]\).*slice\(0,8\)/s);
  assert.match(ui,/dispatchActivity\(win,/);
});
