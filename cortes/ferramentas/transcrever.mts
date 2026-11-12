// Transcreve os vídeos novos de entrada/ e cria trabalho/<id>/ com:
//   origem.json        de onde veio o vídeo e o tamanho dele
//   transcricao.json   cada frase e cada palavra com o tempo (para as legendas)
//   transcricao.txt    o texto com os tempos, para o Claude escolher os cortes
//
// Os vídeos chegam pelo npm run buscar (links do menu Cortes) ou são postos à
// mão em entrada/, soltos ou em subpastas.
//
// Uso: npm run transcrever                         todos os vídeos novos
//      npm run transcrever -- entrada/x.mp4   só esse
//      opções: --modelo small|medium|large-v3   --idioma pt|en|auto
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { avisar } from "./postai.ts";
import {
  ENTRADA, PYTHON, RAIZ, TRABALHO, ffmpeg, infoDoVideo, lerJson, rodar, tempo, videosDaEntrada,
  type Origem, type Transcricao,
} from "./comum.ts";

const args = process.argv.slice(2);
const opcao = (nome: string, padrao: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};
const modelo = opcao("modelo", "small");
const idioma = opcao("idioma", "pt");
const valores = new Set([opcao("modelo", ""), opcao("idioma", "")]);
const pedidos = args.filter((a) => !a.startsWith("--") && !valores.has(a));

if (!existsSync(PYTHON)) {
  console.error("Falta instalar a transcrição: npm run instalar");
  process.exit(1);
}

function idDo(arquivo: string) {
  // Vídeo do menu Cortes: o id do pedido (mantém maiúsculas, que o Postaí usa).
  const nome = basename(arquivo, extname(arquivo));
  if (/^[A-Za-z0-9]{15,40}$/.test(nome)) return nome;
  const base = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  return base || "video";
}

const videos = pedidos.length ? pedidos.map((p) => resolve(p)) : videosDaEntrada();
if (!videos.length) {
  console.log("Nenhum vídeo em entrada/. Rode npm run buscar (links do menu Cortes) ou ponha os vídeos lá.");
  process.exit(0);
}

let feitos = 0;
for (const arquivo of videos) {
  const relativo = relative(ENTRADA, arquivo);
  const id = idDo(arquivo);
  const destino = join(TRABALHO, id);
  if (existsSync(join(destino, "transcricao.json"))) {
    if (!pedidos.length) continue; // já feito
    const origem = lerJson<Origem>(join(destino, "origem.json"));
    if (resolve(origem.arquivo) !== arquivo) {
      console.error(`✗ ${relativo}: já existe trabalho/${id} de outro vídeo. Renomeie o arquivo.`);
      continue;
    }
  }
  mkdirSync(destino, { recursive: true });
  console.log(`\n▶ ${relativo}`);
  const info = infoDoVideo(arquivo);
  console.log(`  ${info.largura}x${info.altura}, ${tempo(info.duracaoSeg)}`);
  const lateral = arquivo.slice(0, -extname(arquivo).length) + ".pedido.json";
  const pedidoId = existsSync(lateral) ? lerJson<{ pedidoId: string }>(lateral).pedidoId : undefined;
  await avisar(pedidoId, `Transcrevendo a fala (vídeo de ${Math.round(info.duracaoSeg / 60)} min; leva um tempo).`);

  const audio = join(destino, "audio.wav");
  ffmpeg(["-i", arquivo, "-vn", "-ac", "1", "-ar", "16000", audio]);
  const saida = join(destino, "transcricao.json");
  rodar(PYTHON, [join(RAIZ, "ferramentas", "transcrever.py"), audio, saida, modelo, idioma], { mostrar: true });
  rmSync(audio, { force: true });

  const t = lerJson<Transcricao>(saida);
  const linhas = t.segmentos.map((s) => `[${tempo(s.i)} → ${tempo(s.f)}] ${s.texto}`);
  writeFileSync(
    join(destino, "transcricao.txt"),
    `Vídeo: ${basename(arquivo)} | ${tempo(info.duracaoSeg)} | ${info.largura}x${info.altura}\n` +
      `Tempos em minutos:segundos. Nos cortes.json, use segundos (ex.: 01:02.5 = 62.5).\n\n` +
      linhas.join("\n") + "\n",
  );
  const origem: Origem = { id, arquivo, ...info, transcritoEm: new Date().toISOString(), pedidoId };
  writeFileSync(join(destino, "origem.json"), JSON.stringify(origem, null, 2));
  console.log(`  ✓ trabalho/${id}/transcricao.txt (${t.segmentos.length} frases)`);
  await avisar(pedidoId, "Fala transcrita. Escolhendo os melhores trechos.");
  feitos++;
}
console.log(feitos ? `\n${feitos} vídeo(s) transcrito(s). Próximo passo: escolher os cortes (cortes.json).` : "\nNada novo para transcrever.");
