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

export function detectPerformanceProfile({arch=process.arch,totalMemoryBytes=0,modelIdentifier='',requested='auto'}={}){
  if(requested===PERFORMANCE_PROFILES.FAST||requested===PERFORMANCE_PROFILES.BALANCED)return requested;
  const model=String(modelIdentifier).toLowerCase();
  // Airs default to responsiveness. Pros with adequate memory default to the
  // richer route; every user may still explicitly choose Fast.
  if(model.startsWith('macbookair'))return PERFORMANCE_PROFILES.FAST;
  if(model.startsWith('macbookpro'))return totalMemoryBytes>=16*GB?PERFORMANCE_PROFILES.BALANCED:PERFORMANCE_PROFILES.FAST;
  if(totalMemoryBytes>0&&totalMemoryBytes>=16*GB)return PERFORMANCE_PROFILES.BALANCED;
  return PERFORMANCE_PROFILES.FAST;
}

export function profileSettings(profile){
  return PERFORMANCE_PROFILE_SETTINGS[profile]||PERFORMANCE_PROFILE_SETTINGS[PERFORMANCE_PROFILES.FAST];
}

export function hardwareSummary({arch=process.arch,totalMemoryBytes=0,cpuCount=0,modelIdentifier=''}={}){
  return Object.freeze({
    architecture:arch,
    supportedArchitecture:arch==='arm64'||arch==='x64',
    memoryGb:totalMemoryBytes?Math.round(totalMemoryBytes/GB):null,
    cpuCount,
    modelIdentifier:modelIdentifier||null,
    minimumMemoryTargetGb:8,
    preferredMemoryTargetGb:16
  });
}
