import test from 'node:test';
import assert from 'node:assert/strict';
import {addRecentProject,normalizeProjectScope} from '../../src/rivet/project-scope.js';

test('project scope keeps only bounded, read-only summary fields',()=>{
  const scope=normalizeProjectScope({path:'/work/app',name:'app',fileCount:12,git:{available:true,branch:'main',changes:3}});
  assert.deepEqual(scope,{path:'/work/app',name:'app',fileCount:12,hasMore:false,git:{available:true,branch:'main',changes:3}});
  assert.equal(normalizeProjectScope({path:'/work/app'}),null);
});

test('recent projects are unique and newest first',()=>{
  const one={path:'/work/one',name:'one'},two={path:'/work/two',name:'two'};
  assert.deepEqual(addRecentProject(addRecentProject([one],two),one).map(item=>item.path),['/work/one','/work/two']);
});
