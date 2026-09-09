import test from 'node:test';
import assert from 'node:assert/strict';
import {mountReadinessUI} from '../src/conversation/readiness-ui.js';

function fakeElement(id){return {id,textContent:'',disabled:false,attrs:{},parentElement:null,setAttribute(k,v){this.attrs[k]=v;},closest(selector){return selector.includes(`#${id}`)?this:null;}};}

class FakeWindow extends EventTarget{}

test('readiness UI keeps text gate open while disabling voice input',()=>{
  const win=new FakeWindow();
  const status=fakeElement('status'),widgetStatus=fakeElement('widget-status'),mic=fakeElement('mic'),widgetMic=fakeElement('widget-mic');
  status.parentElement=new EventTarget();
  const elements={status,'widget-status':widgetStatus,mic,'widget-mic':widgetMic};
  const doc={body:{dataset:{}},getElementById:id=>elements[id]||null,addEventListener(){},removeEventListener(){}};
  const Original=globalThis.MutationObserver;globalThis.MutationObserver=class{observe(){}disconnect(){}};
  const mounted=mountReadinessUI(win,doc);
  win.dispatchEvent(new CustomEvent('myavatar:readiness',{detail:{overall:'degraded',capabilities:{chat:true,listen:false,speak:true,voice:false}}}));
  assert.equal(mic.disabled,false);
  assert.equal(widgetMic.disabled,true);
  assert.match(status.textContent,/microphone input unavailable/i);
  assert.equal(doc.body.dataset.runtimeReadiness,'degraded');
  mounted.dispose();globalThis.MutationObserver=Original;
});
