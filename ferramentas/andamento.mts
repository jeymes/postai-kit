// Avisa na tela Animação do Postaí o que a equipe está fazendo agora ("Sua
// equipe", ao vivo). Nunca derruba a rotina: se o aviso falhar, só avisa aqui.
//
// Uso: npm run andamento -- <agente> <trabalhando|feito|erro> "mensagem curta" [--nova]
//      --nova: a coordenadora começando o dia (a tela limpa a execução anterior)
//
// Quando a coordenadora termina (feito ou erro), soma os tokens que o Claude
// Code gastou nesta execução (dela e das agentes) e manda junto, para o
// histórico de vídeos do Postaí.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { ferramenta } from "./postai.ts";

const args = process.argv.slice(2);
const soltos = args.filter((arg) => !arg.startsWith("--"));
const [agente, status, ...resto] = soltos;
if (!agente || !status) {
  console.error('Uso: npm run andamento -- <agente> <trabalhando|feito|erro> "mensagem"');
  process.exit(0);
}

// A hora em que a execução começou (para somar só esta execução)
const INICIO = join(tmpdir(), "postai-inicio-da-execucao");
const nova = args.includes("--nova");
if (nova) {
  try {
    writeFileSync(INICIO, String(Date.now()));
  } catch {
    // sem a hora, a soma usa as últimas 12 horas
  }
}

interface Consumo {
  entrada: number;
  saida: number;
  cacheCriado: number;
  cacheLido: number;
  respostas: number;
  modelos: string[];
}

// Todos os .jsonl das sessões do Claude Code (com os das agentes, em subagents/)
function arquivos(pasta: string, achados: string[] = []) {
  let itens: string[] = [];
  try {
    itens = readdirSync(pasta);
  } catch {
    return achados;
  }
  for (const item of itens) {
    const caminho = join(pasta, item);
    try {
      if (statSync(caminho).isDirectory()) arquivos(caminho, achados);
      else if (item.endsWith(".jsonl")) achados.push(caminho);
    } catch {
      continue;
    }
  }
  return achados;
}

function somarConsumo(): Consumo | null {
  let desde = Date.now() - 12 * 60 * 60 * 1000;
  try {
    desde = Number(readFileSync(INICIO, "utf8")) || desde;
  } catch {
    // sem o arquivo: últimas 12 horas
  }
  const raiz = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "projects");
  const pasta = process.cwd();
  const vistas = new Set<string>();
  const modelos = new Set<string>();
  const soma: Consumo = { entrada: 0, saida: 0, cacheCriado: 0, cacheLido: 0, respostas: 0, modelos: [] };
  for (const arquivo of arquivos(raiz)) {
    try {
      if (statSync(arquivo).mtimeMs < desde) continue;
      for (const linha of readFileSync(arquivo, "utf8").split("\n")) {
        if (!linha.includes('"usage"')) continue;
        let registro: {
          type?: string;
          cwd?: string;
          timestamp?: string;
          requestId?: string;
          message?: { id?: string; model?: string; usage?: Record<string, number> };
        };
        try {
          registro = JSON.parse(linha);
        } catch {
          continue;
        }
        const uso = registro.message?.usage;
        if (registro.type !== "assistant" || !uso) continue;
        // Só esta pasta (no PC pode haver outras sessões do Claude Code abertas)
        if (registro.cwd && !registro.cwd.startsWith(pasta)) continue;
        if (registro.timestamp && Date.parse(registro.timestamp) < desde) continue;
        // A mesma resposta aparece uma vez por bloco (texto, ferramenta): conta uma vez
        const chave = registro.message?.id ?? registro.requestId ?? linha;
        if (vistas.has(chave)) continue;
        vistas.add(chave);
        soma.entrada += uso.input_tokens ?? 0;
        soma.saida += uso.output_tokens ?? 0;
        soma.cacheCriado += uso.cache_creation_input_tokens ?? 0;
        soma.cacheLido += uso.cache_read_input_tokens ?? 0;
        soma.respostas += 1;
        const modelo = registro.message?.model;
        if (modelo && !modelo.startsWith("<")) modelos.add(modelo);
      }
    } catch {
      continue;
    }
  }
  soma.modelos = [...modelos].slice(0, 5);
  return soma.respostas > 0 ? soma : null;
}

if (!process.env.POSTAI_CHAVE) {
  console.log("(sem POSTAI_CHAVE: o andamento não vai para a tela)");
  process.exit(0);
}
const fim = agente === "coordenadora" && (status === "feito" || status === "erro");
const consumo = fim ? somarConsumo() : null;
try {
  await ferramenta("contar_andamento", {
    agente,
    status,
    mensagem: resto.join(" ").slice(0, 200),
    nova,
    ...(consumo ? { consumo } : {}),
  });
  const total = consumo ? consumo.entrada + consumo.saida + consumo.cacheCriado + consumo.cacheLido : 0;
  console.log(`Andamento: ${agente} ${status}.${consumo ? ` Tokens desta execução: ${total}.` : ""}`);
} catch (erro) {
  console.log(`(andamento não registrado: ${erro instanceof Error ? erro.message : String(erro)})`);
}
