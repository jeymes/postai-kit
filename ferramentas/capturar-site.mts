// Tira o print da página inteira de um site (do próprio cliente) para os
// moldes Tutorial e Carrossel, com o navegador que o Remotion já baixa.
// Sem instalar nada a mais.
//
// Uso:
//   npm run capturar-site -- https://minhaloja.com.br inicio
//   npm run capturar-site -- https://minhaloja.com.br/produto/pao produto --computador
// Saída: public/sites/<nome>.png e, no terminal, a "proporcao" para o molde Tutorial.
// Só sites do dono da marca (ou com permissão dele).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const computador = args.includes("--computador");
const [endereco, nome] = args.filter((a) => !a.startsWith("--"));
if (!endereco || !nome || !/^https?:\/\//.test(endereco) || !/^[\w-]+$/.test(nome)) {
  console.error("Uso: npm run capturar-site -- https://site.com.br nome-do-print [--computador]");
  process.exit(1);
}

// Navegador do Remotion (baixa na primeira vez)
function navegador() {
  const raiz = join("node_modules", ".remotion", "chrome-headless-shell");
  const procurar = () => {
    if (!existsSync(raiz)) return null;
    for (const plataforma of readdirSync(raiz)) {
      const pasta = join(raiz, plataforma);
      if (!statSync(pasta).isDirectory()) continue;
      for (const sub of readdirSync(pasta)) {
        for (const exe of ["chrome-headless-shell", "chrome-headless-shell.exe"]) {
          const caminho = join(pasta, sub, exe);
          if (existsSync(caminho)) return caminho;
        }
      }
    }
    return null;
  };
  if (!procurar()) spawnSync("npx", ["remotion", "browser", "ensure"], { stdio: "inherit", shell: process.platform === "win32" });
  const achado = procurar();
  if (!achado) throw new Error("Não achei o navegador do Remotion. Rode: npx remotion browser ensure");
  return achado;
}

const largura = computador ? 1280 : 390;
const escala = computador ? 1 : 2;
const porta = 9300 + Math.floor(Math.random() * 500);
const perfil = join(tmpdir(), `postai-captura-${porta}`);
const chrome = spawn(navegador(), [
  `--remote-debugging-port=${porta}`,
  `--user-data-dir=${perfil}`,
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
]);
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

try {
  let alvo: { webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 50 && !alvo; i++) {
    await espera(200);
    try {
      const lista = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
      alvo = lista.find((item) => item.type === "page");
    } catch {
      // ainda abrindo
    }
  }
  if (!alvo) throw new Error("O navegador não abriu.");

  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pendentes = new Map<number, (r: Record<string, unknown>) => void>();
  ws.addEventListener("message", (evento) => {
    const msg = JSON.parse(String(evento.data));
    if (msg.id && pendentes.has(msg.id)) {
      pendentes.get(msg.id)!(msg.result ?? {});
      pendentes.delete(msg.id);
    }
  });
  const enviar = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((r) => {
      id += 1;
      pendentes.set(id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const tela = (altura: number) =>
    enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: escala, mobile: !computador });
  await enviar("Page.enable");
  await tela(844);
  await enviar("Page.navigate", { url: endereco });
  await espera(5000);
  // Rola até o fim e volta, para carregar as imagens que só aparecem ao rolar
  await enviar("Runtime.evaluate", {
    expression: "(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,150))}scrollTo(0,0)})()",
    awaitPromise: true,
  });
  await espera(1500);
  const { result } = (await enviar("Runtime.evaluate", {
    expression: "document.documentElement.scrollHeight",
    returnByValue: true,
  })) as { result: { value: number } };
  const altura = Math.min(result.value, 9000);
  await tela(altura);
  await espera(800);
  const foto = (await enviar("Page.captureScreenshot", { format: "png" })) as { data: string };
  mkdirSync(join("public", "sites"), { recursive: true });
  const saida = join("public", "sites", `${nome}.png`);
  writeFileSync(saida, Buffer.from(foto.data, "base64"));
  ws.close();
  const proporcao = Math.round((altura / largura) * 100) / 100;
  console.log(`✓ ${saida}`);
  console.log(`  "print": "sites/${nome}.png", "proporcao": ${proporcao}${result.value > 9000 ? "  (página cortada em 9000 px)" : ""}`);
} finally {
  chrome.kill();
  await espera(300);
  rmSync(perfil, { recursive: true, force: true });
}
