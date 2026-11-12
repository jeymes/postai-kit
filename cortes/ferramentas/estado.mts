// Mostra onde está cada vídeo: transcrito, cortes escolhidos, prontos, mandados.
// Com --fila, mostra também a fila do piloto e os pedidos do menu Cortes.
//
// Uso: npm run estado [-- --fila]
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { ENTRADA, TRABALHO, lerJson, videosDaEntrada, type Origem, type PedidoDeCortes } from "./comum.ts";

const trabalhos = existsSync(TRABALHO) ? readdirSync(TRABALHO).filter((n) => existsSync(join(TRABALHO, n, "origem.json"))) : [];
const transcritos = new Set(trabalhos.map((n) => resolve(lerJson<Origem>(join(TRABALHO, n, "origem.json")).arquivo)));

const novos = videosDaEntrada().filter((a) => !transcritos.has(resolve(a)));
if (novos.length) console.log(`Para transcrever (${novos.length}):\n${novos.map((a) => `  ${a.slice(ENTRADA.length + 1)}`).join("\n")}\n`);

for (const n of trabalhos) {
  const pasta = join(TRABALHO, n);
  const pedido = existsSync(join(pasta, "cortes.json")) ? lerJson<PedidoDeCortes>(join(pasta, "cortes.json")) : null;
  const prontos = existsSync(join(pasta, "cortes"))
    ? readdirSync(join(pasta, "cortes")).filter((c) => existsSync(join(pasta, "cortes", c, "info.json"))).length
    : 0;
  const enviados = existsSync(join(pasta, "enviados.json")) ? Object.keys(lerJson(join(pasta, "enviados.json"))).length : 0;
  const etapa = !pedido
    ? "falta escolher os cortes"
    : prontos < pedido.cortes.length
      ? `${prontos}/${pedido.cortes.length} cortes prontos`
      : enviados < prontos
        ? `${enviados}/${prontos} mandados`
        : "tudo mandado";
  console.log(`trabalho/${n}: ${etapa}`);
}
if (!trabalhos.length && !novos.length) console.log("Nada por aqui ainda.");

if (process.argv.includes("--fila")) {
  const { ferramenta } = await import("./postai.ts");
  const { pedidos } = await ferramenta<{ pedidos: Array<{ status: string; link: string }> }>("ver_pedidos_de_corte");
  console.log(`\nPedidos no menu Cortes esperando: ${pedidos.length}`);
  for (const p of pedidos) console.log(`  ${p.status}  ${p.link}`);
  // Conta sem piloto configurado: o Postaí responde só { piloto: "não configurado..." }.
  const fila = await ferramenta<{ piloto?: string; ligado?: boolean; horarios?: string[]; fila?: Array<{ titulo: string; saiEm: string }> }>("ver_fila");
  if (!fila.fila) {
    console.log(`\nPiloto ${fila.piloto ?? "não configurado"}. Os cortes aprovados esperam na fila até ele ser ligado.`);
  } else {
    console.log(`\nPiloto ${fila.ligado ? "ligado" : "DESLIGADO"}, horários ${(fila.horarios ?? []).join(", ")}, ${fila.fila.length} na fila:`);
    for (const item of fila.fila) console.log(`  ${item.saiEm}  ${item.titulo}`);
    const ultimo = fila.fila.at(-1);
    if (ultimo) console.log(`A fila acaba em ${ultimo.saiEm}.`);
  }
}
