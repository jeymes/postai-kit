// As regras do 2D sem dependência nenhuma (27/11/2026): o molde (direcao.ts) e a
// conferência (ferramentas/conferir.mts, que roda no Node) usam as mesmas listas e contas.

export const POSES_DO_ROTEIRO = [
  "normal",
  "cintura",
  "celular",
  "celular-baixo",
  "cabeca",
  "explicando",
  "comemorando",
  "pensando",
  "sentado",
  "abraco",
  "apontando",
  "ombros",
  "bracos-cruzados",
  "acenando",
  "maos-juntas",
  "queixo",
  "sentado-livre",
] as const;
export const EXPRESSOES_DO_ROTEIRO = ["neutra", "feliz", "radiante", "preocupada", "surpresa", "brava", "sem-graca", "medo", "aliviada"] as const;

export const ACOES = [
  "pegar-celular",
  "guardar-celular",
  "baixar-celular",
  "cair-sentado",
  "levantar",
  "andar-perto",
  "andar-longe",
  "andar-meio",
  "andar-esquerda",
  "andar-direita",
  "voltar",
  "virar",
  "desvirar",
  "costas",
  "frente",
  "pular",
  "tremer",
] as const;
export type Acao = (typeof ACOES)[number];

export const PLANOS = ["aberto", "medio", "close"] as const;
export type Plano = (typeof PLANOS)[number];

/** As mãos ocupadas em cada pose (para o objeto de apoio não ir parar no rosto nem na cintura) */
export const MAOS_OCUPADAS: Partial<Record<string, Array<"esq" | "dir">>> = {
  cintura: ["dir"],
  celular: ["dir"],
  "celular-baixo": ["dir"],
  sentado: ["dir"],
  cabeca: ["esq", "dir"],
  pensando: ["dir"],
  queixo: ["esq", "dir"],
  abraco: ["dir"],
  "bracos-cruzados": ["esq", "dir"],
  "maos-juntas": ["esq", "dir"],
  acenando: ["dir"],
};

export const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");

// ---- Cenário: trocas com tempo mínimo ----

/** Tempo mínimo de um cenário na tela antes de trocar de novo (2,5 s): menos que isso pisca */
export const MINIMO_NO_CENARIO = 75;

export type Troca = { em: number; cenario: string; noite?: boolean; mudouLugar: boolean };

/**
 * As trocas de lugar (e de dia/noite) ao longo do vídeo, no meio do respiro entre as falas.
 * Uma troca pedida antes do mínimo espera a próxima fala (o conferir recusa o roteiro assim).
 */
export function trocasDeCenario(linha: Array<{ cena: { cenario?: string; noite?: boolean }; inicio: number }>, inicial: string): Troca[] {
  const trocas: Troca[] = [{ em: 0, cenario: inicial, noite: undefined, mudouLugar: false }];
  let pedidoCenario = inicial;
  let pedidoNoite: boolean | undefined = undefined;
  linha.forEach(({ cena, inicio }, k) => {
    if (cena.cenario) pedidoCenario = cena.cenario;
    if (typeof cena.noite === "boolean") pedidoNoite = cena.noite;
    const ultima = trocas[trocas.length - 1];
    if (pedidoCenario === ultima.cenario && pedidoNoite === ultima.noite) return;
    // A primeira fala (o quadro de abertura) começa direto no lugar pedido
    if (k === 0) {
      trocas[0] = { em: 0, cenario: pedidoCenario, noite: pedidoNoite, mudouLugar: false };
      return;
    }
    const em = Math.max(0, inicio - 6);
    if (em - ultima.em < MINIMO_NO_CENARIO && ultima.em > 0) return;
    trocas.push({ em, cenario: pedidoCenario, noite: pedidoNoite, mudouLugar: pedidoCenario !== ultima.cenario });
  });
  return trocas;
}

