const clean=value=>String(value||'').trim();

export function normalizeProjectScope(value){
  if(!value||typeof value!=='object')return null;
  const path=clean(value.path),name=clean(value.name);
  if(!path||!name)return null;
  return {path,name,fileCount:Number.isInteger(value.fileCount)&&value.fileCount>=0?value.fileCount:0,hasMore:Boolean(value.hasMore),git:{available:Boolean(value.git?.available),branch:clean(value.git?.branch)||null,changes:Number.isInteger(value.git?.changes)&&value.git.changes>=0?value.git.changes:0}};
}

export function addRecentProject(recent,scope,max=5){
  const next=normalizeProjectScope(scope);if(!next)return Array.isArray(recent)?recent.map(normalizeProjectScope).filter(Boolean):[];
  return [next,...(Array.isArray(recent)?recent:[]).map(normalizeProjectScope).filter(item=>item&&item.path!==next.path)].slice(0,max);
}
