const STORAGE_KEY='myavatar.local-calendar.v1';

export function readLocalCalendar(storage=globalThis.localStorage){
  try{const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value.filter(event=>event&&event.id&&event.title&&event.start):[];}catch{return[];}
}

export function saveLocalCalendarEvent(event,storage=globalThis.localStorage){
  const next={id:event.id||`local-${Date.now()}`,title:String(event.title||'Local event').trim(),start:event.start,calendar:'On this Mac · local',source:'local'};
  const events=[...readLocalCalendar(storage).filter(item=>item.id!==next.id),next].sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  storage?.setItem(STORAGE_KEY,JSON.stringify(events));
  return next;
}

export function mergeCalendarEvents(nativeEvents=[],localEvents=[]){
  return [...nativeEvents.map(event=>({...event,source:event.source||'mac'})),...localEvents].sort((a,b)=>String(a.start).localeCompare(String(b.start)));
}

export const localCalendarStorageKey=STORAGE_KEY;
