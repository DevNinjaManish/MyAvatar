import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const fail=message=>{console.error(`\nSetup needs attention: ${message}`);process.exit(1);};
const run=(command,args)=>{
  const result=spawnSync(command,args,{stdio:'inherit'});
  if(result.error)fail(`${command} is not installed. See README.md for the one-time prerequisite commands.`);
  if(result.status!==0)process.exit(result.status||1);
};

if(process.platform!=='darwin')fail('MyAvatar V1 currently supports macOS on Apple Silicon.');
if(process.arch!=='arm64')fail('Apple Silicon is required by the current MLX speech stack.');
run('node',['--version']);
run('uv',['--version']);
if(!existsSync('.venv/bin/python'))run('uv',['venv','--python','3.11']);
run('npm',['ci']);
run('uv',['pip','install','-r','requirements.lock']);
console.log('\nSetup complete. Next run: ollama pull qwen3.5:0.8b');
console.log('Then run npm run doctor for a local readiness report, and start MyAvatar with: npm start');
