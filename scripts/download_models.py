"""Explicit setup step: ~500 MB speech weights. No runtime TTS downloads."""
from pathlib import Path
from urllib.request import urlretrieve
root=Path(__file__).resolve().parents[1]
(root/'models').mkdir(exist_ok=True)
for name in ('kokoro-v1.0.onnx','voices-v1.0.bin'):
    target=root/'models'/name
    if not target.exists():
        print('Downloading',name,flush=True)
        urlretrieve('https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/'+name,str(target)+'.part')
        Path(str(target)+'.part').rename(target)
from huggingface_hub import snapshot_download
snapshot_download('mlx-community/whisper-base.en-mlx')
print('Speech weights ready.')
