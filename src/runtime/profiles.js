export const PERFORMANCE_PROFILES=Object.freeze({
  FAST:'fast',
  BALANCED:'balanced'
});

const GB=1024**3;

export function detectPerformanceProfile({arch=process.arch,totalMemoryBytes=0,requested='auto'}={}){
  if(requested===PERFORMANCE_PROFILES.FAST||requested===PERFORMANCE_PROFILES.BALANCED)return requested;
  // Keep the automatic choice conservative. A later benchmark can refine this
  // without changing callers or the profile contract.
  if(totalMemoryBytes>0&&totalMemoryBytes>=16*GB&&arch==='arm64')return PERFORMANCE_PROFILES.BALANCED;
  return PERFORMANCE_PROFILES.FAST;
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
