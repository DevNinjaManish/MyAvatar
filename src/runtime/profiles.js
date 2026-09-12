export const PERFORMANCE_PROFILES=Object.freeze({
  FAST:'fast',
  BALANCED:'balanced'
});

export const PERFORMANCE_PROFILE_SETTINGS=Object.freeze({
  [PERFORMANCE_PROFILES.FAST]:Object.freeze({
    id:PERFORMANCE_PROFILES.FAST,label:'Fast',description:'Lower memory use and quicker responses',
    maxTokens:192,maxFps:30,effectFps:16
  }),
  [PERFORMANCE_PROFILES.BALANCED]:Object.freeze({
    id:PERFORMANCE_PROFILES.BALANCED,label:'Balanced',description:'Richer responses with more visual detail',
    maxTokens:256,maxFps:45,effectFps:24
  })
});

const GB=1024**3;

export function detectPerformanceProfile({arch=process.arch,totalMemoryBytes=0,requested='auto'}={}){
  if(requested===PERFORMANCE_PROFILES.FAST||requested===PERFORMANCE_PROFILES.BALANCED)return requested;
  // RAM is the primary signal. Architecture remains available in the hardware
  // summary, but should not unexpectedly force a capable Intel Mac into Fast.
  if(totalMemoryBytes>0&&totalMemoryBytes>=16*GB)return PERFORMANCE_PROFILES.BALANCED;
  return PERFORMANCE_PROFILES.FAST;
}

export function profileSettings(profile){
  return PERFORMANCE_PROFILE_SETTINGS[profile]||PERFORMANCE_PROFILE_SETTINGS[PERFORMANCE_PROFILES.FAST];
}

export function hardwareSummary({arch=process.arch,totalMemoryBytes=0,cpuCount=0}={}){
  return Object.freeze({
    architecture:arch,
    supportedArchitecture:arch==='arm64'||arch==='x64',
    memoryGb:totalMemoryBytes?Math.round(totalMemoryBytes/GB):null,
    cpuCount,
    minimumMemoryTargetGb:8,
    preferredMemoryTargetGb:16
  });
}
