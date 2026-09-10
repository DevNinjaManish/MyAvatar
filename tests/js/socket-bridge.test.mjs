import test from 'node:test';
import assert from 'node:assert/strict';
import {installSocketBridge} from '../../src/conversation/socket-bridge.js';

class FakeSocket{
  static CONNECTING=0;static OPEN=1;static CLOSING=2;static CLOSED=3;
  constructor(url){this.url=url;this.readyState=FakeSocket.OPEN;}
}

test('socket bridge preserves WebSocket constants and exposes latest socket',()=>{
  const win={WebSocket:FakeSocket};
  installSocketBridge(win);
  const socket=new win.WebSocket('ws://local');
  assert.equal(win.__myAvatarSocket,socket);
  assert.equal(win.WebSocket.OPEN,1);
  assert.equal(socket.url,'ws://local');
});

test('socket bridge installs only once',()=>{
  const win={WebSocket:FakeSocket};
  installSocketBridge(win);const Bridged=win.WebSocket;
  installSocketBridge(win);
  assert.equal(win.WebSocket,Bridged);
});
