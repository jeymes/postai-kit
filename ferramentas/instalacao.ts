// O que os instaladores do kit (voz, avatar) têm em comum: achar o uv, rodar
// um comando parando no primeiro erro, baixar com progresso e descompactar.
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, renameSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const windows = process.platform === "win32";

export function rodar(comando: string, args: string[], cwd?: string) {
  const r = spawnSync(comando, args, { stdio: "inherit", cwd });
  if (r.status !== 0) {
    console.error(`\nFalhou: ${comando} ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
}

/** O uv instala o Python do kit sem mexer no do computador. Sem ele, explica e sai. */
export function exigirUv(comandoParaRepetir: string) {
  const exe = windows ? "uv.exe" : "uv";
  const candidatos = ["uv", join(homedir(), ".local", "bin", exe), join(homedir(), ".cargo", "bin", exe)];
  const uv = candidatos.find((c) => spawnSync(c, ["--version"]).status === 0);
  if (uv) return uv;
  console.error(
    [
      "Falta o uv (ele instala o Python do kit sem mexer no do computador). Instale e rode de novo:",
      "  Mac ou Linux: curl -LsSf https://astral.sh/uv/install.sh | sh",
      '  Windows (PowerShell): powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"',
      `Depois, feche e abra o terminal e rode: ${comandoParaRepetir}`,
    ].join("\n"),
  );
  process.exit(1);
}

// Atrás de um proxy (na nuvem, por exemplo) o fetch do Node quebra no meio de
// arquivos grandes; o curl segue o proxy e os certificados do sistema.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;

export async function baixar(url: string, destino: string, bytes?: number) {
  if (existsSync(destino) && (!bytes || statSync(destino).size === bytes)) return;
  if (proxy) {
    console.log(`  ${destino.split(/[\\/]/).pop()}: baixando pelo proxy`);
    rodar("curl", ["-fSL", "--retry", "3", "-o", `${destino}.parcial`, url]);
    renameSync(`${destino}.parcial`, destino);
    return;
  }
  const resposta = await fetch(url);
  if (!resposta.ok || !resposta.body) throw new Error(`Não consegui baixar ${url} (${resposta.status})`);
  const total = Number(resposta.headers.get("content-length")) || bytes || 0;
  let recebido = 0;
  let ultimo = -1;
  const corpo = Readable.fromWeb(resposta.body as import("node:stream/web").ReadableStream);
  corpo.on("data", (pedaco: Buffer) => {
    recebido += pedaco.length;
    const pct = total ? Math.floor((recebido / total) * 10) * 10 : -1;
    if (pct !== ultimo && pct >= 0) {
      ultimo = pct;
      process.stdout.write(`\r  ${destino.split(/[\\/]/).pop()}: ${pct}%`);
    }
  });
  await pipeline(corpo, createWriteStream(`${destino}.parcial`));
  renameSync(`${destino}.parcial`, destino);
  process.stdout.write("\n");
}

export function descompactar(zip: string, pasta: string) {
  if (windows)
    rodar("powershell", ["-NoProfile", "-Command", `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${pasta}'`]);
  else rodar("unzip", ["-q", zip, "-d", pasta]);
}
