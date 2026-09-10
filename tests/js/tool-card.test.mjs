import test from 'node:test';
import assert from 'node:assert/strict';
import {toolCardTitle,toolResultPresentation} from '../../src/conversation/tool-card.js';

test('approval cards expose pending success failure and neutral states',()=>{
  assert.deepEqual(toolResultPresentation({type:'approval',meta:{approvalState:'pending'}}),{tone:'pending',label:'Approval needed'});
  assert.deepEqual(toolResultPresentation({type:'approval',meta:{approvalState:'approved'}}),{tone:'success',label:'Completed'});
  assert.deepEqual(toolResultPresentation({type:'approval',meta:{approvalState:'failed'}}),{tone:'danger',label:'Failed'});
  assert.deepEqual(toolResultPresentation({type:'approval',meta:{approvalState:'denied'}}),{tone:'neutral',label:'Denied'});
  assert.deepEqual(toolResultPresentation({type:'approval',meta:{approvalState:'cancelled'}}),{tone:'neutral',label:'Cancelled'});
});

test('tool result cards classify outcome without reading prose',()=>{
  assert.deepEqual(toolResultPresentation({type:'tool-result',text:'anything',meta:{ok:true}}),{tone:'success',label:'Completed'});
  assert.deepEqual(toolResultPresentation({type:'tool-result',text:'anything',meta:{ok:false}}),{tone:'danger',label:'Failed'});
  assert.deepEqual(toolResultPresentation({type:'tool-result',text:'anything',meta:{denied:true,ok:false}}),{tone:'neutral',label:'Denied'});
});

test('only tool and approval messages receive tool card titles',()=>{
  assert.equal(toolCardTitle({type:'approval'}),'Local action');
  assert.equal(toolCardTitle({type:'tool-result'}),'Tool result');
  assert.equal(toolCardTitle({type:'message'}),'');
  assert.equal(toolResultPresentation({type:'message'}),null);
});
