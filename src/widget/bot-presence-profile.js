export const BOT_PRESENCE_PROFILES={
  nova:{name:'Nova',role:'Personal companion',ready:'Here',listening:'Listening',thinking:'Thinking it through',speaking:'With you',preparing:'Getting ready',limited:'Here · limited',offline:'Offline',motion:'warm'},
  robot:{name:'Rivet',role:'Coding companion',ready:'Ready',listening:'Listening',thinking:'Inspecting',speaking:'Speaking',preparing:'Preparing tools',limited:'Ready · limited',offline:'Offline',motion:'mechanical'},
  butler:{name:'Sterling',role:'Executive assistant',ready:'At your service',listening:'Listening',thinking:'Considering',speaking:'Speaking',preparing:'Preparing',limited:'Available · limited',offline:'Offline',motion:'composed'},
  pixel:{name:'Pixel',role:'Marketing assistant',ready:'Ready to make noise',listening:'Listening',thinking:'Finding the angle',speaking:'Pitching',preparing:'Warming up',limited:'Ready · limited',offline:'Offline',motion:'snappy'},
  luma:{name:'Luma',role:'Product designer',ready:'Ready to refine',listening:'Listening',thinking:'Exploring',speaking:'Explaining',preparing:'Setting the canvas',limited:'Ready · limited',offline:'Offline',motion:'calm'},
};

export function botPresenceProfile(botId='nova'){
  return BOT_PRESENCE_PROFILES[botId]||BOT_PRESENCE_PROFILES.nova;
}

export function botStateLabel(botId,state){
  const profile=botPresenceProfile(botId);
  return profile[state]||state;
}
