import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareBriefTransfer, disclosureFocusIndex} from '../../src/widget/panels.js';

test('an empty brief does not change chat', () => {
  for (const brief of ['', '   ', null, undefined]) assert.deepEqual(prepareBriefTransfer(brief, 'draft'), {kind:'empty'});
});
test('a task brief can copy into empty chat', () => {
  assert.deepEqual(prepareBriefTransfer('  Fix a layout bug  ', ''), {kind:'ready',text:'Fix a layout bug'});
});
test('an existing unsent chat draft is never replaced', () => {
  assert.deepEqual(prepareBriefTransfer('New task', 'Existing unsent message'), {kind:'conflict'});
});
test('copying the same brief is idempotent', () => {
  assert.deepEqual(prepareBriefTransfer('Task', '  Task  '), {kind:'ready',text:'Task'});
});
test('nonempty drafts consisting only of whitespace do not block copying', () => {
  assert.equal(prepareBriefTransfer('Task', ' \n ').kind, 'ready');
});
test('overlong briefs are rejected instead of silently truncated', () => {
  assert.equal(prepareBriefTransfer('a'.repeat(2000), '').kind,'ready');
  assert.equal(prepareBriefTransfer('a'.repeat(2001), '').kind,'too-long');
  assert.equal(prepareBriefTransfer('abcd', '', 3).kind,'too-long');
});
test('invalid limits fail closed', () => {
  for (const limit of [0,-1,NaN,Infinity,'2000']) assert.equal(prepareBriefTransfer('x','',limit).kind,'too-long');
});
test('markup-like text remains text', () => {
  const text='<img src=x onerror=alert(1)> & "quoted"';
  assert.deepEqual(prepareBriefTransfer(text,''),{kind:'ready',text});
});
test('disclosure arrow keys wrap in both directions', () => {
  assert.equal(disclosureFocusIndex('ArrowDown',4,5),0);
  assert.equal(disclosureFocusIndex('ArrowUp',0,5),4);
  assert.equal(disclosureFocusIndex('ArrowDown',1,5),2);
  assert.equal(disclosureFocusIndex('ArrowUp',3,5),2);
});
test('Home and End focus first and last disclosure', () => {
  assert.equal(disclosureFocusIndex('Home',3,5),0);
  assert.equal(disclosureFocusIndex('End',0,5),4);
});
test('text-editing and activation keys are not hijacked', () => {
  for (const key of ['Enter',' ','Escape','ArrowLeft','ArrowRight','Tab','a']) assert.equal(disclosureFocusIndex(key,1,5),null);
});
test('invalid disclosure positions are ignored', () => {
  for(const [index,count] of [[0,0],[-1,5],[5,5],[1.5,5],[0,1.5]]) assert.equal(disclosureFocusIndex('End',index,count),null);
});
test('polish imports after existing panel styles and widget runtime loads once',()=>{
  const code=readFileSync(new URL('../../src/app/entry.js',import.meta.url),'utf8');
  assert.ok(code.indexOf("'../styles/widget-polish.css'")>code.indexOf("'../styles/widget-panels.css'"));
  const staticLoads=(code.match(/import '\.\.\/styles\/widget-polish\.css'/g)||[]).length;
  const dynamicLoads=(code.match(/import\('\.\/widget-runtime\.js'\)/g)||[]).length;
  assert.equal(staticLoads,1);
  assert.equal(dynamicLoads,1);
});
test('polish CSS is widget-scoped and does not add an audio animation',()=>{
  const css=readFileSync(new URL('../../src/styles/widget-polish.css',import.meta.url),'utf8');
  assert.ok(css.includes('body.widget'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(!/@keyframes|#stage|canvas|#widget-mic\s*\{\s*display\s*:\s*none/.test(css));
});
