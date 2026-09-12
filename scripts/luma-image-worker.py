import base64
import io
import json
import os
import sys
import time

from PIL import Image, ImageOps
import torch
from diffusers import DPMSolverMultistepScheduler, StableDiffusionImg2ImgPipeline, StableDiffusionPipeline

model_path, output_dir = sys.argv[1:3]
request = json.load(sys.stdin)
prompt = request['prompt']
mode = request.get('mode', 'generate')
strength = max(.32, min(.76, float(request.get('strength', .46))))
format = request.get('format', 'square')
sizes = {'square': (512, 512), 'portrait': (448, 640), 'landscape': (640, 448)}
width, height = sizes.get(format, sizes['square'])
device = 'mps' if torch.backends.mps.is_available() else 'cpu'
dtype = torch.float16 if device == 'mps' else torch.float32

def load_pipe(image_mode=False):
    cls = StableDiffusionImg2ImgPipeline if image_mode else StableDiffusionPipeline
    local = os.path.isdir(model_path) and bool(os.listdir(model_path))
    pipe = cls.from_pretrained(model_path if local else 'stable-diffusion-v1-5/stable-diffusion-v1-5', torch_dtype=dtype, use_safetensors=True, local_files_only=local)
    if not local:
        pipe.save_pretrained(model_path)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
    pipe = pipe.to(device)
    pipe.enable_attention_slicing()
    return pipe

try:
    os.makedirs(model_path, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)
    if mode == 'repair':
        load_pipe(False)
        print(json.dumps({'ready': True}))
    else:
        generator = torch.Generator(device='cpu').manual_seed(int(time.time() * 1000) % 2147483647)
        if mode == 'edit':
            source = request.get('image', '')
            encoded = source.split(',', 1)[1]
            image = Image.open(io.BytesIO(base64.b64decode(encoded))).convert('RGB')
            image = ImageOps.fit(image, (512, 512), method=Image.Resampling.LANCZOS)
            output = load_pipe(True)(prompt=prompt + ', cohesive composition, refined details', negative_prompt='text, watermark, logo, blurry, low quality, malformed, deformed, extra limbs', image=image, strength=strength, guidance_scale=7.5, num_inference_steps=22, generator=generator).images[0]
        else:
            output = load_pipe(False)(prompt=prompt + ', cohesive composition, refined details, clean edges', negative_prompt='text, watermark, logo, blurry, low quality, malformed, deformed, extra limbs', width=width, height=height, guidance_scale=7.5, num_inference_steps=22, generator=generator).images[0]
        buffer = io.BytesIO()
        output.save(buffer, format='PNG', optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
        output.save(os.path.join(output_dir, f'luma-{int(time.time())}.png'))
        print(json.dumps({'image': 'data:image/png;base64,' + encoded, 'seed': generator.initial_seed(), 'prompt': prompt}))
except Exception as error:
    print(json.dumps({'error': str(error)}))
