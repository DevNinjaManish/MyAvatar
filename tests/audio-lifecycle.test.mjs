import test from 'node:test';
import assert from 'node:assert/strict';
import {captureAction,shouldResumeAfterStop} from '../src/audio/lifecycle.js';

const live={active:true,mode:'live',muted:false,generation:2};
const manual={active:true,mode:'manual',muted:false,generation:3};
const idle={active:false,mode:null,muted:false,generation:4};

test('end conversation owns capture shutdown',()=>{
 assert.equal(captureAction('end-conversation',live),'end');
 assert.equal(captureAction('end-conversation',manual),'end');
});

test('full live mic click ends the live capture but manual finish remains owned by recorder flow',()=>{
 assert.equal(captureAction('full-mic-click',live),'end');
 assert.equal(captureAction('full-mic-click',manual),'none');
});

test('mute and stop speaking do not release the microphone',()=>{
 assert.equal(captureAction('mute',live),'none');
 assert.equal(captureAction('stop-speaking',live),'none');
});

test('stop speaking resumes only an active unmuted live capture',()=>{
 assert.equal(shouldResumeAfterStop(live,false),true);
 assert.equal(shouldResumeAfterStop(live,true),false);
 assert.equal(shouldResumeAfterStop(manual,false),false);
 assert.equal(shouldResumeAfterStop(idle,false),false);
});

test('disconnect and unload always release an active capture',()=>{
 assert.equal(captureAction('disconnect',live),'end');
 assert.equal(captureAction('unload',manual),'end');
 assert.equal(captureAction('disconnect',idle),'none');
});
