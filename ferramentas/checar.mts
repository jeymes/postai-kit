// Checagem rápida no começo de cada rotina, ANTES de qualquer agente trabalhar
// (é o trabalho das agentes que gasta o Claude do dono). Confere, em uns 30 a
// 60 segundos, o que já quebrou um vídeo inteiro no fim:
//   1. nenhum arquivo do kit virou pasta (o erro de 15/11/2026);
//   2. o molde do vídeo monta e renderiza um quadro (o render quebrava só no fim);
//   3. o passe do Postaí funciona (sem ele nada é enviado).
// Se algo falhar, avisa na tela do Postaí e sai com erro: a coordenadora para
// na hora, sem chamar ninguém.
//
// Uso (a coordenadora, no passo 1): npm run checar -- conversa | documentario
//      --so-kit: só a estrutura e o render (o npm run kit:publicar usa, sem a nuvem)
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ferramenta } from "./postai.ts";

const MOLDES: Record<string, string> = { conversa: "Conversa", documentario: "Documentario", mundo3d: "Mundo3D", bonecos3d: "Mundo3D" };
// Um molde com outro jeito de desenhar: o quadro de teste usa o exemplo dele
const EXEMPLOS: Record<string, string> = { bonecos3d: "conteudo/exemplo-lugar-cidade.json" };
const pedido = (process.argv[2] ?? "").toLowerCase();
const molde = MOLDES[pedido];
if (!molde) {
  console.error("Uso: npm run checar -- conversa | documentario | mundo3d | bonecos3d");
  process.exit(1);
}

const problemas: string[] = [];
const soKit = process.argv.includes("--so-kit");

// 1. Estrutura: nenhuma pasta com nome de arquivo
const erradas: string[] = [];
const olhar = (pasta: string) => {
  for (const item of readdirSync(pasta)) {
    if (item === "node_modules" || item === ".git" || item === "out") continue;
    const caminho = join(pasta, item);
    if (!statSync(caminho).isDirectory()) continue;
    if (/\.(tsx?|mts|mjs|js|json|md|mp3|mp4|png|jpe?g|wav)$/i.test(item)) erradas.push(caminho);
    olhar(caminho);
  }
};
for (const pasta of ["src", "ferramentas", "public", ".claude"]) if (existsSync(pasta)) olhar(pasta);
if (erradas.length) problemas.push(`arquivos que viraram pasta: ${erradas.join(", ")}`);
for (const arquivo of ["ferramentas/andamento.mts", "ferramentas/aprovar.mts", "ferramentas/narrar.mts", "ferramentas/renderizar.mts"]) {
  if (!existsSync(arquivo)) problemas.push(`falta ${arquivo}`);
}

// 2. O molde monta e renderiza um quadro pequeno (com os dados de exemplo dele)
if (!problemas.length) {
  const pasta = mkdtempSync(join(tmpdir(), "postai-checar-"));
  const quadro = join(pasta, "quadro.png");
  // O 3D sem placa de vídeo (a nuvem): o swangle desenha no processador
  const gl = molde === "Mundo3D" ? [`--gl=${process.env.KIT_NAVEGADOR ? "swangle" : "angle"}`] : [];
  const r = spawnSync("npx", ["remotion", "still", molde, quadro, "--frame=30", "--scale=0.2", "--log=error", ...gl, ...(EXEMPLOS[pedido] ? [`--props=${EXEMPLOS[pedido]}`] : [])], {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 4 * 60 * 1000,
  });
  if (r.status !== 0 || !existsSync(quadro)) {
    const linhas = `${r.stderr ?? ""}${r.stdout ?? ""}`.split("\n").map((l) => l.trim()).filter((l) => l && !/warning|trace-warn|^at /i.test(l));
    // A linha que diz a causa (módulo que não existe, erro de código), não o fim da pilha
    const causa = linhas.filter((l) => /not found|can't resolve|cannot|doesn't exist|error/i.test(l));
    const motivo = (causa.length ? causa : linhas).slice(0, 2).join(" | ");
    problemas.push(`o molde ${molde} não renderiza (${motivo.slice(0, 300) || "sem mensagem"})`);
  }
  rmSync(pasta, { recursive: true, force: true });
}

// 3. O passe do Postaí funciona
if (soKit) {
  // sem a nuvem
} else if (!process.env.POSTAI_CHAVE) {
  problemas.push("falta o passe do Postaí (~/.postai-passe)");
} else {
  try {
    await ferramenta("conferir_parada");
  } catch (erro) {
    problemas.push(`o Postaí não aceitou o passe (${erro instanceof Error ? erro.message : String(erro)})`);
  }
}

if (problemas.length) {
  const texto = `O kit não passou na checagem antes de começar, e nenhuma agente trabalhou (nada do seu Claude foi gasto com o vídeo): ${problemas.join("; ")}`;
  console.error(`\nCHECAGEM FALHOU: ${problemas.join("; ")}\nPare aqui: não chame nenhuma agente.`);
  if (process.env.POSTAI_CHAVE && !soKit) {
    try {
      await ferramenta("contar_andamento", { agente: "coordenadora", status: "erro", mensagem: texto.slice(0, 200) });
      await ferramenta("anotar_limite_do_kit", { assunto: "outro", texto: `Checagem do começo falhou: ${problemas.join("; ")}`.slice(0, 300) });
    } catch {
      // o aviso é só um extra
    }
  }
  process.exit(1);
}
console.log(soKit ? `CHECAGEM OK (só o kit): kit inteiro e o molde ${molde} renderiza.` : `CHECAGEM OK: kit inteiro, o molde ${molde} renderiza e o Postaí respondeu.`);
