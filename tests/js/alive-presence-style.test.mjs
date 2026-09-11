import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../src/avatar/presence-orchestrator.css',import.meta.url),'utf8');

test('alive lifecycle has attentive and settling visual phases',()=>{
  assert.match(css,/data-presence-phase="attentive"/);
  assert.match(css,/data-presence-phase="settling"/);
  assert.match(css,/--speak-lift/);
});

test('all shared motion personalities have authored timing treatment',()=>{
  for(const motion of ['warm','composed','snappy','calm','mechanical']){
    assert.ok(css.includes(`data-presence-motion="${motion}"`),`missing motion style ${motion}`);
  }
});

test('reduced motion disables lifecycle animation and transforms',()=>{
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/animation:none!important/);
  assert.match(css,/transition:none!important/);
  assert.match(css,/transform:none!important/);
});
