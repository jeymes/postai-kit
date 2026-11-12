# Baixa os modelos do MuseTalk para MuseTalk/models (roda com o Python do
# avatar, de dentro da pasta MuseTalk). Só o que a geração usa: o modelo do
# LatentSync (só para treino) fica de fora. Licenças: MuseTalk e sd-vae-ft-mse
# MIT, whisper-tiny MIT, DWPose Apache 2.0, face-parsing MIT, resnet18 BSD.
import os
import urllib.request

import gdown
from huggingface_hub import hf_hub_download

ARQUIVOS = [
    ("TMElyralab/MuseTalk", "musetalkV15/musetalk.json", "models"),
    ("TMElyralab/MuseTalk", "musetalkV15/unet.pth", "models"),
    ("stabilityai/sd-vae-ft-mse", "config.json", "models/sd-vae"),
    ("stabilityai/sd-vae-ft-mse", "diffusion_pytorch_model.bin", "models/sd-vae"),
    ("openai/whisper-tiny", "config.json", "models/whisper"),
    ("openai/whisper-tiny", "pytorch_model.bin", "models/whisper"),
    ("openai/whisper-tiny", "preprocessor_config.json", "models/whisper"),
    ("yzd-v/DWPose", "dw-ll_ucoco_384.pth", "models/dwpose"),
]

for repo, arquivo, pasta in ARQUIVOS:
    print(f"  {repo}/{arquivo}", flush=True)
    hf_hub_download(repo_id=repo, filename=arquivo, local_dir=pasta)

os.makedirs("models/face-parse-bisent", exist_ok=True)
rosto = "models/face-parse-bisent/79999_iter.pth"
if not os.path.exists(rosto):
    print("  face-parsing (Google Drive)", flush=True)
    gdown.download(id="154JgKpzCPW82qINcVieuPH3fZ2e0P812", output=rosto, quiet=True)
resnet = "models/face-parse-bisent/resnet18-5c106cde.pth"
if not os.path.exists(resnet):
    print("  resnet18", flush=True)
    urllib.request.urlretrieve("https://download.pytorch.org/models/resnet18-5c106cde.pth", resnet)
print("Modelos prontos.")
