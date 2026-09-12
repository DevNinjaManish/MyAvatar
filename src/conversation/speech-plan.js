const profiles={
  nova:{pace:1.0,pause:150},sterling:{pace:.94,pause:210},rivet:{pace:1.05,pause:105},luma:{pace:.98,pause:175}
};
export function speechPlan(text,{bot='nova',emotion='relaxed'}={}){
  const profile=profiles[bot]||profiles.nova;const emotionRate={happy:1.025,sad:.94,curious:.98,surprised:1.04,relaxed:1}[emotion]||1;
  const phrases=String(text||'').trim().split(/(?<=[,;:—])\s+/u).filter(Boolean);
  return (phrases.length?phrases:[String(text||'').trim()]).map((phrase,index,all)=>({text:phrase,speed:profile.pace*emotionRate,pauseMs:index===all.length-1?Math.round(profile.pause*.55):profile.pause}));
}
