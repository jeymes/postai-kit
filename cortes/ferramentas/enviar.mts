// Manda os cortes prontos de trabalho/<id>/cortes/ para o menu Cortes do
// Postaí, pelo conector: cada corte fica lá esperando você aprovar, e o
// aprovado entra na fila do piloto. Vale para os vídeos pedidos por link e
// para os postos à mão em entrada/.
// Guarda em enviados.json o que já foi, para não mandar duas vezes.
//
// Uso: npm run enviar -- trabalho/<id>
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { RAIZ, lerJson, pastaDoTrabalho, type Origem } from "./comum.ts";
import { avisar, ferramenta } from "./postai.ts";

const pasta = pastaDoTrabalho(process.argv.slice(2).find((a) => !a.startsWith("--")));
const origem = lerJson<Origem>(join(pasta, "origem.json"));

type Info = {
  corte: number;
  trecho: string;
  gancho?: string;
  titulo: string;
  legenda: string;
  duvida?: string;
  duracaoSeg: number;
  video: { arquivo: string; tamanho: number };
  capa: { arquivo: string; tamanho: number };
};

const pastaDosCortes = join(pasta, "cortes");
const infos = existsSync(pastaDosCortes)
  ? readdirSync(pastaDosCortes)
      .sort()
      .map((n) => join(pastaDosCortes, n, "info.json"))
      .filter(existsSync)
      .map((a) => lerJson<Info>(a))
  : [];
if (!infos.length) {
  console.error(`Nenhum corte pronto em ${relative(RAIZ, pastaDosCortes)}. Rode antes: npm run cortar -- ${relative(RAIZ, pasta)}`);
  process.exit(1);
}

const arquivoDosEnviados = join(pasta, "enviados.json");
const enviados: Record<string, { itemId: string; em: string }> = existsSync(arquivoDosEnviados) ? lerJson(arquivoDosEnviados) : {};
const faltam = infos.filter((i) => !enviados[String(i.corte)]);
if (!faltam.length) {
  console.log("Todos os cortes deste vídeo já foram mandados.");
  process.exit(0);
}

console.log("Os cortes vão para o menu Cortes do Postaí, esperando a sua aprovação.");
await avisar(origem.pedidoId, `Mandando ${faltam.length} ${faltam.length === 1 ? "corte" : "cortes"} para você aprovar.`);

function urlDo(comando: string) {
  const url = /'(https:\/\/[^']+)'\s*$/.exec(comando)?.[1];
  if (!url) throw new Error("O Postaí devolveu um comando de envio diferente do esperado.");
  return url;
}

async function subir(url: string, arquivo: string, tipo: string) {
  const r = await fetch(url, { method: "PUT", headers: { "Content-Type": tipo }, body: readFileSync(arquivo) });
  if (!r.ok) throw new Error(`Falhou o envio de ${arquivo} (${r.status}).`);
}

for (const info of faltam) {
  process.stdout.write(`corte ${info.corte}: "${info.titulo}"... `);
  const envio = await ferramenta<{ envioId: string; arquivos: Array<{ arquivo: string; comando: string }> }>("pedir_envio", {
    formato: "video",
    video: { tamanho: info.video.tamanho, tipo: "video/mp4" },
    capa: { tamanho: info.capa.tamanho, tipo: "image/jpeg" },
  });
  for (const a of envio.arquivos) {
    if (a.arquivo === "vídeo") await subir(urlDo(a.comando), info.video.arquivo, "video/mp4");
    else if (a.arquivo === "capa") await subir(urlDo(a.comando), info.capa.arquivo, "image/jpeg");
  }
  const resposta = await ferramenta<string>("por_para_aprovacao", {
    envioId: envio.envioId,
    ...(origem.pedidoId ? { pedidoId: origem.pedidoId } : {}),
    titulo: info.titulo,
    legenda: info.legenda,
    duracaoSeg: info.duracaoSeg,
    gancho: info.gancho ?? "",
    trecho: info.trecho,
    ...(info.duvida ? { duvida: info.duvida } : {}),
  });
  const itemId = /(?:itemId|corteId) (\w+)/.exec(String(resposta))?.[1] ?? "?";
  enviados[String(info.corte)] = { itemId, em: new Date().toISOString() };
  writeFileSync(arquivoDosEnviados, JSON.stringify(enviados, null, 2));
  console.log(`esperando aprovação (${itemId})`);
}

if (origem.pedidoId) {
  const total = Object.keys(enviados).length;
  await ferramenta("mudar_pedido_de_corte", {
    pedidoId: origem.pedidoId,
    status: "pronto",
    mensagem: `${total} ${total === 1 ? "corte" : "cortes"} para aprovar.`,
  });
}
console.log("\nPronto. Aprove os cortes no Postaí, no menu Cortes.");
