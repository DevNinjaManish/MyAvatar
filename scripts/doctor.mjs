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
const python=resolve(root,'.venv/bin/python');
const voicePython=existsSync(python)&&spawnSync(python,['-c','import faster_whisper, kokoro_onnx, sherpa_onnx'],{stdio:'ignore'}).status===0;
const kokoro=existsSync(resolve(root,'models/kokoro-v1.0.onnx'))&&existsSync(resolve(root,'models/voices-v1.0.bin'));
const zipformer=existsSync(resolve(root,'models/streaming-asr/sherpa-onnx-streaming-zipformer-en-2023-06-26/tokens.txt'));
const ollama=spawnSync('ollama',['list'],{encoding:'utf8'});
const models=ollama.stdout||'';
console.log(`${voicePython?'✓':'✗'} Voice Python runtime: ${voicePython?'ready':'run .venv/bin/pip install -r requirements-voice.txt'}`);
console.log(`${kokoro?'✓':'✗'} Kokoro persona TTS: ${kokoro?'ready':'local Kokoro assets are missing'}`);
console.log(`${zipformer?'✓':'✗'} Zipformer provisional captions: ${zipformer?'ready':'streaming ASR assets are missing'}`);
const requiredModels=['huihui_ai/qwen3.5-abliterated:4b','huihui_ai/qwen3.5-abliterated:9b'];
for(const model of requiredModels)console.log(`${models.includes(model)?'✓':'✗'} Ollama ${model}: ${models.includes(model)?'ready':`run ollama pull ${model}`}`);
process.exitCode=checks.every(([,ok])=>ok)&&voicePython&&kokoro&&zipformer&&requiredModels.every(model=>models.includes(model))?0:1;
