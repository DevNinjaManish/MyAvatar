import {spawnSync} from 'node:child_process';

if(process.platform!=='darwin'){
  console.error('MyAvatar MVP currently targets macOS.');
  process.exit(1);
}
const result=spawnSync('npm',['ci'],{stdio:'inherit'});
if(result.status!==0) process.exit(result.status||1);
console.log('\nSetup complete. Start the widget with: npm start');
