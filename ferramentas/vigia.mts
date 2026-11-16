// O vigia da rotina na nuvem: pergunta ao Postaí, a cada 20 segundos, se o dono
// clicou em Parar. Se clicou, encerra a sessão do Claude na hora (a equipe, o
// render, a narração e o navegador), mesmo no meio de uma espera longa: sem
// ele, a equipe só via o "PARE AGORA" no próximo andamento, às vezes 10 minutos
// depois. Sai sozinho quando a execução termina ou depois de 12 horas.
// Só age no Linux da nuvem (lê /proc); no seu computador não faz nada.
//
// Uso (a coordenadora, no passo 1): (nohup npm run vigiar > /tmp/vigia.log 2>&1 &)
//      na fábrica de cortes (da raiz do kit): (nohup npm run vigiar -- cortes > /tmp/vigia.log 2>&1 &)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ferramenta } from "./postai.ts";

const INTERVALO_MS = 20_000;
const LIMITE_MS = 12 * 60 * 60 * 1000;

export interface Processo {
  pid: number;
  linha: string;
}

/**
 * Quem encerrar quando o dono para: o Claude Code e o trabalho pesado que ele
 * deixou rodando. Nunca o próprio vigia (nem o npm que o chamou) nem o init.
 */
export function alvosParaEncerrar(processos: Processo[], meus: Set<number>): Processo[] {
  return processos.filter(
    ({ pid, linha }) =>
      pid > 1 &&
      !meus.has(pid) &&
      !/vigia/.test(linha) &&
      // O Claude Code (não os arquivos de configuração em ~/.claude/) e o trabalho dele
      (/(^|[\s/])claude(-code)?([\s/.]|$)/i.test(linha.replace(/\/\.claude\/\S*/g, "")) ||
        /remotion|ffmpeg|chrom|piper|kokoro|narrar|renderizar|buscar-fotos|conferir|whisper|transcrever|cortar|enviar\.mts/i.test(linha)),
  );
}

function processos(): Processo[] {
  return readdirSync("/proc")
    .filter((nome) => /^\d+$/.test(nome))
    .flatMap((nome) => {
      try {
        const linha = readFileSync(`/proc/${nome}/cmdline`, "utf8").replace(/\0/g, " ").trim();
        return linha ? [{ pid: Number(nome), linha }] : [];
      } catch {
        return [];
      }
    });
}

function encerrar(sinal: NodeJS.Signals) {
  const alvos = alvosParaEncerrar(processos(), new Set([process.pid, process.ppid]));
  for (const { pid } of alvos) {
    try {
      process.kill(pid, sinal);
    } catch {
      // já tinha saído
    }
  }
  return alvos.length;
}

const espera = (ms: number) => new Promise((pronto) => setTimeout(pronto, ms));

// Só roda como comando (o teste importa as funções acima sem rodar o laço)
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync("/proc") || !process.env.POSTAI_CHAVE) {
    console.log("Vigia: fora da nuvem ou sem o passe do Postaí; não faz nada.");
    process.exit(0);
  }
  const inicio = Date.now();
  // Na fábrica de cortes, o Postaí compara o Parar com a hora em que esta execução começou
  const daFabrica = process.argv[2] === "cortes";
  const pergunta = daFabrica ? { canal: "cortes", desde: inicio } : {};
  console.log("Vigia: de olho no botão Parar do Postaí.");
  while (Date.now() - inicio < LIMITE_MS) {
    await espera(INTERVALO_MS);
    let resposta = "";
    try {
      resposta = await ferramenta("conferir_parada", pergunta);
    } catch {
      continue; // sem rede agora: tenta de novo na próxima volta
    }
    if (resposta.includes("TERMINOU")) {
      console.log("Vigia: a execução terminou; saindo.");
      process.exit(0);
    }
    if (resposta.includes("PARE AGORA")) {
      console.log("Vigia: o dono parou no Postaí; encerrando a sessão.");
      const quantos = encerrar("SIGTERM");
      await espera(3000);
      encerrar("SIGKILL");
      console.log(`Vigia: ${quantos} processos encerrados.`);
      process.exit(0);
    }
  }
  console.log("Vigia: 12 horas; saindo.");
}
