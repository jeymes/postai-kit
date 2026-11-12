// Faz os cortes escolhidos em trabalho/<id>/cortes.json:
//   trabalho/<id>/cortes/01/video.mp4   vertical 1080x1920, com gancho e legenda
//   trabalho/<id>/cortes/01/capa.jpg    capa (o primeiro segundo, com o gancho)
//   trabalho/<id>/cortes/01/info.json   título, legenda e duração, para o envio
//
// Uso: npm run cortar -- trabalho/<id>            todos os cortes
//      npm run cortar -- trabalho/<id> --so 2,3   só esses
//      npm run previa -- trabalho/<id>            só uma imagem de cada corte (rápido, para conferir o enquadramento)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join, relative } from "node:path";
import {
  FPS, RAIZ, doisDigitos, ffmpeg, lerJson, pastaDoTrabalho, tempo,
  type Origem, type PedidoDeCortes, type Transcricao,
} from "./comum.ts";
import { avisar } from "./postai.ts";

const args = process.argv.slice(2);
// Quantos quadros o Remotion monta ao mesmo tempo. Padrão: metade dos núcleos (com 8 GB, mais que isso fica mais lento).
const CONCORRENCIA = Number(process.env.CONCORRENCIA) || Math.max(1, Math.floor(cpus().length / 2));
const previa = args.includes("--previa");
const iSo = args.indexOf("--so");
const so = iSo >= 0 ? new Set(args[iSo + 1].split(",").map(Number)) : null;
const pasta = pastaDoTrabalho(args.find((a, i) => !a.startsWith("--") && (iSo < 0 || i !== iSo + 1)));

const origem = lerJson<Origem>(join(pasta, "origem.json"));
const transcricao = lerJson<Transcricao>(join(pasta, "transcricao.json"));
const arquivoDosCortes = join(pasta, "cortes.json");
if (!existsSync(arquivoDosCortes)) {
  console.error(`Falta ${relative(RAIZ, arquivoDosCortes)}: escolha os trechos antes (veja o CLAUDE.md).`);
  process.exit(1);
}
const pedido = lerJson<PedidoDeCortes>(arquivoDosCortes);

// Confere tudo antes de gastar tempo renderizando
const hashtags = (texto: string) => (texto.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
const problemas: string[] = [];
pedido.cortes.forEach((c, i) => {
  const n = i + 1;
  const duracao = c.fim - c.inicio;
  if (!(c.inicio >= 0 && c.fim <= origem.duracaoSeg + 0.5)) problemas.push(`corte ${n}: fora do vídeo (vai até ${tempo(origem.duracaoSeg)})`);
  if (duracao < 10 || duracao > 90) problemas.push(`corte ${n}: ${duracao.toFixed(1)} s (precisa ter de 10 a 90 s; o Reels do Facebook vai até 90)`);
  if (!c.titulo || c.titulo.length > 100 || /[<>]/.test(c.titulo)) problemas.push(`corte ${n}: título vazio, com mais de 100 caracteres ou com < >`);
  if (!c.gancho || c.gancho.length > 70) problemas.push(`corte ${n}: gancho vazio ou com mais de 70 caracteres`);
  const legenda = c.legenda;
  if (legenda.length > 2200) problemas.push(`corte ${n}: legenda com mais de 2200 caracteres`);
  if (hashtags(legenda) > 5) problemas.push(`corte ${n}: mais de 5 hashtags (o Instagram não aceita)`);
});
if (problemas.length) {
  console.error("Arrume o cortes.json:\n- " + problemas.join("\n- "));
  process.exit(1);
}

const publico = join(RAIZ, "public");
const temporaria = join(publico, origem.id);
rmSync(temporaria, { recursive: true, force: true });
mkdirSync(temporaria, { recursive: true });

const escolhidos = pedido.cortes.map((c, i) => ({ ...c, n: i + 1 })).filter((c) => !so || so.has(c.n));
const total = escolhidos.length;
await avisar(
  origem.pedidoId,
  previa
    ? `Escolhi ${total} ${total === 1 ? "trecho" : "trechos"}: ${escolhidos.map((c) => `"${c.titulo}"`).join(", ")}. Conferindo o enquadramento.`.slice(0, 300)
    : `Montando ${total} ${total === 1 ? "corte" : "cortes"} com legenda (uns 3 a 4 min cada).`,
);

// 1. Recorta cada trecho do vídeo original já no tamanho em que vai aparecer,
// para o Remotion ler o mínimo possível (é o que mais pesa no tempo):
//   desfocado: NN.mp4 com 1080 de largura, e NN-fundo.mp4 pequenininho (sem som) para o fundo
//   centro:    NN.mp4 já recortado em pé (9:16) no ponto do "foco"
const enquadramentoDo = (c: (typeof pedido.cortes)[number]) => c.enquadramento ?? pedido.enquadramento ?? "desfocado";
console.log(`Recortando ${escolhidos.length} trecho(s) de ${origem.arquivo}`);
for (const c of escolhidos) {
  const base = join(temporaria, doisDigitos(c.n));
  const duracao = c.fim - c.inicio;
  const corte = ["-ss", String(c.inicio), "-i", origem.arquivo, "-t", String(duracao)];
  const h264 = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    ...(previa ? ["-frames:v", String(Math.round(duracao * FPS))] : [])];
  if (enquadramentoDo(c) === "centro") {
    const foco = Math.min(1, Math.max(0, c.foco ?? 0.5));
    ffmpeg([...corte, "-vf", `crop=w='min(iw,ih*9/16)':h=ih:x='(iw-ow)*${foco}':y=0,scale=-2:'min(1920,ih)'`, ...h264, "-c:a", "aac", "-b:a", "160k", `${base}.mp4`]);
  } else {
    ffmpeg([...corte, "-vf", "scale='min(1080,iw)':-2", ...h264, "-c:a", "aac", "-b:a", "160k", `${base}.mp4`]);
    ffmpeg([...corte, "-an", "-vf", "crop=w='min(iw,ih*9/16)':h='min(ih,iw*16/9)',scale=136:240", ...h264, `${base}-fundo.mp4`]);
  }
}

// 2. Monta o vídeo vertical no Remotion
console.log("Preparando o Remotion");
const servido = await bundle({ entryPoint: join(RAIZ, "src", "index.ts"), publicDir: publico });

for (const c of escolhidos) {
  const nome = doisDigitos(c.n);
  const saida = join(pasta, "cortes", nome);
  mkdirSync(saida, { recursive: true });
  const duracaoSeg = Math.round((c.fim - c.inicio) * 100) / 100;
  const legendas = transcricao.segmentos
    .flatMap((s) => s.palavras)
    .filter((p) => p.i >= c.inicio - 0.05 && p.f <= c.fim + 0.05 && p.p)
    .map((p) => ({
      texto: p.p,
      inicioMs: Math.max(0, Math.round((p.i - c.inicio) * 1000)),
      fimMs: Math.round((p.f - c.inicio) * 1000),
    }));
  const props = {
    video: `${origem.id}/${nome}.mp4`,
    fundo: `${origem.id}/${nome}-fundo.mp4`,
    duracaoSeg,
    largura: origem.largura,
    altura: origem.altura,
    gancho: c.gancho,
    credito: "",
    enquadramento: enquadramentoDo(c),
    legendas,
  };
  const composicao = await selectComposition({ serveUrl: servido, id: "Corte", inputProps: props });

  if (previa) {
    const destino = join(saida, "previa.jpg");
    await renderStill({ composition: composicao, serveUrl: servido, output: destino, frame: Math.min(composicao.durationInFrames - 1, FPS * 3), inputProps: props, imageFormat: "jpeg", jpegQuality: 85 });
    console.log(`  ✓ corte ${nome}: ${relative(RAIZ, destino)}`);
    continue;
  }

  const video = join(saida, "video.mp4");
  let ultimo = -1;
  await renderMedia({
    composition: composicao,
    serveUrl: servido,
    codec: "h264",
    crf: 20,
    concurrency: CONCORRENCIA,
    outputLocation: video,
    inputProps: props,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== ultimo) process.stdout.write(`\r  corte ${nome}: ${pct}%`);
      ultimo = pct;
    },
  });
  const capa = join(saida, "capa.jpg");
  await renderStill({ composition: composicao, serveUrl: servido, output: capa, frame: Math.min(composicao.durationInFrames - 1, 20), inputProps: props, imageFormat: "jpeg", jpegQuality: 88 });
  const info = {
    corte: c.n,
    trecho: `${tempo(c.inicio)} → ${tempo(c.fim)}`,
    titulo: c.titulo,
    gancho: c.gancho,
    legenda: c.legenda,
    ...(c.duvida ? { duvida: c.duvida } : {}),
    duracaoSeg,
    video: { arquivo: video, tamanho: statSync(video).size },
    capa: { arquivo: capa, tamanho: statSync(capa).size },
  };
  writeFileSync(join(saida, "info.json"), JSON.stringify(info, null, 2));
  console.log(`\r  ✓ corte ${nome}: ${duracaoSeg} s, ${(info.video.tamanho / 1e6).toFixed(1)} MB`);
  await avisar(origem.pedidoId, `Corte ${escolhidos.indexOf(c) + 1} de ${total} pronto: "${c.titulo}".`.slice(0, 300));
}

rmSync(temporaria, { recursive: true, force: true });
console.log(previa ? "\nConfira as prévias. Depois: npm run cortar" : `\nPronto. Para mandar: npm run enviar -- ${relative(RAIZ, pasta)}`);
