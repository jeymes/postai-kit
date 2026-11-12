// Instala o avatar falante neste computador, em .avatar/ (uns 7 GB, uma vez só):
// o MuseTalk (código e modelo MIT, uso comercial liberado), que sincroniza a
// boca de um vídeo curto da pessoa com a narração do kit. Precisa de placa de
// vídeo NVIDIA com 4 GB ou mais (Windows ou Linux); no Mac ainda não roda.
// Nada disso vai no .zip do kit: cada computador baixa o seu.
//
// Uso: npm run avatar:instalar
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { baixar, descompactar, exigirUv, rodar } from "../instalacao.ts";
import { MUSETALK, PASTA_DO_AVATAR, PYTHON_DO_AVATAR } from "./caminhos.ts";

// Versão fixa do MuseTalk (1.5), conferida em 29/10/2026
const MUSETALK_VERSAO = "0a89dec45a0192b824e3cf4daf96c239440c5ed8";
const MINIMO_GB = 4;

// Só o que a geração usa (o TensorFlow e o Gradio do requirements.txt são do
// treino e da interface web deles), nas versões que o MuseTalk pede.
const PACOTES = [
  "diffusers==0.30.2",
  "accelerate==0.28.0",
  "numpy==1.23.5",
  "opencv-python==4.9.0.80",
  "soundfile==0.12.1",
  "transformers==4.39.2",
  "huggingface_hub==0.30.2",
  "librosa==0.11.0",
  "einops==0.8.1",
  "omegaconf",
  "ffmpeg-python",
  "gdown",
  "requests",
  "openmim",
];

const placa = spawnSync("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"], {
  encoding: "utf8",
});
const [nome, mb] = placa.status === 0 ? placa.stdout.trim().split("\n")[0].split(",") : [];
const memoriaGb = Number(mb) / 1024;
if (!nome) {
  console.error(
    [
      "O avatar precisa de uma placa de vídeo NVIDIA (com 4 GB ou mais), no Windows ou no Linux.",
      process.platform === "darwin"
        ? "No Mac ele ainda não roda: o MuseTalk só funciona com placa NVIDIA. Use o mascote da narração."
        : "Não achei nenhuma. Se a placa existe, instale o driver da NVIDIA e rode de novo.",
    ].join("\n"),
  );
  process.exit(1);
}
if (memoriaGb < MINIMO_GB) {
  console.error(`A placa ${nome.trim()} tem ${memoriaGb.toFixed(1)} GB; o avatar precisa de pelo menos ${MINIMO_GB} GB.`);
  process.exit(1);
}
console.log(`Placa: ${nome.trim()} (${memoriaGb.toFixed(0)} GB)\n`);

const uv = exigirUv("npm run avatar:instalar");
mkdirSync(PASTA_DO_AVATAR, { recursive: true });

console.log("1/5 MuseTalk");
if (!existsSync(MUSETALK)) {
  const temporaria = mkdtempSync(join(tmpdir(), "musetalk-"));
  const zip = join(temporaria, "musetalk.zip");
  await baixar(`https://codeload.github.com/TMElyralab/MuseTalk/zip/${MUSETALK_VERSAO}`, zip);
  descompactar(zip, temporaria);
  const pasta = readdirSync(temporaria).find((p) => p.startsWith("MuseTalk-"));
  if (!pasta) throw new Error("O pacote do MuseTalk veio diferente do esperado.");
  renameSync(join(temporaria, pasta), MUSETALK);
  rmSync(temporaria, { recursive: true, force: true });
}

console.log("2/5 Python do avatar (3.10, como o MuseTalk pede)");
// --seed põe o pip no ambiente: o mim (pacotes da OpenMMLab) usa ele
if (!existsSync(PYTHON_DO_AVATAR)) rodar(uv, ["venv", "--seed", "--python", "3.10", join(PASTA_DO_AVATAR, "python")]);

console.log("3/5 PyTorch com CUDA e as dependências (uns 3 GB)");
rodar(uv, [
  "pip",
  "install",
  "--python",
  PYTHON_DO_AVATAR,
  "torch==2.0.1",
  "torchvision==0.15.2",
  "torchaudio==2.0.2",
  "--index-url",
  "https://download.pytorch.org/whl/cu118",
]);
rodar(uv, ["pip", "install", "--python", PYTHON_DO_AVATAR, ...PACOTES]);
rodar(PYTHON_DO_AVATAR, ["-m", "mim", "install", "mmengine", "mmcv==2.0.1", "mmdet==3.1.0", "mmpose==1.1.0"]);

console.log("4/5 Modelos (uns 4 GB, só desta vez)");
rodar(PYTHON_DO_AVATAR, [join(process.cwd(), "ferramentas", "avatar", "baixar_modelos.py")], MUSETALK);

console.log("5/5 Teste");
const teste = spawnSync(
  PYTHON_DO_AVATAR,
  ["-c", "import torch, mmpose, mmcv; assert torch.cuda.is_available(), 'sem CUDA'; print(torch.cuda.get_device_name(0))"],
  { encoding: "utf8", cwd: MUSETALK },
);
if (teste.status !== 0) {
  console.error(teste.stderr || teste.stdout);
  console.error("O avatar foi instalado, mas o teste não passou (veja o erro acima).");
  process.exit(1);
}
console.log(`\nAvatar instalado, usando a placa ${teste.stdout.trim()}.`);
console.log("Agora: grave o vídeo base em public/avatar/base.mp4 (veja a skill avatar) e rode npm run avatar -- conteudo/<peça>.json");
