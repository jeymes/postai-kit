// Ilustração da fala: as contas do tempo, sem React (os moldes, o conferir e os
// testes usam). Acha o quadro de uma palavra da fala (sem ligar para acento,
// maiúscula ou pontuação), planeja quando cada item entra e sai e onde fica, e
// mede o ritmo do roteiro: o maior trecho sem nada mudando na tela.
// Testes: node --test src/componentes/ilustracao/tempo.test.ts

import { normalizarPalavra } from "../../moldes/documentario/infografico/numeros.ts";
import { estimarPalavras, FPS } from "../../moldes/tempos.ts";
import { alturaDaConta } from "./layout.ts";
import { emDoPasso, type Ilustracao, type Lugar } from "./schema.ts";

/** Uma palavra dita, com o quadro em que começa e termina (na base de tempo de quem chama) */
export interface PalavraNoTempo {
  texto: string;
  inicio: number;
  fim: number;
}

/** As palavras da voz (o `cena.narracao.legendas` do npm run narrar), em quadros, a partir de `atraso` */
export function palavrasDaNarracao(legendas: ReadonlyArray<{ texto: string; inicioMs: number; fimMs: number }>, atraso = 0, fps = FPS): PalavraNoTempo[] {
  return legendas.map((l) => ({ texto: l.texto, inicio: atraso + Math.round((l.inicioMs / 1000) * fps), fim: atraso + Math.round((l.fimMs / 1000) * fps) }));
}

/** Antes da voz: o tempo estimado pelo texto (o mesmo do tempos.ts), a partir de `atraso` */
export function palavrasEstimadas(fala: string, atraso = 0): PalavraNoTempo[] {
  return estimarPalavras(fala).map((p) => ({ texto: p.texto, inicio: atraso + p.inicio, fim: atraso + p.fim }));
}

/** Minúsculas, sem acento e sem pontuação ("Três," → "tres"; "R$ 3.500" → "r3500") */
export const normalizar = normalizarPalavra;

/** Quantas letras trocar para uma palavra virar a outra (só para palavras curtas: até ~20 letras) */
function distancia(a: string, b: string) {
  if (a === b) return 0;
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return linha[b.length];
}

/**
 * A palavra dita bate com a escrita? Igual (sem acento, caixa e pontuação); ou
 * uma começa com a outra (casamento/casamentos, "dinheir" no fim); ou, nas
 * palavras de 5 letras ou mais, uma letra de diferença (o Whisper erra: "juro"/"juros",
 * "cartao"/"cartão" já bate).
 */
function bate(dita: string, escrita: string, ultima: boolean) {
  if (!dita || !escrita) return false;
  if (dita === escrita) return true;
  if (ultima && escrita.length >= 3 && dita.startsWith(escrita)) return true;
  if (escrita.length >= 4 && dita.length >= 4 && (dita.startsWith(escrita) || escrita.startsWith(dita)) && Math.abs(dita.length - escrita.length) <= 2) return true;
  return escrita.length >= 5 && dita.length >= 5 && distancia(dita, escrita) <= 1;
}

/**
 * O índice da palavra da fala em que `alvo` começa (alvo pode ter mais de uma
 * palavra: "três mil"). Procura a partir de `aPartirDe` (a mesma palavra dita
 * duas vezes: a segunda ilustração pega a segunda vez) e, se não achar, do
 * começo. -1 quando não acha.
 */
export function acharPalavra(palavras: ReadonlyArray<Pick<PalavraNoTempo, "texto">>, alvo: string, aPartirDe = 0): number {
  const procurado = alvo.split(/\s+/).map(normalizar).filter(Boolean);
  if (!procurado.length || !palavras.length) return -1;
  const ditas = palavras.map((p) => normalizar(p.texto));
  const tentar = (de: number) => {
    for (let i = Math.max(0, de); i + procurado.length <= ditas.length; i++) {
      if (procurado.every((p, j) => bate(ditas[i + j], p, j === procurado.length - 1))) return i;
    }
    return -1;
  };
  const achou = tentar(aPartirDe);
  return achou >= 0 || aPartirDe <= 0 ? achou : tentar(0);
}

/** O quadro em que a palavra `alvo` começa; sem ela (ou sem achar), o começo da fala */
export function quadroDaPalavra(palavras: ReadonlyArray<PalavraNoTempo>, alvo: string | undefined, aPartirDe = 0): { quadro: number; indice: number; achou: boolean } {
  const comeco = palavras[0]?.inicio ?? 0;
  if (!alvo) return { quadro: comeco, indice: 0, achou: true };
  const indice = acharPalavra(palavras, alvo, aPartirDe);
  if (indice < 0) return { quadro: comeco, indice: 0, achou: false };
  return { quadro: palavras[indice].inicio, indice, achou: true };
}

// ---- O plano: quando cada item entra, sai e onde fica ----

/** Quadros: entra um tico antes da palavra (o olho chega junto com o ouvido), a entrada, a saída e o mínimo na tela */
export const TEMPO = { antecipa: 3, entrada: 14, saida: 12, minimoNaTela: 36, folgaDaTroca: 6 } as const;

/** As três faixas da tela em que os itens se empilham (esquerda e direita são as metades do topo) */
export type Faixa = "topo" | "meio" | "baixo";
/** Onde o item vai: numa faixa (empilhado), preso a um personagem (pensamento) ou num ponto da tela (seta, círculo) */
export type Destino = { faixa: Faixa; coluna: "cheia" | "esquerda" | "direita" } | { preso: string } | { livre: true };

export interface ItemPlanejado {
  item: Ilustracao;
  /** A posição na lista do roteiro */
  indice: number;
  /** Quadro em que começa a entrar e em que começa a sair (a saída leva TEMPO.saida) */
  entra: number;
  sai: number;
  destino: Destino;
  /** A altura reservada na faixa, em px (0 fora das faixas) */
  altura: number;
  /** Quadros em que cada pedaço aparece (os ícones da fila, os passos da conta) */
  pedacos: number[];
  /** A palavra `em` e a `ate` foram achadas na fala? (false: entrou no começo / saiu no fim) */
  achouEm: boolean;
  achouAte: boolean;
}

const LADOS: Partial<Record<Lugar, "esquerda" | "direita">> = { esquerda: "esquerda", direita: "direita" };

/** Os tipos grandes não cabem na metade da tela: esquerda/direita vira alto */
const SO_CHEIA = new Set(["grafico", "conta"]);

/** A altura que cada item ocupa na faixa (px). O render usa a mesma, para nada pular */
export function alturaDe(item: Ilustracao): number {
  switch (item.tipo) {
    case "icone":
      return (item.icones ? item.icones.some((i) => i.rotulo) : item.rotulo) ? 270 : 200;
    case "numero":
      return item.rotulo ? 250 : 190;
    case "grafico":
      return 520;
    case "conta":
      return alturaDaConta(item.passos.length);
    case "texto":
      return item.forma === "carimbo" ? 180 : item.forma === "marcador" ? 130 : 150;
    case "objeto":
      return item.rotulo ? 330 : 270;
    case "pensamento":
      return 230;
    default:
      return 0;
  }
}

/** Onde cada tipo vai sem `lugar` (`semBaixo`: o "baixo" sobe para o alto, embaixo do que já está lá) */
export function destinoDe(item: Ilustracao, personagens: ReadonlySet<string> | undefined, semBaixo = false): Destino {
  if (item.tipo === "seta" || item.tipo === "circulo") return { livre: true };
  if (item.tipo === "pensamento" && (!personagens || personagens.has(item.quem)) && !item.lugar) return { preso: item.quem };
  const lugar = item.lugar ?? "alto";
  const lado = LADOS[lugar];
  if (lado) return SO_CHEIA.has(item.tipo) ? { faixa: "topo", coluna: "cheia" } : { faixa: "topo", coluna: lado };
  if (lugar === "baixo" && semBaixo) return { faixa: "topo", coluna: "cheia" };
  return { faixa: lugar === "alto" ? "topo" : lugar === "meio" ? "meio" : "baixo", coluna: "cheia" };
}

/** A altura ocupada numa faixa pelos itens dados (as colunas esquerda e direita lado a lado, embaixo dos cheios) */
export function alturaDaPilha(itens: ReadonlyArray<{ destino: Destino; altura: number; peso?: number }>, folga = 20) {
  let cheia = 0;
  let esquerda = 0;
  let direita = 0;
  for (const it of itens) {
    if (!("faixa" in it.destino)) continue;
    const h = (it.altura + folga) * (it.peso ?? 1);
    if (it.destino.coluna === "esquerda") esquerda += h;
    else if (it.destino.coluna === "direita") direita += h;
    else cheia += h;
  }
  return Math.max(0, cheia + Math.max(esquerda, direita) - folga);
}

export interface OpcoesDoPlano {
  /** Quadro em que a fala (ou a cena) acaba: quem não tem `ate` sai antes disso */
  fim: number;
  /** Quadro em que a fala começa (ninguém entra antes) */
  inicio?: number;
  /** A altura livre (px) de cada faixa: passou disso, o mais antigo sai para dar lugar */
  capacidade?: Partial<Record<Faixa, number>>;
  /** Os ids dos personagens na tela (pensamento de quem não está vira um balão no alto) */
  personagens?: Iterable<string>;
  /**
   * Sem faixa de baixo: o que pede "baixo" sobe para o alto, embaixo do que já está lá. No
   * Conversa a faixa de baixo é o tronco e as pernas de quem está de pé (28/11/2026: o carimbo
   * "R$ 5.400!" cobria as pernas da Bia e encostava na legenda grande do narrador)
   */
  semBaixo?: boolean;
}

export const CAPACIDADE_PADRAO: Record<Faixa, number> = { topo: 520, meio: 600, baixo: 270 };

/**
 * Quando cada ilustração entra e sai e onde fica. Regras: entra 3 quadros antes
 * da palavra `em`; sai na palavra `ate` ou no fim da fala; fica pelo menos 1,2 s;
 * os pedaços (ícones da fila, passos da conta) aparecem na palavra deles ou um
 * atrás do outro; e numa faixa cheia o item mais antigo sai para o novo entrar
 * (nunca dois por cima um do outro).
 */
export function planejarIlustracoes(ilustra: ReadonlyArray<Ilustracao> | undefined, palavras: ReadonlyArray<PalavraNoTempo>, opcoes: OpcoesDoPlano): ItemPlanejado[] {
  if (!ilustra?.length) return [];
  const inicio = opcoes.inicio ?? Math.max(0, (palavras[0]?.inicio ?? 0) - TEMPO.antecipa);
  const fim = Math.max(opcoes.fim, inicio + TEMPO.entrada + TEMPO.saida + 1);
  const capacidade = { ...CAPACIDADE_PADRAO, ...opcoes.capacidade };
  const personagens = opcoes.personagens ? new Set(opcoes.personagens) : undefined;
  // A procura anda junto com a fala: a mesma palavra dita duas vezes vai para o item certo
  let cursor = 0;
  // A palavra igual à do item anterior procura a PRÓXIMA vez que ela é dita (28/11/2026: o
  // segundo "quatrocentos" pegava a mesma vez do primeiro e entrava no começo da fala)
  let ultima = "";
  const procurarDe = (em?: string) => (em && normalizar(em) === ultima ? cursor + 1 : cursor);
  const planos = ilustra.map((item, indice): ItemPlanejado => {
    const em = quadroDaPalavra(palavras, item.em, procurarDe(item.em));
    if (item.em && em.achou) {
      cursor = em.indice;
      ultima = normalizar(item.em);
    }
    const entra = Math.max(inicio, Math.min(fim - TEMPO.entrada - TEMPO.saida, em.quadro - TEMPO.antecipa));
    // A saída: na palavra `ate` (procurada depois da `em`) ou no fim da fala
    const ate = item.ate ? quadroDaPalavra(palavras, item.ate, em.indice + 1) : undefined;
    const achouAte = !ate || (ate.achou && ate.quadro > em.quadro);
    let sai = ate && achouAte ? ate.quadro - TEMPO.antecipa : fim - TEMPO.saida;
    sai = Math.min(fim - TEMPO.saida, Math.max(sai, entra + TEMPO.minimoNaTela));
    sai = Math.max(sai, entra + TEMPO.entrada);
    // Os pedaços: na palavra de cada um, ou espalhados pelo tempo na tela
    const marcas = item.tipo === "icone" && item.icones ? item.icones.map((i) => i.em) : item.tipo === "conta" ? item.passos.map(emDoPasso) : [];
    const pedacos: number[] = [];
    if (marcas.length) {
      const passo = Math.max(8, Math.min(22, Math.floor((sai - entra - TEMPO.entrada) / (marcas.length + 1))));
      let anterior = entra;
      let cursorDoPedaco = em.indice;
      marcas.forEach((m, k) => {
        let q = k === 0 ? entra : anterior + passo;
        if (m) {
          const achado = quadroDaPalavra(palavras, m, cursorDoPedaco);
          if (achado.achou) {
            q = achado.quadro - TEMPO.antecipa;
            cursorDoPedaco = achado.indice;
          }
        }
        // Sempre em ordem e com respiro (nunca dois pedaços no mesmo quadro), dentro do tempo na tela
        q = Math.min(sai - 10, Math.max(q, k === 0 ? entra : anterior + 6));
        pedacos.push(q);
        anterior = q;
      });
    }
    return { item, indice, entra, sai, destino: destinoDe(item, personagens, opcoes.semBaixo), altura: alturaDe(item), pedacos, achouEm: em.achou, achouAte };
  });
  // Faixa cheia: quando um item novo não cabe, os mais antigos da mesma faixa saem antes dele entrar
  const porEntrada = [...planos].sort((a, b) => a.entra - b.entra || a.indice - b.indice);
  porEntrada.forEach((novo, k) => {
    if (!("faixa" in novo.destino)) return;
    const faixa = novo.destino.faixa;
    const naTela = porEntrada.slice(0, k).filter((p) => "faixa" in p.destino && p.destino.faixa === faixa && p.sai > novo.entra);
    while (naTela.length && alturaDaPilha([...naTela, novo]) > capacidade[faixa]) {
      const velho = naTela.shift()!;
      velho.sai = Math.min(velho.sai, Math.max(velho.entra + 24, novo.entra - TEMPO.folgaDaTroca));
    }
  });
  return planos;
}

/** Quanto o item está na tela no quadro `t`: 0 (fora) → 1 (inteiro). Sem curva; o render põe a mola */
export function presencaLinear(p: Pick<ItemPlanejado, "entra" | "sai">, t: number) {
  if (t < p.entra || t >= p.sai + TEMPO.saida) return 0;
  const entrou = Math.min(1, (t - p.entra) / TEMPO.entrada);
  const saiu = t < p.sai ? 0 : Math.min(1, (t - p.sai) / TEMPO.saida);
  return Math.max(0, entrou - saiu);
}

// ---- O ritmo: algo muda na tela a cada 2 a 3 s ----

export interface Ritmo {
  /** O maior trecho sem nenhuma mudança na tela, em segundos, e onde ele fica (quadros) */
  maiorSemMudanca: number;
  de: number;
  ate: number;
  /** Os trechos acima do limite, do maior para o menor */
  trechosLongos: Array<{ de: number; ate: number; segundos: number }>;
  /** Quantas mudanças por minuto, em média */
  mudancasPorMinuto: number;
}

/**
 * Mede o ritmo: recebe os quadros em que algo muda na tela (uma ilustração
 * entra ou sai, um pedaço aparece, a cena troca, o personagem muda de pose) e o
 * trecho do vídeo, e diz o maior intervalo parado e os trechos acima de
 * `limiteSeg` (padrão 3 s).
 */
export function medirRitmo(mudancas: Iterable<number>, inicio: number, fim: number, opcoes: { fps?: number; limiteSeg?: number } = {}): Ritmo {
  const fps = opcoes.fps ?? FPS;
  const limite = opcoes.limiteSeg ?? 3;
  const marcas = [...new Set([...mudancas].filter((q) => q > inicio && q < fim).map(Math.round))].sort((a, b) => a - b);
  const pontos = [inicio, ...marcas, fim];
  let maior = { de: inicio, ate: inicio };
  const longos: Ritmo["trechosLongos"] = [];
  for (let i = 1; i < pontos.length; i++) {
    const de = pontos[i - 1];
    const ate = pontos[i];
    if (ate - de > maior.ate - maior.de) maior = { de, ate };
    if ((ate - de) / fps > limite) longos.push({ de, ate, segundos: Math.round(((ate - de) / fps) * 10) / 10 });
  }
  longos.sort((a, b) => b.segundos - a.segundos);
  const minutos = Math.max(1 / 60, (fim - inicio) / fps / 60);
  return {
    maiorSemMudanca: Math.round(((maior.ate - maior.de) / fps) * 10) / 10,
    de: maior.de,
    ate: maior.ate,
    trechosLongos: longos,
    mudancasPorMinuto: Math.round(marcas.length / minutos),
  };
}

/** As mudanças visuais de uma fala já planejada: cada entrada, cada pedaço e cada saída */
export function mudancasDoPlano(planos: ReadonlyArray<ItemPlanejado>): number[] {
  return planos.flatMap((p) => [p.entra, ...p.pedacos.slice(1), p.sai]);
}

export interface FalaParaRitmo {
  /** Quadro em que a fala começa e quadros que ela dura (no vídeo inteiro) */
  inicio: number;
  duracao: number;
  palavras: PalavraNoTempo[];
  ilustra?: ReadonlyArray<Ilustracao>;
  /** Outras mudanças desta fala (pose no meio, notificação), em quadros do vídeo */
  outras?: number[];
  /** O começo desta fala muda a tela? (troca de cena, de plano, de quem fala com pose nova). Padrão: sim */
  mudaNoComeco?: boolean;
}

/** O ritmo de um roteiro inteiro: cada fala com as palavras no tempo do vídeo e o que ela ilustra */
export function ritmoDoRoteiro(falas: ReadonlyArray<FalaParaRitmo>, opcoes: { fps?: number; limiteSeg?: number } = {}): Ritmo {
  if (!falas.length) return medirRitmo([], 0, 0, opcoes);
  const mudancas: number[] = [];
  for (const f of falas) {
    if (f.mudaNoComeco !== false) mudancas.push(f.inicio);
    mudancas.push(...(f.outras ?? []));
    mudancas.push(...mudancasDoPlano(planejarIlustracoes(f.ilustra, f.palavras, { inicio: f.inicio, fim: f.inicio + f.duracao })));
  }
  const ultima = falas[falas.length - 1];
  return medirRitmo(mudancas, falas[0].inicio, ultima.inicio + ultima.duracao, opcoes);
}

/** Avisos para o conferir: palavra que não está na fala, saída antes da entrada */
export function conferirIlustra(ilustra: ReadonlyArray<Ilustracao> | undefined, fala: string): string[] {
  if (!ilustra?.length) return [];
  const palavras = palavrasEstimadas(fala);
  const avisos: string[] = [];
  let cursor = 0;
  let ultima = "";
  ilustra.forEach((item, i) => {
    const n = `ilustra[${i}] (${item.tipo})`;
    if (item.em) {
      const k = acharPalavra(palavras, item.em, normalizar(item.em) === ultima ? cursor + 1 : cursor);
      if (k < 0) avisos.push(`${n}: a palavra "${item.em}" não está na fala; o item entra no começo`);
      else {
        cursor = k;
        ultima = normalizar(item.em);
      }
    }
    if (item.ate) {
      const k = acharPalavra(palavras, item.ate, cursor + 1);
      if (k < 0 || k <= cursor) avisos.push(`${n}: a palavra de saída "${item.ate}" não vem depois da "${item.em ?? "começo"}" na fala; o item fica até o fim`);
    }
  });
  return avisos;
}
