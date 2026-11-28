// A escolha do motor da voz do Google para um vídeo (sem rede nem arquivo: o
// narrar.mts usa e o motor.test.ts testa). Regras do dono (27/11/2026):
//   - UM motor para o vídeo inteiro: nunca misturar motores nem vozes;
//   - confere a cota ANTES de narrar: o principal, se couber;
//   - senão, se o canal escolheu "reserva", o outro motor do Google (mesma voz);
//   - senão o vídeo ESPERA (ESPERAR_COTA), e nunca cai para o Kokoro.

import { outroMotor, type MotorGoogle } from "../../src/componentes/personagens/vozesGoogle.ts";

/** O que o canal escolheu no Postaí (canais/<canal>/vozes.json). */
export type VozesDoCanal = { motor: MotorGoogle | "kokoro"; semCota: "esperar" | "reserva"; narrador?: string };

/** O que o ver_cota_de_voz devolve: pedidos do Gemini hoje e letras do Chirp no mês. */
export type CotaDeVoz = { gemini?: { sobraHoje?: number; zeraEm?: string }; chirp?: { sobraNoMes?: number } };

/** Quanto o vídeo gasta em cada motor (só o que ainda não está guardado). */
export type Gasto = { pedidos: number; letras: number };

export type Escolha = { motor: MotorGoogle; aviso?: string } | { esperar: string };

/** O código de saída do narrar quando falta cota: a rotina para e tenta outro dia (75 = EX_TEMPFAIL). */
export const SAIDA_ESPERAR_COTA = 75;

/** Lê e confere o vozes.json; undefined se não for válido (o narrar segue com o Kokoro). */
export function lerVozesDoCanal(bruto: unknown): VozesDoCanal | undefined {
  if (!bruto || typeof bruto !== "object") return undefined;
  const v = bruto as Record<string, unknown>;
  if (v.motor !== "gemini" && v.motor !== "chirp" && v.motor !== "kokoro") return undefined;
  return {
    motor: v.motor,
    semCota: v.semCota === "reserva" ? "reserva" : "esperar",
    ...(typeof v.narrador === "string" && v.narrador.trim() ? { narrador: v.narrador.trim() } : {}),
  };
}

const NOME: Record<MotorGoogle, string> = { gemini: "Gemini", chirp: "Chirp 3 HD" };
export const nomeDoMotor = (motor: MotorGoogle) => NOME[motor];

/** Quando a cota volta, em palavras ("às 05:00 de 29/11"). */
export function quandoVolta(motor: MotorGoogle, cota: CotaDeVoz | null, agora = new Date()): string {
  if (motor === "chirp") return "no dia 1º do mês que vem";
  const zera = cota?.gemini?.zeraEm ? new Date(cota.gemini.zeraEm) : null;
  if (!zera || Number.isNaN(zera.getTime())) return "amanhã";
  if (zera.getTime() <= agora.getTime()) return "já deve ter voltado (rode de novo)";
  const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const partes = Object.fromEntries(fmt.formatToParts(zera).map((p) => [p.type, p.value]));
  return `às ${partes.hour}:${partes.minute} de ${partes.day}/${partes.month}`;
}

/** Cabe na cota? Sem a cota (o Postaí não respondeu), tenta: o gerar_voz avisa se acabar. */
export function cabe(motor: MotorGoogle, gasto: Gasto, cota: CotaDeVoz | null): boolean {
  if (gasto.pedidos === 0) return true;
  if (!cota) return true;
  if (motor === "gemini") return (cota.gemini?.sobraHoje ?? 0) >= gasto.pedidos;
  return (cota.chirp?.sobraNoMes ?? 0) >= gasto.letras;
}

function porQue(motor: MotorGoogle, gasto: Gasto, cota: CotaDeVoz | null): string {
  if (motor === "gemini")
    return `a cota do Gemini de hoje não dá (o vídeo precisa de ${gasto.pedidos} pedido(s), sobram ${cota?.gemini?.sobraHoje ?? 0}); volta ${quandoVolta(motor, cota)}`;
  return `a cota do Chirp 3 HD do mês não dá (o vídeo precisa de ${gasto.letras} letras, sobram ${cota?.chirp?.sobraNoMes ?? 0}); volta ${quandoVolta(motor, cota)}`;
}

/**
 * O motor do vídeo inteiro. `gasto` diz quanto cada motor gastaria (o que já está
 * guardado daquele motor não conta). `jaFalhou` são os motores que já deram
 * COTA_ACABOU ou VOZ_FALHOU nesta rodada (não tenta de novo).
 */
export function escolherMotor(
  canal: VozesDoCanal & { motor: MotorGoogle },
  gasto: Record<MotorGoogle, Gasto>,
  cota: CotaDeVoz | null,
  jaFalhou: MotorGoogle[] = [],
): Escolha {
  const principal = canal.motor;
  const reserva = outroMotor(principal);
  const motivos: string[] = [];
  if (!jaFalhou.includes(principal)) {
    if (cabe(principal, gasto[principal], cota)) return { motor: principal };
    motivos.push(porQue(principal, gasto[principal], cota));
  } else motivos.push(`o ${NOME[principal]} parou no meio desta rodada (cota acabou ou voz recusada); volta ${quandoVolta(principal, cota)}`);
  if (canal.semCota !== "reserva") {
    return { esperar: `${motivos.join("; ")}. O canal escolheu esperar a cota (sem reserva).` };
  }
  if (!jaFalhou.includes(reserva)) {
    if (cabe(reserva, gasto[reserva], cota))
      return { motor: reserva, aviso: `${motivos.join("; ")}: o vídeo sai inteiro na reserva (${NOME[reserva]}, a mesma voz).` };
    motivos.push(porQue(reserva, gasto[reserva], cota));
  } else motivos.push(`a reserva (${NOME[reserva]}) também parou no meio; volta ${quandoVolta(reserva, cota)}`);
  return { esperar: `${motivos.join("; ")}.` };
}

/** Os erros do gerar_voz que trocam de motor (ou fazem esperar): os outros são falha comum. */
export function erroDeCota(mensagem: string): "COTA_ACABOU" | "VOZ_FALHOU" | null {
  if (/COTA_ACABOU:/.test(mensagem)) return "COTA_ACABOU";
  if (/VOZ_FALHOU:/.test(mensagem)) return "VOZ_FALHOU";
  return null;
}

/** Divide uma fala em trechos de até `max` letras (o gerar_voz aceita até 1.500), nas pontas das frases. */
export function dividirTexto(texto: string, max = 1500): string[] {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo ? [limpo] : [];
  const frases = limpo.split(/(?<=[.!?…;:])\s+/);
  const trechos: string[] = [];
  let atual = "";
  const por = (pedaco: string) => {
    if (!atual) atual = pedaco;
    else if (atual.length + 1 + pedaco.length <= max) atual += ` ${pedaco}`;
    else {
      trechos.push(atual);
      atual = pedaco;
    }
  };
  for (const frase of frases) {
    if (frase.length <= max) por(frase);
    // Frase maior que o limite: quebra nas palavras
    else for (const palavra of frase.split(" ")) por(palavra);
  }
  if (atual) trechos.push(atual);
  return trechos;
}

// O "jeito" do Gemini (instrução de estilo, até 200 letras), curto e sem
// exagero, no idioma do vídeo (para não puxar o sotaque). O Chirp não usa.
const JEITOS = {
  documentario: {
    pt: "Narre como num documentário: voz calma, firme e pausada, sem dramatizar.",
    en: "Narrate like a documentary: calm, steady and unhurried voice, no drama.",
    es: "Narra como en un documental: voz tranquila, firme y pausada, sin dramatizar.",
  },
  narrador: {
    pt: "Conte como narrador, de um jeito natural e envolvente, sem exagero.",
    en: "Tell it as a narrator, natural and engaging, without overdoing it.",
    es: "Cuéntalo como narrador, de forma natural y cercana, sin exagerar.",
  },
  personagem: {
    pt: "Fale de um jeito natural e expressivo, como numa conversa de verdade, sem exagero.",
    en: "Speak in a natural, expressive way, like a real conversation, without overdoing it.",
    es: "Habla de forma natural y expresiva, como en una conversación real, sin exagerar.",
  },
} as const;

/** O jeito do Gemini para a fala: pelo molde e por quem fala. */
export function jeitoDaFala(molde: string | undefined, doNarrador: boolean, idioma: "pt" | "en" | "es" = "pt"): string {
  if (molde === "Documentario") return JEITOS.documentario[idioma];
  return (doNarrador ? JEITOS.narrador : JEITOS.personagem)[idioma];
}
