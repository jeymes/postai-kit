// Checagem rápida no começo da rotina da fábrica, ANTES de baixar e transcrever
// o vídeo grande (a parte que mais gasta tempo e o Claude do dono). Confere, em
// uns 30 a 60 segundos:
//   1. nenhum arquivo da fábrica virou pasta (o erro de 15/11/2026 no kit);
//   2. a transcrição está instalada (o faster-whisper abre);
//   3. o corte monta e renderiza um quadro;
//   4. o passe do Postaí funciona.
// Se algo falhar, os vídeos esperando corte ficam com o motivo na tela Cortes
// (com "Tentar de novo") e a rotina para sem cortar nada.
//
// Uso (a rotina, depois do npm run instalar): npm run checar
//      --so-kit: só a estrutura e o corte (o npm run kit:publicar usa, sem a nuvem)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PYTHON } from "./comum.ts";
import { ferramenta } from "./postai.ts";

const problemas: string[] = [];
const soKit = process.argv.includes("--so-kit");

// 1. Estrutura: nenhuma pasta com nome de arquivo
const erradas: string[] = [];
const olhar = (pasta: string) => {
  for (const item of readdirSync(pasta)) {
    if (["node_modules", ".git", ".cortes", "entrada", "trabalho", "saida"].includes(item)) continue;
    const caminho = join(pasta, item);
    if (!statSync(caminho).isDirectory()) continue;
    if (/\.(tsx?|mts|mjs|js|py|json|md|mp3|mp4|png|jpe?g|ttf|woff2?)$/i.test(item)) erradas.push(caminho);
    olhar(caminho);
  }
};
for (const pasta of ["src", "ferramentas", "public", ".claude"]) if (existsSync(pasta)) olhar(pasta);
if (erradas.length) problemas.push(`arquivos que viraram pasta: ${erradas.join(", ")}`);
for (const arquivo of ["ferramentas/buscar.mts", "ferramentas/transcrever.mts", "ferramentas/transcrever.py", "ferramentas/cortar.mts", "ferramentas/enviar.mts"]) {
  if (!existsSync(arquivo)) problemas.push(`falta ${arquivo}`);
}

// 2. A transcrição abre
if (soKit) {
  // sem a nuvem: a transcrição só existe depois do npm run instalar
} else if (!existsSync(PYTHON)) {
  problemas.push("a transcrição não foi instalada (npm run instalar)");
} else {
  const r = spawnSync(PYTHON, ["-c", "import faster_whisper"], { encoding: "utf8", timeout: 60_000 });
  if (r.status !== 0) problemas.push(`a transcrição não abre (${(r.stderr || r.stdout || "").trim().split("\n").pop()?.slice(0, 200)})`);
}

/** Uma imagem PNG de uma cor só (o ffmpeg do Remotion não gera vídeo do nada, mas converte imagem) */
function pngDeUmaCor(largura: number, altura: number): Buffer {
  const linha = Buffer.alloc(1 + largura * 3);
  for (let x = 0; x < largura; x++) linha.set([40, 60, 90], 1 + x * 3);
  const tabela = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let r = 0xffffffff;
    for (const x of b) r = tabela[(r ^ x) & 255] ^ (r >>> 8);
    return (r ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo: string, dados: Buffer) => {
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length);
    const corpo = Buffer.concat([Buffer.from(tipo), dados]);
    const soma = Buffer.alloc(4);
    soma.writeUInt32BE(crc(corpo));
    return Buffer.concat([tamanho, corpo, soma]);
  };
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8;
  cabecalho[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloco("IHDR", cabecalho),
    bloco("IDAT", deflateSync(Buffer.concat(Array.from({ length: altura }, () => linha)))),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

// 3. O corte monta e renderiza um quadro, com um vídeo de teste de 2 s feito agora
// (os vídeos de exemplo da fábrica não vêm no repositório)
if (!erradas.length) {
  const pasta = mkdtempSync(join(tmpdir(), "postai-checar-"));
  const quadro = join(pasta, "quadro.png");
  const imagem = join(pasta, "teste.png");
  // A pasta public/ vazia não vai para o repositório: na nuvem ela pode não existir
  mkdirSync("public", { recursive: true });
  const video = join("public", ".checar-teste.mp4");
  writeFileSync(imagem, pngDeUmaCor(320, 180));
  const fazer = spawnSync(
    "npx",
    ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", imagem, "-t", "2", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", video],
    { encoding: "utf8", shell: process.platform === "win32", timeout: 60_000 },
  );
  if (fazer.status !== 0) problemas.push(`o ffmpeg não fez o vídeo de teste (${(fazer.stderr || "").trim().slice(0, 200)})`);
  const r = spawnSync(
    "npx",
    ["remotion", "still", "Corte", quadro, "--frame=10", "--scale=0.2", "--log=error", `--props=${JSON.stringify({ video: ".checar-teste.mp4", fundo: ".checar-teste.mp4" })}`],
    { encoding: "utf8", shell: process.platform === "win32", timeout: 4 * 60 * 1000 },
  );
  rmSync(video, { force: true });
  if (r.status !== 0 || !existsSync(quadro)) {
    const linhas = `${r.stderr ?? ""}${r.stdout ?? ""}`
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/warning|trace-warn|^at /i.test(l));
    const causa = linhas.filter((l) => /not found|can't resolve|cannot|doesn't exist|error/i.test(l));
    problemas.push(`o corte não renderiza (${(causa.length ? causa : linhas).slice(0, 2).join(" | ").slice(0, 300) || "sem mensagem"})`);
  }
  rmSync(pasta, { recursive: true, force: true });
}

// 4. O passe do Postaí funciona (e traz os vídeos esperando, para avisar neles)
type Pedido = { pedidoId: string; status: string };
let pedidos: Pedido[] = [];
if (!soKit) {
  try {
    pedidos = (await ferramenta<{ pedidos: Pedido[] }>("ver_pedidos_de_corte")).pedidos ?? [];
  } catch (erro) {
    problemas.push(`o Postaí não respondeu ao passe (${erro instanceof Error ? erro.message : String(erro)})`);
  }
}

if (problemas.length) {
  console.error(`\nCHECAGEM FALHOU: ${problemas.join("; ")}\nPare aqui: não baixe nem corte nada.`);
  // Cada vídeo esperando mostra o motivo na tela Cortes (lá tem "Tentar de novo")
  for (const pedido of pedidos) {
    try {
      await ferramenta("mudar_pedido_de_corte", {
        pedidoId: pedido.pedidoId,
        status: "erro",
        mensagem: `A fábrica não passou na checagem antes de começar, e nada foi cortado (nem gasto do seu Claude): ${problemas.join("; ")}`.slice(0, 300),
      });
    } catch {
      // o aviso é só um extra
    }
  }
  try {
    await ferramenta("anotar_limite_do_kit", { assunto: "outro", texto: `Checagem da fábrica falhou: ${problemas.join("; ")}`.slice(0, 300) });
  } catch {
    // idem
  }
  process.exit(1);
}
console.log(
  soKit
    ? "CHECAGEM OK (só o kit): fábrica inteira e o corte renderiza."
    : "CHECAGEM OK: fábrica inteira, a transcrição abre, o corte renderiza e o Postaí respondeu.",
);
