// Pega no Postaí (menu Cortes) os vídeos que você pediu para cortar e baixa
// cada um para entrada/<pedidoId>.mp4.
// Depois: npm run transcrever.
//
// Baixa só links de arquivo (Google Drive, Dropbox, download direto). Link de
// rede social é recusado: o Postaí não baixa vídeos das redes.
//
// Uso: npm run buscar
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ENTRADA, RAIZ, infoDoVideo } from "./comum.ts";
import { linkDeDownload } from "./links.ts";
import { avisar, ferramenta } from "./postai.ts";

type Pedido = {
  pedidoId: string;
  status: "novo" | "processando";
  // Vídeo enviado direto no app: link temporário do Postaí (vale 12 horas)
  url?: string;
  nome?: string;
  // Pedido antigo, por link do Drive/Dropbox
  link?: string;
};

// O vídeo que a pessoa enviou no app: arquivo grande, então vai pelo curl
// (segue o proxy da nuvem e retoma em caso de queda).
function baixarDoPostai(url: string, destino: string) {
  const parcial = `${destino}.baixando`;
  const r = spawnSync("curl", ["-fSL", "--retry", "3", "-C", "-", "-o", parcial, url], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("o download do vídeo falhou. Se passou de 12 horas, rode de novo para pegar um link novo.");
  const info = infoDoVideo(parcial);
  if (!info?.duracaoSeg || !info.largura) {
    rmSync(parcial, { force: true });
    throw new Error("o arquivo baixado não é um vídeo.");
  }
  renameSync(parcial, destino);
  return info;
}

async function baixar(link: string, destino: string) {
  const resposta = await fetch(linkDeDownload(link), { redirect: "follow" });
  if (!resposta.ok || !resposta.body) throw new Error(`o link respondeu ${resposta.status}. Confira se ele ainda vale.`);
  const tipo = resposta.headers.get("content-type") ?? "";
  if (tipo.includes("text/html")) {
    throw new Error('o link abre uma página, não o arquivo. No Google Drive, compartilhe como "qualquer pessoa com o link".');
  }
  const parcial = `${destino}.baixando`;
  const total = Number(resposta.headers.get("content-length") ?? 0);
  let recebido = 0;
  let ultimo = -1;
  const corpo = Readable.fromWeb(resposta.body as import("node:stream/web").ReadableStream);
  corpo.on("data", (pedaco: Buffer) => {
    recebido += pedaco.length;
    const mb = Math.floor(recebido / 1e7) * 10;
    if (mb !== ultimo) {
      process.stdout.write(`\r  ${mb} MB${total ? ` de ${Math.round(total / 1e6)} MB` : ""}`);
      ultimo = mb;
    }
  });
  await pipeline(corpo, createWriteStream(parcial));
  process.stdout.write("\n");
  let info: { duracaoSeg: number; largura: number; altura: number } | null = null;
  try {
    info = infoDoVideo(parcial);
  } catch {
    info = null;
  }
  if (!info?.duracaoSeg || !info.largura) {
    rmSync(parcial, { force: true });
    throw new Error("o arquivo baixado não é um vídeo.");
  }
  renameSync(parcial, destino);
  return info;
}

const { pedidos } = await ferramenta<{ pedidos: Pedido[] }>("ver_pedidos_de_corte");
if (!pedidos.length) {
  console.log("Nenhum vídeo pedido no menu Cortes do Postaí.");
  process.exit(0);
}

let baixados = 0;
for (const pedido of pedidos) {
  const dir = ENTRADA;
  mkdirSync(dir, { recursive: true });
  const destino = join(dir, `${pedido.pedidoId}.mp4`);
  writeFileSync(join(dir, `${pedido.pedidoId}.pedido.json`), JSON.stringify(pedido, null, 2));
  if (existsSync(destino)) {
    console.log(`= já baixado: ${destino.slice(RAIZ.length + 1)}`);
    continue;
  }
  console.log(`▶ ${pedido.nome ?? pedido.link}`);
  await avisar(pedido.pedidoId, "Baixando o vídeo.");
  try {
    const info = pedido.url ? baixarDoPostai(pedido.url, destino) : await baixar(pedido.link ?? "", destino);
    console.log(`  ✓ ${Math.round(info.duracaoSeg / 60)} min, ${info.largura}x${info.altura}`);
    baixados++;
    // O vídeo já está aqui: se o aviso falhar, segue assim mesmo (não é erro do vídeo).
    await avisar(pedido.pedidoId, `Vídeo baixado (${Math.round(info.duracaoSeg / 60)} min).`);
  } catch (erro) {
    const mensagem = `Não deu para baixar: ${(erro as Error).message}`;
    console.error(`  ✗ ${mensagem}`);
    await ferramenta("mudar_pedido_de_corte", { pedidoId: pedido.pedidoId, status: "erro", mensagem }).catch(() => {});
  }
}
console.log(`\n${baixados} vídeo(s) baixado(s). Próximo passo: npm run transcrever`);
