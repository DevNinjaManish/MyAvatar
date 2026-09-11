import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';

const root=resolve(new URL('..',import.meta.url).pathname);
const checks=[
  ['macOS',process.platform==='darwin','MyAvatar MVP targets macOS.'],
  ['Node.js',Number(process.versions.node.split('.')[0])>=20,'Node.js 20 or newer is required.'],
  ['Dependencies',existsSync(resolve(root,'node_modules/vite')),'Run npm ci to install dependencies.'],
];
for(const [name,ok,detail] of checks) console.log(`${ok?'✓':'✗'} ${name}: ${ok?'ready':detail}`);
const whisper=spawnSync('whisper',['--help'],{stdio:'ignore'}).status===0;
const say=existsSync('/usr/bin/say');
console.log(`${whisper?'✓':'⚠'} Whisper voice input: ${whisper?'ready':'optional; install with brew install openai-whisper'}`);
console.log(`${say?'✓':'⚠'} macOS speech output: ${say?'ready':'optional; typed chat remains available'}`);
process.exitCode=checks.every(([,ok])=>ok)?0:1;
