// Busca vídeos de fundo livres no Pixabay (uso comercial sem crédito
// obrigatório) para o Canal dark: paisagem, céu, deserto, mar, fogo, multidão.
// A busca passa pelo Postaí, que tem a chave (precisa do passe da rotina ou da
// POSTAI_CHAVE). Só vídeos deitados, em até Full HD.
//
// Uso, como o buscar-fotos:
//   npm run buscar-videos -- --pasta videos/<peça> --candidatos deserto="desert dunes" ceu="night sky stars"
//       → a capa de 4 opções de cada em public/videos/<peça>/_candidatos/ (deserto-1.jpg ...) para olhar
//   npm run buscar-videos -- --pasta videos/<peça> deserto="desert dunes"#2
//       → grava public/videos/<peça>/deserto.mp4 e anota em CREDITOS.md
// Na cena do Documentario: "video": "videos/<peça>/deserto.mp4" (no lugar da foto).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ferramenta } from "./postai.ts";

type Video = { id: string; pagina: string; largura: number; altura: number; previa: string; url: string; duracao?: number; tags: string };

const args = process.argv.slice(2);
const iPasta = args.indexOf("--pasta");
const pasta = iPasta >= 0 ? args.splice(iPasta, 2)[1] : "videos";
const iCand = args.indexOf("--candidatos");
const candidatos = iCand >= 0;
if (candidatos) args.splice(iCand, 1);
if (args.length === 0) {
  console.error('Uso: npm run buscar-videos -- --pasta videos/<peça> [--candidatos] nome="termo em inglês"[#n] ...');
  process.exit(1);
}
if (!process.env.POSTAI_CHAVE) {
  console.error("Falta o passe do Postaí: a busca de vídeos passa pelo Postaí, que tem a chave do Pixabay.");
  process.exit(1);
}
const itens = args.map((a) => {
  const m = a.match(/^([\w-]+)=(.+?)(?:#(\d+))?$/);
  if (!m) throw new Error(`Item inválido: ${a} (use nome="termo"#n)`);
  return { arquivo: m[1], termo: m[2], escolha: Number(m[3] ?? 1) };
});

const destino = join("public", pasta);
const pastaCandidatos = join(destino, "_candidatos");
mkdirSync(candidatos ? pastaCandidatos : destino, { recursive: true });

async function buscar(termo: string): Promise<Video[]> {
  const texto = await ferramenta("buscar_no_pixabay", { q: termo, tipo: "video", porPagina: 20 });
  let resultados: Video[];
  try {
    resultados = (JSON.parse(texto) as { resultados: Video[] }).resultados;
  } catch {
    throw new Error(texto.slice(0, 160));
  }
  // Deitados, de pelo menos 1280 px e com 6 s ou mais (cena curta repete o vídeo)
  // Nada feito por IA (o Pixabay marca nas tags)
  const feitoPorIA = /\b(ai[- ]?generated|generative|midjourney|stable diffusion|dall[- ]?e|ai art)\b/i;
  return resultados.filter((v) => v.largura > v.altura && v.largura >= 1280 && (v.duracao ?? 0) >= 6 && !feitoPorIA.test(v.tags));
}

async function baixar(url: string, saida: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Não baixou ${url} (${resp.status})`);
  writeFileSync(saida, Buffer.from(await resp.arrayBuffer()));
}

const creditos: string[] = [];
for (const item of itens) {
  try {
    const guardadas = join(pastaCandidatos, `${item.arquivo}.json`);
    let videos: Video[] | null = null;
    if (!candidatos && existsSync(guardadas)) {
      const salvo = JSON.parse(readFileSync(guardadas, "utf8")) as { termo: string; videos: Video[] };
      if (salvo.termo === item.termo) videos = salvo.videos;
    }
    videos ??= await buscar(item.termo);
    if (videos.length === 0) {
      console.error(`✗ ${item.arquivo}: nenhum vídeo deitado para "${item.termo}" (tente outro termo em inglês)`);
      process.exitCode = 1;
      continue;
    }
    if (candidatos) {
      const opcoes: Video[] = [];
      for (const video of videos.slice(0, 4)) {
        if (!video.previa) continue;
        const bruto = join(pastaCandidatos, `${item.arquivo}-${opcoes.length + 1}.bruto.jpg`);
        try {
          await baixar(video.previa, bruto);
          const r = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", bruto, "-vf", "scale='min(480,iw)':-2", "-q:v", "3", bruto.replace(".bruto", "")], {
            stdio: "inherit",
            shell: process.platform === "win32",
          });
          if (r.status !== 0) throw new Error("não converteu a capa");
          opcoes.push(video);
        } catch (erro) {
          console.log(`  (pulei uma opção de ${item.arquivo}: ${erro instanceof Error ? erro.message : String(erro)})`);
        } finally {
          rmSync(bruto, { force: true });
        }
      }
      if (opcoes.length === 0) throw new Error(`nenhuma capa baixou para "${item.termo}"`);
      writeFileSync(guardadas, JSON.stringify({ termo: item.termo, videos: opcoes }, null, 2));
      const nomes = opcoes.map((v, i) => `${i + 1}: ${v.tags.slice(0, 60)} (${v.largura}×${v.altura}, ${v.duracao ?? "?"} s)`);
      console.log(`• ${item.arquivo}: ${opcoes.length} opções em ${pastaCandidatos}/${item.arquivo}-N.jpg (a capa de cada vídeo)\n    ${nomes.join("\n    ")}`);
    } else {
      const video = videos[item.escolha - 1];
      if (!video) throw new Error(`só há ${videos.length} opções para "${item.termo}"`);
      await baixar(video.url, join(destino, `${item.arquivo}.mp4`));
      creditos.push(`| ${item.arquivo}.mp4 | pixabay | ${video.pagina} | ${video.id} |`);
      console.log(`✓ ${destino}/${item.arquivo}.mp4 (${video.largura}×${video.altura}, ${video.duracao ?? "?"} s, ${video.pagina})`);
    }
  } catch (erro) {
    console.error(`✗ ${item.arquivo}: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exitCode = 1;
  }
}

if (creditos.length > 0) {
  const caminho = join(destino, "CREDITOS.md");
  const antigas = existsSync(caminho)
    ? readFileSync(caminho, "utf8")
        .split("\n")
        .filter((l) => /^\| \S+\.mp4 \|/.test(l) && !creditos.some((c) => l.startsWith(c.split(" | ")[0])))
    : [];
  writeFileSync(
    caminho,
    [
      `# Vídeos livres (${pasta})`,
      "",
      "Licença do Pixabay (uso comercial sem crédito obrigatório), baixados com o ferramentas/buscar-videos.mts.",
      "",
      "| Arquivo | Fonte | Original | Id |",
      "| --- | --- | --- | --- |",
      ...antigas,
      ...creditos,
      "",
    ].join("\n"),
  );
  if (existsSync(pastaCandidatos)) rmSync(pastaCandidatos, { recursive: true });
}
