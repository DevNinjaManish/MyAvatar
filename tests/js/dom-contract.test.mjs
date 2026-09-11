import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CORE_RUNTIME_IDS} from '../../src/app/dom-contract.js';

const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
const entry=await readFile(new URL('../../src/app/entry.js',import.meta.url),'utf8');

function htmlIds(source){
  return new Set([...source.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]));
}

test('index.html satisfies the renderer core DOM contract',()=>{
  const ids=htmlIds(html);
  const missing=CORE_RUNTIME_IDS.filter(id=>!ids.has(id));
  assert.deepEqual(missing,[],`Missing renderer DOM nodes: ${missing.join(', ')}`);
});

test('entry isolates optional modules from core renderer startup',()=>{
  assert.match(entry,/Promise\.allSettled\(/);
  assert.match(entry,/recordModuleFailure/);
  assert.match(entry,/if\(coreReady\)await loadOptionalModules\(\)/);
});

test('entry validates the DOM contract before loading widget runtime',()=>{
  const contractIndex=entry.indexOf('assertRuntimeDomContract(document)');
  const runtimeIndex=entry.indexOf("await import('./widget-runtime.js')");
  assert.ok(contractIndex>=0,'DOM contract validation is missing');
  assert.ok(runtimeIndex>contractIndex,'widget runtime must load after DOM contract validation');
});
