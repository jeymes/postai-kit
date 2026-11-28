import type { Expressao } from "../../componentes/personagens/Boneco";
import {
  EXPRESSAO_DA_ACAO,
  giroCurto,
  posicaoNoQuadro,
  posturaDaAcao,
  posturaPorCima,
  POSTURAS,
  type ChaveDePostura,
  type Giro,
  type Movimento,
  type Olhar,
  type Postura,
  type Trilha,
} from "./animacao.ts";

// A atuação (27/11/2026): o roteiro vira a trilha de cada personagem. As poses
// da cena (`estados`), as trocas no meio (`mudancas`) e as ações na palavra
// (`acoes`) viram chaves de postura com transição; andar, virar, olhar,
// entregar e abraçar viram movimentos, giros e trocas de dono do objeto.
//
// Regras de continuidade (o dono: "a cena trava", "muda do nada"):
// - quem não tem estado numa cena continua como estava (antes voltava a "normal");
// - toda troca de postura leva de 10 a 18 quadros, nunca pula;
// - a ação começa uns quadros antes da palavra, para o gesto "bater" nela.

const FPS = 30;
/** Velocidade de quem anda e de quem corre (metros por segundo) */
const ANDANDO = 1.15;
const CORRENDO = 3.0;
/** Quantos quadros antes da palavra o gesto começa (para chegar nela) */
const ANTECIPA = 6;

export type AcaoDoRoteiro = {
  quem: string;
  em: string | number;
  acao: string;
  ate?: [number, number];
  para?: string;
  expressao?: Expressao;
  objeto?: string;
};
export type MudancaDoRoteiro = { em: number; quem: string; pose: string; expressao: Expressao };
export type EstadoDoRoteiro = { pose: string; expressao: Expressao; ate?: [number, number] };

export type CenaParaAtuar = {
  inicio: number;
  fim: number;
  palavras: Array<{ texto: string; inicio: number; fim: number }>;
  estados?: Record<string, EstadoDoRoteiro>;
  multidao?: EstadoDoRoteiro;
  mudancas?: MudancaDoRoteiro[];
  acoes?: AcaoDoRoteiro[];
  quem?: string;
};

/** Um objeto de mão que troca de dono (entregar) */
export type Posse = { quadro: number; objeto: number; dono: string };

export type Atuacao = {
  trilhas: Record<string, Trilha>;
  posses: Posse[];
  /** O que não deu para fazer (palavra que não está na fala, ação sem "para"...): o conferir mostra */
  avisos: string[];
};

const limpar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** O quadro de uma ação: a palavra dita (o começo dela) ou segundos desde o começo da cena */
export function quadroDaAcao(cena: Pick<CenaParaAtuar, "inicio" | "fim" | "palavras">, em: string | number): number | null {
  if (typeof em === "number") return Math.min(cena.fim - 2, cena.inicio + Math.round(em * FPS));
  const alvo = limpar(em);
  if (!alvo) return null;
  const p = cena.palavras.find((w) => limpar(w.texto) === alvo) ?? cena.palavras.find((w) => limpar(w.texto).startsWith(alvo) || (alvo.length >= 4 && alvo.startsWith(limpar(w.texto)) && limpar(w.texto).length >= 3));
  return p ? p.inicio : null;
}

const TRANSICAO: Record<string, number> = {
  ajoelhar: 18,
  "ajoelhar-orando": 18,
  sentar: 18,
  sentado: 18,
  levantar: 18,
  normal: 12,
  cair: 12,
  caido: 12,
  "levantar-bracos": 12,
  chorar: 14,
  abraco: 14,
  abracar: 14,
};

const BRACOS_PARA_CIMA = new Set(["levantar-bracos", "comemorando", "acenar", "cabeca", "apontando", "abraco", "orar", "ajoelhar-orando", "ajoelhar", "sentado", "sentar", "caido", "cair"]);

type Evento = { quadro: number; ordem: number; fazer: () => void };

export function montarAtuacao(
  personagens: Array<{ id: string; onde: [number, number] }>,
  cenas: CenaParaAtuar[],
  objetos: Array<{ tipo: string; perto?: string; naMao?: boolean }>,
): Atuacao {
  const avisos: string[] = [];
  const trilhas: Record<string, Trilha> = {};
  for (const p of personagens) trilhas[p.id] = { chaves: [], movimentos: [], giros: [], olhares: [], inicio: p.onde };
  trilhas.multidao = { chaves: [], movimentos: [], giros: [], olhares: [], inicio: [0, 0] };
  const posses: Posse[] = [];

  // O estado de agora de cada um, enquanto a trilha é montada (pose e expressão)
  // (e a postura de agora: quem está ajoelhado e olha para cima continua ajoelhado)
  const agora: Record<string, { pose: string; expressao: Expressao; postura: Postura }> = {};
  for (const id of Object.keys(trilhas)) agora[id] = { pose: "normal", expressao: "neutra", postura: POSTURAS.normal };

  /** porCima: a ação mexe só a parte de cima (as ações na palavra); o estado da cena troca a postura toda */
  const chave = (id: string, quadro: number, nome: string, expressao: Expressao, transicao?: number, porCima = false) => {
    const pedida: Postura | null = posturaDaAcao(nome);
    const t = trilhas[id];
    if (!t) return;
    // A mesma pose de agora (só a expressão muda): a postura fica a de agora, com as pernas que tinha
    const postura = pedida && nome === agora[id].pose ? agora[id].postura : pedida && porCima ? posturaPorCima(nome, pedida, agora[id].postura) : pedida;
    const pose = postura ? nome : agora[id].pose;
    const final = postura ?? agora[id].postura;
    // Nada mudou: não precisa de chave
    if (t.chaves.length && pose === agora[id].pose && expressao === agora[id].expressao) return;
    const nova: ChaveDePostura = {
      quadro: Math.max(0, quadro),
      postura: final,
      expressao,
      transicao: transicao ?? TRANSICAO[nome] ?? 11,
      nome: pose,
      lagrimas: pose === "chorar",
    };
    // Duas chaves no mesmo quadro: vale a última
    if (t.chaves.length && t.chaves[t.chaves.length - 1].quadro >= nova.quadro) {
      const ultima = t.chaves[t.chaves.length - 1];
      if (ultima.quadro === nova.quadro) t.chaves.pop();
      else nova.quadro = ultima.quadro + 1;
    }
    t.chaves.push(nova);
    agora[id] = { pose, expressao, postura: final };
  };

  const ondeEsta = (id: string, quadro: number): [number, number] => {
    const t = trilhas[id];
    return t ? posicaoNoQuadro(t, quadro).onde : [0, 0];
  };
  /** Anda de onde está até "ate", começando em "inicio"; termina até "limite" (acelera se precisar) */
  const andar = (id: string, inicio: number, ate: [number, number], correr: boolean, limite: number, virar = true) => {
    const t = trilhas[id];
    if (!t) return inicio;
    // Termina o movimento anterior antes de começar outro
    const ultimo = t.movimentos[t.movimentos.length - 1];
    if (ultimo && ultimo.fim > inicio) ultimo.fim = Math.max(ultimo.inicio + 1, inicio);
    const de = ondeEsta(id, inicio);
    const dist = Math.hypot(ate[0] - de[0], ate[1] - de[1]);
    if (dist < 0.05) return inicio;
    const natural = Math.round((dist / (correr ? CORRENDO : ANDANDO)) * FPS);
    const cabe = Math.max(8, limite - inicio);
    const dur = Math.max(8, Math.min(natural, cabe));
    const mov: Movimento = { inicio, fim: inicio + dur, de, ate, correr: correr || natural > cabe * 1.6 };
    if (!virar) mov.virar = false;
    t.movimentos.push(mov);
    return inicio + dur;
  };
  const girar = (id: string, quadro: number, alvo: Giro["alvo"], fim: number) => trilhas[id]?.giros.push({ quadro, alvo, fim });
  const olhar = (id: string, quadro: number, alvo: Olhar["alvo"], fim: number) => trilhas[id]?.olhares.push({ quadro, alvo, fim });
  /** Um ponto a "distancia" de "id" (no quadro), do lado de onde "de" está */
  const pertoDe = (id: string, de: [number, number], quadro: number, distancia: number): [number, number] => {
    const o = ondeEsta(id, quadro);
    const dx = de[0] - o[0];
    const dz = de[1] - o[1];
    const n = Math.hypot(dx, dz) || 1;
    return [o[0] + (dx / n) * distancia, o[1] + (dz / n) * distancia];
  };

  // Quem segura o quê no começo (objeto de mão com "perto")
  objetos.forEach((o, i) => {
    if (o.naMao && o.perto) posses.push({ quadro: 0, objeto: i, dono: o.perto });
  });
  const objetoNaMaoDe = (id: string, quadro: number) => {
    const dono = new Map<number, string>();
    for (const p of [...posses].sort((a, b) => a.quadro - b.quadro)) if (p.quadro <= quadro) dono.set(p.objeto, p.dono);
    for (const [obj, quem] of dono) if (quem === id) return obj;
    return null;
  };

  cenas.forEach((cena, n) => {
    const eventos: Evento[] = [];
    let ordem = 0;
    const no = (quadro: number, fazer: () => void) => eventos.push({ quadro, ordem: ordem++, fazer });
    const comeco = n === 0 ? 0 : cena.inicio;
    // A antecipação nunca passa para a cena anterior (o gesto começava antes do corte)
    const naCena = (q: number) => Math.max(comeco, q);

    // 1. Os estados da cena: valem desde o corte (quem não tem, continua como estava)
    for (const id of Object.keys(trilhas)) {
      const est = id === "multidao" ? cena.multidao : cena.estados?.[id];
      if (!est) {
        if (n === 0) no(0, () => chave(id, 0, "normal", "neutra"));
        continue;
      }
      no(comeco, () => chave(id, comeco, est.pose, est.expressao, n === 0 ? 1 : 12));
      if (est.ate && id !== "multidao") {
        const ate = est.ate;
        no(comeco + 3, () => {
          andar(id, cena.inicio + 3, ate, false, cena.fim - 4);
        });
      }
    }
    // 2. As trocas no meio da cena (segundos)
    for (const m of cena.mudancas ?? []) {
      const q = Math.min(cena.fim - 2, cena.inicio + Math.round(m.em * FPS));
      no(naCena(q - 3), () => chave(m.quem, naCena(q - 3), m.pose, m.expressao, 10, true));
    }
    // 3. As ações na palavra
    for (const a of cena.acoes ?? []) {
      const q = quadroDaAcao(cena, a.em);
      if (q === null) {
        avisos.push(`a ação "${a.acao}" de ${a.quem} espera a palavra "${a.em}", que não está na fala da cena ${n + 1}`);
        continue;
      }
      if (!trilhas[a.quem]) {
        avisos.push(`a ação "${a.acao}" é de "${a.quem}", que não está em personagens`);
        continue;
      }
      const id = a.quem;
      const expr = () => a.expressao ?? EXPRESSAO_DA_ACAO[a.acao] ?? agora[id].expressao;
      switch (a.acao) {
        case "andar":
        case "correr": {
          no(q, () => {
            const destino = a.ate ?? (a.para && trilhas[a.para] ? pertoDe(a.para, ondeEsta(id, q), q, 1.2) : null);
            if (!destino) {
              avisos.push(`"${a.acao}" de ${id} na cena ${n + 1} sem "ate" nem "para"`);
              return;
            }
            // Quem anda ou corre baixa os braços levantados (antes, eles voltavam para cima no fim da corrida)
            if (a.acao === "correr" || BRACOS_PARA_CIMA.has(agora[id].pose)) chave(id, q, "normal", agora[id].expressao, 12);
            andar(id, q, destino, a.acao === "correr", cena.fim - 2);
            if (a.expressao) chave(id, q, agora[id].pose, a.expressao, 10);
          });
          break;
        }
        case "virar":
          no(q, () => girar(id, q - 4, a.para === "costas" ? "costas" : a.para === "frente" || !a.para ? "frente" : { id: a.para }, cena.fim));
          break;
        case "olhar":
          no(q, () => olhar(id, q - 4, a.para === "cima" || a.para === "baixo" ? a.para : a.para ? { id: a.para } : null, cena.fim));
          break;
        case "entregar": {
          const para = a.para;
          if (!para || !trilhas[para]) {
            avisos.push(`"entregar" de ${id} na cena ${n + 1} sem "para" (quem recebe)`);
            break;
          }
          no(q, () => {
            // Chega perto (se precisar) e estica o braço; o objeto passa de mão no meio do gesto
            const de = ondeEsta(id, q);
            const alvo = ondeEsta(para, q);
            const dist = Math.hypot(de[0] - alvo[0], de[1] - alvo[1]);
            let comeco = naCena(q - ANTECIPA);
            if (dist > 1.3) {
              const destino = pertoDe(para, de, q, 1.0);
              const dur = Math.round((Math.hypot(destino[0] - de[0], destino[1] - de[1]) / ANDANDO) * FPS);
              const inicio = Math.max(cena.inicio + 2, q - ANTECIPA - dur);
              comeco = andar(id, inicio, destino, false, q - ANTECIPA + 4);
            }
            const volta = agora[id].pose;
            const voltaDo = agora[para].pose;
            girar(id, comeco - 8, { id: para }, Math.min(cena.fim, q + 75));
            girar(para, comeco - 8, { id }, Math.min(cena.fim, q + 75));
            chave(id, comeco, "entregar", expr(), 12);
            chave(para, comeco + 2, "receber", agora[para].expressao, 12);
            const obj = a.objeto !== undefined ? objetos.findIndex((o) => o.tipo === a.objeto) : (objetoNaMaoDe(id, q) ?? -1);
            if (obj >= 0) posses.push({ quadro: comeco + 16, objeto: obj, dono: para });
            else avisos.push(`"entregar" de ${id} na cena ${n + 1}: nenhum objeto na mão (ponha "objeto" ou um objeto com "naMao" e "perto": "${id}")`);
            chave(id, comeco + 30, volta === "entregar" ? "normal" : volta, agora[id].expressao, 14);
            chave(para, comeco + 30, voltaDo === "receber" ? "mostrar" : "mostrar", agora[para].expressao, 14);
          });
          break;
        }
        case "abracar":
        case "abraco": {
          const para = a.para;
          if (!para || !trilhas[para]) {
            // Sem "para": só a pose de abraço (o jeito antigo)
            no(naCena(q - ANTECIPA), () => chave(id, naCena(q - ANTECIPA), "abraco", expr()));
            break;
          }
          no(q, () => {
            const de = ondeEsta(id, q);
            const destino = pertoDe(para, de, q, 0.68);
            const dur = Math.round((Math.hypot(destino[0] - de[0], destino[1] - de[1]) / ANDANDO) * FPS);
            const inicio = Math.max(cena.inicio + 2, q - 2 - dur);
            const chegou = andar(id, inicio, destino, false, q + 6);
            girar(id, chegou - 6, { id: para }, cena.fim + 1);
            girar(para, inicio, { id }, cena.fim + 1);
            chave(id, naCena(chegou - 10), "abraco", expr(), 14);
            chave(para, naCena(chegou - 8), "abraco", a.expressao ?? agora[para].expressao, 14);
          });
          break;
        }
        case "assustar":
          no(naCena(q - ANTECIPA), () => {
            chave(id, naCena(q - ANTECIPA), "assustar", expr(), 7);
            // Um passo para trás (sem virar de costas)
            const de = ondeEsta(id, q);
            const outros = Object.keys(trilhas).filter((o) => o !== id && o !== "multidao");
            const perto = outros.map((o) => ondeEsta(o, q)).sort((x, y) => Math.hypot(x[0] - de[0], x[1] - de[1]) - Math.hypot(y[0] - de[0], y[1] - de[1]))[0];
            const dx = perto ? de[0] - perto[0] : 0;
            const dz = perto ? de[1] - perto[1] : -1;
            const nn = Math.hypot(dx, dz) || 1;
            andar(id, naCena(q - ANTECIPA), [de[0] + (dx / nn) * 0.35, de[1] + (dz / nn) * 0.35], false, q + 10, false);
          });
          break;
        default: {
          if (!posturaDaAcao(a.acao)) {
            avisos.push(`a ação "${a.acao}" não existe`);
            break;
          }
          const inicio = naCena(q - ANTECIPA - (TRANSICAO[a.acao] && TRANSICAO[a.acao] > 12 ? 6 : 0));
          no(inicio, () => chave(id, inicio, a.acao, expr(), undefined, true));
        }
      }
    }
    eventos.sort((x, y) => x.quadro - y.quadro || x.ordem - y.ordem);
    for (const e of eventos) e.fazer();
  });

  for (const t of Object.values(trilhas)) {
    t.chaves.sort((a, b) => a.quadro - b.quadro);
    t.movimentos.sort((a, b) => a.inicio - b.inicio);
  }
  posses.sort((a, b) => a.quadro - b.quadro);
  return { trilhas, posses, avisos };
}

/** Quem segura o objeto i no quadro (ou ninguém) */
export function donoNoQuadro(posses: Posse[], objeto: number, quadro: number): { dono: string; desde: number } | null {
  let r: { dono: string; desde: number } | null = null;
  for (const p of posses) if (p.objeto === objeto && p.quadro <= quadro) r = { dono: p.dono, desde: p.quadro };
  return r;
}

/** Para onde o corpo vira (radianos, 0 = de frente para a frente do palco, +z) */
export function rumoBase(id: string, quadro: number, trilhas: Record<string, Trilha>, todos: string[] | ((quadro: number) => string[])): number {
  const principais = typeof todos === "function" ? todos(quadro) : todos;
  const t = trilhas[id];
  if (!t) return 0;
  const aqui = posicaoNoQuadro(t, quadro);
  // De frente para a frente, um pouco virado para quem está junto (o centro dos outros)
  const outros = principais.filter((o) => o !== id).map((o) => posicaoNoQuadro(trilhas[o], quadro).onde);
  let base = 0;
  if (outros.length) {
    const cx = outros.reduce((s, o) => s + o[0], 0) / outros.length;
    const cz = outros.reduce((s, o) => s + o[1], 0) / outros.length;
    const para = Math.atan2(cx - aqui.onde[0], cz - aqui.onde[1]);
    base = giroCurto(0, para, 0.36);
  }
  // Virado para alguém ou de costas (a ação "virar", "entregar", "abraçar")
  const giro = [...t.giros].reverse().find((g) => g.quadro <= quadro && quadro < g.fim);
  if (giro) {
    if (giro.alvo === "frente") base = 0;
    else if (giro.alvo === "costas") base = Math.PI;
    else if (giro.alvo && trilhas[giro.alvo.id]) {
      const o = posicaoNoQuadro(trilhas[giro.alvo.id], quadro).onde;
      base = Math.atan2(o[0] - aqui.onde[0], o[1] - aqui.onde[1]);
    }
  }
  // Andando: de frente para onde vai (a não ser o passo para trás do susto)
  const mov = t.movimentos.find((m) => m.inicio <= quadro && quadro < m.fim);
  if (mov && mov.virar !== false && aqui.rumo !== null) return giroCurto(base, aqui.rumo, Math.min(1, aqui.andando * 1.5));
  return base;
}

/** A média de um ângulo nos últimos n quadros: o giro sai macio, sem pular */
export function anguloSuave(f: (q: number) => number, quadro: number, n = 10): number {
  const primeiro = f(quadro);
  let soma = 0;
  let peso = 0;
  for (let k = 0; k < n; k++) {
    const w = 1 - k / n;
    soma += giroCurto(0, f(quadro - k) - primeiro, 1) * w;
    peso += w;
  }
  return primeiro + soma / peso;
}

/** Um número suave nos últimos n quadros */
export function numeroSuave(f: (q: number) => number, quadro: number, n = 10): number {
  let soma = 0;
  let peso = 0;
  for (let k = 0; k < n; k++) {
    const w = 1 - k / n;
    soma += f(quadro - k) * w;
    peso += w;
  }
  return soma / peso;
}
