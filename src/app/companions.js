import {voiceProfiles} from './voice-profiles.js';

export const companions=Object.freeze([
  {id:'nova',name:'Nova',description:'Everyday companion',accent:'#f59abf',asset:'nova',voice:voiceProfiles.nova},
  {id:'sterling',name:'Sterling',description:'Planning companion',accent:'#75a9e8',asset:'sterling',voice:voiceProfiles.sterling},
  {id:'rivet',name:'Rivit',description:'Coding companion',accent:'#79d8ef',asset:'rivet',voice:voiceProfiles.rivet},
  {id:'luma',name:'Luma',description:'Design companion',accent:'#64dfff',asset:'luma',voice:voiceProfiles.luma},
]);

export const companionById=Object.freeze(Object.fromEntries(companions.map(companion=>[companion.id,companion])));
