// Avatar falante: para cada cena já narrada (npm run narrar), o MuseTalk mexe
// a boca do vídeo base da pessoa no ritmo da fala. O vídeo de cada cena vai
// para public/narracao/<peça>/avatar-NN.mp4 e o caminho volta para o
// conteudo/<peça>.json, em "narracao.avatar" de cada cena. Só refaz a cena
// cuja fala ou vídeo base mudou.
//
// Uso: npm run avatar -- conteudo/<peça>.json [--refazer]
// Antes, uma vez: npm run avatar:instalar (placa NVIDIA)
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, join } from "node:path";
import { MUSETALK, PYTHON_DO_AVATAR, VIDEO_BASE_PADRAO, pastaDoFfmpeg } from "./avatar/caminhos.ts";

const args = process.argv.slice(2);
const caminho = args.find((arg) => !arg.startsWith("--"));
const refazer = args.includes("--refazer");
if (!caminho) {
  console.error("Uso: npm run avatar -- conteudo/<peça>.json");
  process.exit(1);
}
if (!existsSync(PYTHON_DO_AVATAR) || !existsSync(join(MUSETALK, "models", "musetalkV15", "unet.pth"))) {
  console.error("O avatar ainda não está instalado neste computador. Rode antes: npm run avatar:instalar");
  process.exit(1);
}

type Narracao = { audio?: string; chave?: string; avatar?: string; avatarChave?: string };
const peca = JSON.parse(readFileSync(caminho, "utf8"));
const cenas: Array<{ narracao?: Narracao }> = peca.cenas ?? [];
if (!cenas.some((cena) => cena.narracao?.audio)) {
  console.error(`Nenhuma cena narrada ainda. Rode antes: npm run narrar -- ${caminho}`);
  process.exit(1);
}

const videoBase: string = peca.avatarVideo ?? VIDEO_BASE_PADRAO;
const base = join(process.cwd(), "public", videoBase);
if (!existsSync(base)) {
  console.error(
    `Falta o vídeo base da pessoa em public/${videoBase}: 10 a 20 segundos, de frente, boa luz, rosto inteiro, boca fechada e sem cortes (veja a skill avatar).`,
  );
  process.exit(1);
}
const marcaDaBase = `${statSync(base).size}-${statSync(base).mtimeMs}`;

const nome = basename(caminho, ".json");
const pendentes = cenas
  .map((cena, indice) => {
    const n = cena.narracao;
    if (!n?.audio) return null;
    const chave = JSON.stringify([n.chave, videoBase, marcaDaBase]);
    const saida = `narracao/${nome}/avatar-${String(indice + 1).padStart(2, "0")}.mp4`;
    const pronta = n.avatarChave === chave && existsSync(join("public", saida));
    return pronta && !refazer ? null : { indice, chave, saida, audio: join(process.cwd(), "public", n.audio) };
  })
  .filter((p) => p !== null);

if (pendentes.length === 0) {
  console.log("O avatar já está em dia com a narração. Para gerar de novo: --refazer");
  process.exit(0);
}

// Um "task" por cena no formato de configuração do MuseTalk (YAML aceita as
// strings entre aspas do JSON, o que resolve as barras do Windows)
const temporaria = mkdtempSync(join(tmpdir(), "avatar-"));
const config = join(temporaria, "tarefas.yaml");
writeFileSync(
  config,
  pendentes
    .map(
      (p, i) =>
        `task_${i}:\n  video_path: ${JSON.stringify(base)}\n  audio_path: ${JSON.stringify(p.audio)}\n  result_name: ${JSON.stringify(basename(p.saida))}\n`,
    )
    .join("\n"),
);

console.log(`Gerando o avatar de ${pendentes.length} cena(s). Na primeira, ele estuda o rosto do vídeo base (demora mais).`);
const ffmpeg = pastaDoFfmpeg();
const r = spawnSync(
  PYTHON_DO_AVATAR,
  [
    "-m",
    "scripts.inference",
    "--inference_config",
    config,
    "--result_dir",
    temporaria,
    "--unet_model_path",
    "models/musetalkV15/unet.pth",
    "--unet_config",
    "models/musetalkV15/musetalk.json",
    "--version",
    "v15",
    "--use_float16",
    "--ffmpeg_path",
    ffmpeg,
  ],
  {
    cwd: MUSETALK,
    stdio: "inherit",
    // O ffmpeg do Remotion acha as bibliotecas dele na própria pasta
    env: { ...process.env, PATH: `${ffmpeg}${delimiter}${process.env.PATH}`, LD_LIBRARY_PATH: ffmpeg },
  },
);
if (r.status !== 0) {
  rmSync(temporaria, { recursive: true, force: true });
  console.error("\nO avatar falhou (veja o erro acima). Se for falta de memória da placa, feche outros programas e tente de novo.");
  process.exit(1);
}

for (const p of pendentes) {
  const gerado = join(temporaria, "v15", basename(p.saida));
  if (!existsSync(gerado)) {
    console.error(`O MuseTalk não gerou ${basename(p.saida)}.`);
    process.exit(1);
  }
  copyFileSync(gerado, join("public", p.saida));
  cenas[p.indice].narracao = { ...cenas[p.indice].narracao, avatar: p.saida, avatarChave: p.chave };
  console.log(`  cena ${p.indice + 1}: ${p.saida}`);
}
rmSync(temporaria, { recursive: true, force: true });

writeFileSync(caminho, `${JSON.stringify(peca, null, 2)}\n`);
console.log(`\nPronto: avatar gravado em ${caminho}. Agora: npm run previa -- ${caminho}`);
