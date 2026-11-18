// O ponto do vídeo: guarda no Postaí o que já ficou pronto (o roteiro, as
// imagens e a voz) e traz de volta numa execução nova, para continuar de onde
// parou sem gastar o Claude de novo no que já foi feito. O dono vê na Visão
// geral do Postaí e clica em "Continuar de onde parou".
//
// Uso: npm run ponto -- guardar conteudo/<arquivo>.json <roteiro | antes-do-render>
//      npm run ponto -- retomar

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { exigirChave, ferramenta } from "./postai.ts";

const ETAPAS = ["roteiro", "antes-do-render"];
const [acao, ...resto] = process.argv.slice(2);
const pacote = join(tmpdir(), "postai-ponto.tar.gz");

function tar(args: string[]) {
  const r = spawnSync("tar", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`tar falhou: ${(r.stderr || r.stdout || "").slice(0, 300)}`);
}

/** As pastas de fotos que o roteiro usa (ex.: "fotos/elias/eliseu.jpg" → public/fotos/elias). */
function pastasDasFotos(valor: unknown, pastas = new Set<string>()) {
  if (typeof valor === "string" && /^fotos\/.+\.(jpe?g|png|webp)$/i.test(valor)) pastas.add(join("public", dirname(valor)));
  else if (Array.isArray(valor)) valor.forEach((item) => pastasDasFotos(item, pastas));
  else if (valor && typeof valor === "object") Object.values(valor).forEach((item) => pastasDasFotos(item, pastas));
  return pastas;
}

async function guardar(caminho: string | undefined, etapa: string | undefined) {
  if (!caminho?.endsWith(".json") || !existsSync(caminho) || !etapa || !ETAPAS.includes(etapa)) {
    console.error(`Uso: npm run ponto -- guardar conteudo/<arquivo>.json <${ETAPAS.join(" | ")}>`);
    process.exit(1);
  }
  const roteiro = JSON.parse(readFileSync(caminho, "utf8")) as { post?: { titulo?: string }; titulo?: string };
  const nome = basename(caminho, ".json");
  const itens = [caminho, ...pastasDasFotos(roteiro), join("public", "narracao", nome)].filter((item) => existsSync(item));
  tar(["-czf", pacote, ...itens]);
  const tamanho = statSync(pacote).size;
  const resposta = JSON.parse(
    await ferramenta("guardar_ponto", { arquivo: basename(caminho), etapa, titulo: roteiro.post?.titulo ?? roteiro.titulo ?? nome, tamanho }),
  ) as { url: string; tipo: string };
  // O endereço de envio vale 1 hora e nunca é mostrado
  const envio = await fetch(resposta.url, { method: "PUT", headers: { "Content-Type": resposta.tipo }, body: readFileSync(pacote) });
  rmSync(pacote, { force: true });
  if (!envio.ok) throw new Error(`O envio do ponto falhou (${envio.status}). Rode de novo.`);
  console.log(await ferramenta("guardar_ponto", { pronto: true }));
  console.log(`(${itens.length} itens, ${(tamanho / 1024 / 1024).toFixed(1)} MB)`);
}

async function retomar() {
  const ponto = JSON.parse(await ferramenta("retomar_ponto", {})) as {
    url: string;
    arquivo: string;
    etapa: string;
    titulo: string;
    guardado: string;
  };
  const resposta = await fetch(ponto.url);
  if (!resposta.ok) throw new Error(`Não deu para baixar o ponto (${resposta.status}). Rode de novo.`);
  writeFileSync(pacote, Buffer.from(await resposta.arrayBuffer()));
  tar(["-xzf", pacote]);
  rmSync(pacote, { force: true });
  console.log(`Retomado "${ponto.titulo}": ${ponto.guardado}, em conteudo/${ponto.arquivo} (etapa ${ponto.etapa}).`);
  console.log(
    ponto.etapa === "roteiro"
      ? "Continue do que vem depois do roteiro aprovado (imagens, voz, render, crítica e envio)."
      : "Continue da prévia e do render (depois a crítica e o envio). Rode o conferir com --com-voz antes.",
  );
}

exigirChave();
try {
  if (acao === "guardar") await guardar(resto[0], resto[1]);
  else if (acao === "retomar") await retomar();
  else {
    console.error(`Uso: npm run ponto -- guardar conteudo/<arquivo>.json <${ETAPAS.join(" | ")}>\n     npm run ponto -- retomar`);
    process.exit(1);
  }
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : String(erro));
  process.exit(1);
}
