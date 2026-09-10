import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {thinkingLabelForRuntime,thinkingLabelForClient,shouldHideThinkingCapsule} from '../../src/avatar/thinking-capsule.js';

test('general thinking exposes only a fixed safe activity label',()=>{
  assert.equal(thinkingLabelForRuntime({type:'state',state:'THINKING',text:'secret reasoning'},'nova'),'Preparing a reply…');
  assert.equal(thinkingLabelForRuntime({type:'token',text:'raw model output'},'nova'),null);
  assert.equal(thinkingLabelForRuntime({type:'state',state:'SPEAKING'},'nova'),null);
});

test('Rivet maps coding lifecycle events to bounded authored labels',()=>{
  assert.equal(thinkingLabelForRuntime({type:'coding_preparing',message:'private'},'robot'),'Starting coding model…');
  assert.equal(thinkingLabelForRuntime({type:'coding_context',paths:['/private/path']},'robot'),'Reviewing project files…');
  assert.equal(thinkingLabelForRuntime({type:'coding_verification',status:'running',output:'raw logs'},'robot'),'Running safe tests…');
  assert.equal(thinkingLabelForClient({type:'coding_repair',prompt:'hidden'},'robot'),'Preparing one repair…');
  assert.equal(thinkingLabelForClient({type:'coding_edit_decision',decision:'approve',diff:'secret'},'robot'),'Applying approved change…');
});

test('non-Rivet companions never receive coding-specific capsule labels',()=>{
  for(const bot of ['nova','butler','pixel','luma']){
    assert.equal(thinkingLabelForRuntime({type:'coding_context'},bot),null);
    assert.equal(thinkingLabelForClient({type:'coding_repair'},bot),null);
  }
});

test('speech completion and non-running verification hide the capsule',()=>{
  for(const type of ['audio','done','error','greeting','speech_unavailable'])assert.equal(shouldHideThinkingCapsule({type}),true);
  assert.equal(shouldHideThinkingCapsule({type:'state',state:'LISTENING'}),true);
  assert.equal(shouldHideThinkingCapsule({type:'coding_verification',status:'passed'}),true);
  assert.equal(shouldHideThinkingCapsule({type:'coding_verification',status:'running'}),false);
});

test('capsule implementation never copies raw runtime fields into a label',()=>{
  const source=readFileSync(new URL('../../src/avatar/thinking-capsule.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/label\.textContent\s*=\s*(?:payload|event|message)\./);
  assert.match(source,/Object\.values\(SAFE_LABELS\)\.includes\(text\)/);
  assert.match(source,/12000/);
});

test('reduced motion disables capsule animation',()=>{
  const css=readFileSync(new URL('../../src/avatar/thinking-capsule.css',import.meta.url),'utf8');
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none/);
});
