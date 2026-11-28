// A voz do Google pelo Postaí (o /mcp): a cota (ver_cota_de_voz) e um trecho de
// fala (gerar_voz), baixado com o curl (na nuvem passa pelo proxy). O narrar.mts
// usa; a escolha do motor fica em motor.ts.
//
// Para testar sem o servidor: POSTAI_VOZ_FALSA=1 troca o Postaí por um falso que
// fala com o Kokoro local (precisa do npm run voz:instalar) e devolve o wav num
// file://. Com ele:
//   POSTAI_VOZ_FALSA_COTA='{"gemini":{"sobraHoje":0,"zeraEm":"..."},"chirp":{"sobraNoMes":0}}'  a cota que ele diz
//   POSTAI_VOZ_FALSA_FALHA=gemini:1   o gemini responde COTA_ACABOU depois de 1 trecho (testa a troca no meio)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { PYTHON } from "./caminhos.ts";
import type { CotaDeVoz } from "./motor.ts";
import { VOZES_GOOGLE, type MotorGoogle } from "../../src/componentes/personagens/vozesGoogle.ts";

export type PedidoDeVoz = { texto: string; voz: string; motor: MotorGoogle; idioma?: string; jeito?: string; peca?: string };

const FALSA = process.env.POSTAI_VOZ_FALSA === "1";
export const vozFalsa = FALSA;

// ---- O falso (só para testar) ----
const pedidosFalsos: Record<string, number> = {};
async function falsa(nome: string, args: Record<string, unknown>): Promise<string> {
  if (nome === "ver_cota_de_voz")
    return process.env.POSTAI_VOZ_FALSA_COTA || JSON.stringify({ gemini: { sobraHoje: 100, zeraEm: new Date(Date.now() + 6 * 3600e3).toISOString() }, chirp: { sobraNoMes: 1_000_000 } });
  if (nome !== "gerar_voz") throw new Error(`${nome}: ferramenta desconhecida no falso`);
  const motor = args.motor as MotorGoogle;
  const [qual, depois] = (process.env.POSTAI_VOZ_FALSA_FALHA ?? "").split(":");
  pedidosFalsos[motor] = (pedidosFalsos[motor] ?? 0) + 1;
  if (qual === motor && pedidosFalsos[motor] > Number(depois || 0)) throw new Error(`gerar_voz: COTA_ACABOU: a cota do ${motor} acabou (falso)`);
  const texto = String(args.texto ?? "");
  if (texto.length > 1500) throw new Error("gerar_voz: o texto passa de 1500 letras");
  const pasta = mkdtempSync(join(tmpdir(), "voz-falsa-"));
  const saida = join(pasta, "voz.wav");
  const pedido = join(pasta, "pedido.json");
  const kokoro = VOZES_GOOGLE[String(args.voz)]?.genero === "masculina" ? "pm_alex" : "pf_dora";
  writeFileSync(pedido, JSON.stringify({ voz: kokoro, velocidade: 1, idioma: args.idioma ?? "pt", falas: [{ texto, saida }] }));
  const r = spawnSync(PYTHON, [join("ferramentas", "voz", "voz.py"), pedido], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`gerar_voz: VOZ_FALHOU: o Kokoro do falso falhou: ${r.stderr.slice(-300)}`);
  console.log(`  (voz falsa) gerar_voz ${motor} ${args.voz}: ${texto.length} letras${args.jeito ? `, jeito "${args.jeito}"` : ""}`);
  return JSON.stringify({ url: pathToFileURL(saida).href, formato: "wav", motor, voz: args.voz, letras: texto.length });
}

async function chamar(nome: string, args: Record<string, unknown> = {}): Promise<string> {
  if (FALSA) return falsa(nome, args);
  const { exigirChave, ferramenta } = await import("../postai.ts");
  exigirChave();
  return ferramenta(nome, args);
}

/** A cota de hoje (Gemini) e do mês (Chirp); null se o Postaí não respondeu. */
export async function verCota(): Promise<CotaDeVoz | null> {
  try {
    return JSON.parse(await chamar("ver_cota_de_voz")) as CotaDeVoz;
  } catch (erro) {
    console.log(`(Não consegui ver a cota de voz: ${erro instanceof Error ? erro.message : String(erro)}. Sigo com o motor do canal; se a cota acabar, o gerar_voz avisa.)`);
    return null;
  }
}

/**
 * Gera um trecho de fala e grava o wav em `destino`. Erros do Postaí sobem como
 * vieram (COTA_ACABOU: / VOZ_FALHOU: no texto); a rede caída tenta mais uma vez.
 */
export async function gerarTrecho(pedido: PedidoDeVoz, destino: string): Promise<void> {
  let ultima: unknown;
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const resposta = JSON.parse(
        await chamar("gerar_voz", {
          texto: pedido.texto,
          voz: pedido.voz,
          motor: pedido.motor,
          ...(pedido.idioma ? { idioma: pedido.idioma } : {}),
          ...(pedido.jeito && pedido.motor === "gemini" ? { jeito: pedido.jeito.slice(0, 200) } : {}),
          ...(pedido.peca ? { peca: pedido.peca } : {}),
        }),
      ) as { url?: string; motor?: string };
      if (!resposta.url) throw new Error("gerar_voz: VOZ_FALHOU: o Postaí não mandou o endereço do áudio");
      mkdirSync(dirname(destino), { recursive: true });
      const parcial = `${destino}.baixando`;
      const baixou = spawnSync("curl", ["-sSfL", "--retry", "2", "-o", parcial, resposta.url], { encoding: "utf8" });
      if (baixou.status !== 0 || !existsSync(parcial)) {
        rmSync(parcial, { force: true });
        throw new Error(`não consegui baixar o áudio do gerar_voz: ${(baixou.stderr || "").trim().slice(-200)}`);
      }
      renameSync(parcial, destino);
      return;
    } catch (erro) {
      ultima = erro;
      // Cota ou voz recusada: não adianta repetir (quem chama troca de motor ou espera)
      if (/COTA_ACABOU:|VOZ_FALHOU:/.test(erro instanceof Error ? erro.message : String(erro))) throw erro;
    }
  }
  throw ultima;
}
