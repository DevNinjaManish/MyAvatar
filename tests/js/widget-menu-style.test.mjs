import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../src/styles/widget-stack.css',import.meta.url),'utf8');

test('widget More menu is visible when open and hidden when closed',()=>{
  assert.match(css,/body\.widget #widget-menu\s*\{[\s\S]*?display:\s*block\s*!important;/);
  assert.match(css,/body\.widget #widget-menu\[hidden\][\s\S]*?\{\s*display:\s*none\s*!important;\s*\}/);
});
