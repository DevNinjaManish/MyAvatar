import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../src/styles/full-polish.css',import.meta.url),'utf8');

test('full-view session focus separates label and value',()=>{
  assert.match(css,/body:not\(\.widget\) #messages \.session-focus\s*\{[\s\S]*?display:grid/);
  assert.match(css,/body:not\(\.widget\) #messages \.session-focus strong\s*\{[\s\S]*?text-transform:uppercase/);
  assert.match(css,/body:not\(\.widget\) #messages \.session-focus span\s*\{[\s\S]*?line-height:1\.45/);
});
