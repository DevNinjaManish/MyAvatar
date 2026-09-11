import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {linearFocusIndex} from '../../src/widget/accessibility-controller.js';
import {disclosureFocusIndex} from '../../src/widget/panels.js';

test('popup keyboard navigation wraps and supports Home/End',()=>{
  assert.equal(linearFocusIndex('ArrowDown',0,3),1);
  assert.equal(linearFocusIndex('ArrowDown',2,3),0);
  assert.equal(linearFocusIndex('ArrowUp',0,3),2);
  assert.equal(linearFocusIndex('ArrowRight',1,3),2);
  assert.equal(linearFocusIndex('ArrowLeft',0,3),2);
  assert.equal(linearFocusIndex('Home',2,3),0);
  assert.equal(linearFocusIndex('End',0,3),2);
  assert.equal(linearFocusIndex('Enter',0,3),null);
});

test('Rivet disclosure headers keep predictable vertical navigation',()=>{
  assert.equal(disclosureFocusIndex('ArrowDown',3,4),0);
  assert.equal(disclosureFocusIndex('ArrowUp',0,4),3);
  assert.equal(disclosureFocusIndex('Home',2,4),0);
  assert.equal(disclosureFocusIndex('End',1,4),3);
});

test('secondary disclosures are centrally synchronized',()=>{
  const source=fs.readFileSync(new URL('../../src/widget/accessibility-controller.js',import.meta.url),'utf8');
  assert.match(source,/widget-quality-panel/);
  assert.match(source,/widget-system-hud/);
  assert.match(source,/widget-rivet-details-body/);
  assert.match(source,/aria-controls/);
  assert.match(source,/aria-expanded/);
});

test('Rivet Details is a named disclosure region',()=>{
  const source=fs.readFileSync(new URL('../../src/widget/rivet-workspace.js',import.meta.url),'utf8');
  assert.match(source,/widget-rivet-details-toggle/);
  assert.match(source,/widget-rivet-details-body/);
  assert.match(source,/role','region'/);
  assert.match(source,/Rivet advanced tools/);
});
