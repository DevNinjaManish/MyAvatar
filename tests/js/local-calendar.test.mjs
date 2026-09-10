import test from 'node:test';
import assert from 'node:assert/strict';
import {localCalendarStorageKey,mergeCalendarEvents,readLocalCalendar,saveLocalCalendarEvent} from '../../src/calendar/local-calendar.js';

function storage(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}

test('local calendar stores events without mutating the native calendar source',()=>{
  const local=storage();
  const event=saveLocalCalendarEvent({title:'Focus block',start:'2026-09-11T09:00'},local);
  assert.equal(event.calendar,'On this Mac · local');
  assert.deepEqual(readLocalCalendar(local),[event]);
  assert.deepEqual(mergeCalendarEvents([{title:'Meeting',start:'2026-09-11T10:00',calendar:'Work'}],[event]).map(item=>item.title),['Focus block','Meeting']);
  assert.equal(local.getItem(localCalendarStorageKey).includes('Focus block'),true);
});

test('local calendar fails closed on malformed storage',()=>{
  const local={getItem:()=>'{bad'};
  assert.deepEqual(readLocalCalendar(local),[]);
});
