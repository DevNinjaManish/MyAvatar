import {voiceProfiles} from './voice-profiles.js';

export const companions=Object.freeze([
  {id:'nova',name:'Nova',description:'Everyday companion',accent:'#f59abf',asset:'nova',voice:voiceProfiles.nova,presence:{IDLE:'Warmly attentive',LISTENING:'Listening closely',THINKING:'Turning it over',SPEAKING:'Sharing a thought',WORKING:'Staying with it'}},
  {id:'sterling',name:'Sterling',description:'Planning companion',accent:'#75a9e8',asset:'sterling',voice:voiceProfiles.sterling,presence:{IDLE:'At your service',LISTENING:'Giving this care',THINKING:'Considering the details',SPEAKING:'Putting it plainly',WORKING:'Keeping watch'}},
  {id:'rivet',name:'Rivit',description:'Coding companion',accent:'#79d8ef',asset:'rivet',voice:voiceProfiles.rivet,presence:{IDLE:'Ready to build',LISTENING:'Tracking the signal',THINKING:'Finding the angle',SPEAKING:'Calling it straight',WORKING:'On the problem'}},
  {id:'luma',name:'Luma',description:'Design companion',accent:'#64dfff',asset:'luma',voice:voiceProfiles.luma,presence:{IDLE:'Looking for an idea',LISTENING:'Taking it in',THINKING:'Exploring the shape',SPEAKING:'Following the thread',WORKING:'Making it take form'}},
]);

export const companionById=Object.freeze(Object.fromEntries(companions.map(companion=>[companion.id,companion])));
