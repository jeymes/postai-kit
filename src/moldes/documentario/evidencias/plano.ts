// Quadro de evidências (modelo "evidencias" do Canal dark): o PLANO do vídeo.
// Sem React: recebe as cenas do roteiro e a proporção de cada foto e devolve
// onde cada peça fica no quadro, quando ela é presa, os barbantes, os sons e o
// caminho da câmera. Mesmo roteiro = mesmo quadro (nada aleatório sem semente).
//
// O quadro é um só, muito maior que a tela. No meio fica a tese (a pergunta do
// vídeo); cada capítulo vira uma "ilha" de peças em volta dela, numa elipse, e
// cada peça nova procura o lugar livre mais perto da ficha do capítulo e da
// peça anterior (as peças nunca se cobrem). A câmera viaja de peça em peça
// (pan + zoom, com um leve afastar no meio das viagens longas), se afasta para
// mostrar a ilha no fim de cada capítulo e o quadro inteiro no fim do vídeo.

import { FPS, QUADROS_DO_ENCERRAMENTO, quadrosDaFala, TEMPOS } from "../../tempos.ts";

export const LARGURA = 1920;
export const ALTURA = 1080;

/** O que o quadro lê de cada cena (os campos do roteiro do Documentario) */
export interface CenaDoQuadro {
  fala: string;
  foto?: string;
  video?: string;
  capitulo?: string;
  texto?: string;
  inteira?: boolean;
  foco?: [number, number] | string;
  detalhe?: [number, number];
  palavra?: string;
  rota?: [number, number][];
  lugares?: string[];
  ligar?: number | number[];
  carimbo?: string;
  ano?: string;
  insert?: "mapa" | "intertitulo" | "acao";
  silhuetas?: string[];
  narracao?: { duracaoSeg: number };
}

export type Camera = { x: number; y: number; z: number };
type Caixa = { x0: number; y0: number; x1: number; y1: number };

export type TipoDePeca = "foto" | "capitulo" | "ano" | "tese";

export interface Peca {
  id: number;
  tipo: TipoDePeca;
  /** Centro da peça no quadro, tamanho e giro (graus) */
  x: number;
  y: number;
  w: number;
  h: number;
  giro: number;
  /** Quadro do vídeo em que a peça é presa; `animar` false: já aparece no lugar */
  aparece: number;
  animar: boolean;
  cena: number;
  ilha: number;
  /** Foto (ou vídeo): o arquivo, a proporção (largura/altura) e o tamanho da foto dentro do cartão */
  src?: string;
  video?: string;
  fotoW?: number;
  fotoH?: number;
  foco?: [number, number];
  numero?: number;
  /** As marcas que a peça ganha (ficam até o fim) */
  /** Etiquetas batidas à máquina (o `texto` das cenas; a mais nova fica por cima) */
  etiquetas?: { texto: string; em: number }[];
  carimbo?: { texto: string; em: number };
  detalhe?: { x: number; y: number; em: number };
  palavra?: { texto: string; em: number };
  /** Ficha de capítulo, cartão de ano, cartão da tese */
  titulo?: string;
  numeroDoCapitulo?: number;
  /** Tese: quando começa a ser batida à máquina */
  digitaEm?: number;
}

export interface Fio {
  de: number;
  ate: number;
  em: number;
}

export interface Trecho {
  de: number;
  ate: number;
  A: Camera;
  B: Camera;
  viagem: boolean;
  /** Quanto a câmera se afasta no meio da viagem (0 a 0,5) */
  mergulho: number;
}

export type TipoDeInsert = "mapa" | "intertitulo" | "acao";
export interface Insert {
  de: number;
  ate: number;
  cena: number;
  tipo: TipoDeInsert;
}

export type SomDoQuadro = "datilografia" | "carimbo" | "risco" | "whoosh" | "projetor";

export interface Plano {
  pecas: Peca[];
  fios: Fio[];
  trechos: Trecho[];
  inserts: Insert[];
  sons: { tipo: SomDoQuadro; em: number }[];
  /** Quadros em que um carimbo bate (a tela treme) */
  tremores: number[];
  total: number;
  /** Onde começa o encerramento (null: sem encerramento) */
  inicioDoFim: number | null;
}

// ---- Medidas das peças (em pontos do quadro: 1 = 1 px com zoom 1) ----

const LADO_DA_DEITADA = 640;
const ALTURA_DA_EM_PE = 600;
export const BORDA_DA_FOTO = 16;
/** A borda de baixo do cartão é mais larga: lá vai o número da evidência */
export const PE_DA_FOTO = 52;
const FICHA = { w: 760, h: 430 };
const ANO = { w: 440, h: 300 };
const TESE = { w: 1320, h: 640 };
/** Espaço livre entre duas peças (os barbantes passam por ele) */
const FOLGA = 80;

/** Número de 0 a 1 que sai sempre igual para a mesma semente */
export function sorteio(semente: string) {
  let h = 2166136261;
  for (let i = 0; i < semente.length; i++) {
    h ^= semente.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return ((h >>> 0) % 100000) / 100000;
}

const cinema = (t: number) => {
  // A mesma curva de cinema do molde (começa e termina devagar)
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

function focoEmPorcento(foco?: [number, number] | string): [number, number] {
  if (Array.isArray(foco)) return foco;
  switch (foco) {
    case "topo":
      return [50, 25];
    case "base":
      return [50, 75];
    case "esquerda":
      return [25, 50];
    case "direita":
      return [75, 50];
    default:
      return [50, 50];
  }
}

/** A caixa (sem giro) que cobre a peça girada */
function caixaDa(p: { x: number; y: number; w: number; h: number; giro: number }, folga = 0): Caixa {
  const r = (p.giro * Math.PI) / 180;
  const meiaL = (Math.abs(Math.cos(r)) * p.w + Math.abs(Math.sin(r)) * p.h) / 2 + folga / 2;
  const meiaA = (Math.abs(Math.sin(r)) * p.w + Math.abs(Math.cos(r)) * p.h) / 2 + folga / 2;
  return { x0: p.x - meiaL, y0: p.y - meiaA, x1: p.x + meiaL, y1: p.y + meiaA };
}

const cruzam = (a: Caixa, b: Caixa) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

function juntar(caixas: Caixa[]): Caixa {
  return caixas.reduce((t, c) => ({ x0: Math.min(t.x0, c.x0), y0: Math.min(t.y0, c.y0), x1: Math.max(t.x1, c.x1), y1: Math.max(t.y1, c.y1) }), {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
  });
}

/**
 * A câmera que mostra a caixa: ocupando `preenche` da tela, com o centro um
 * pouco acima do meio (a legenda fica embaixo, em y 920).
 */
export function enquadrar(c: Caixa, preenche = 0.7, zMax = 1.9): Camera {
  const w = Math.max(1, c.x1 - c.x0);
  const h = Math.max(1, c.y1 - c.y0);
  // A altura útil é a tela menos a faixa da legenda
  const z = Math.min(zMax, (LARGURA * preenche) / w, (900 * preenche) / h);
  const centroNaTela = 450;
  return { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 + (ALTURA / 2 - centroNaTela) / z, z };
}

/** Os pontos candidatos em volta de um centro: espiral de girassol (densidade igual) */
const CANDIDATOS = (() => {
  const lista: [number, number][] = [];
  const ouro = Math.PI * (3 - Math.sqrt(5));
  for (let k = 0; k < 6000; k++) {
    const r = 46 * Math.sqrt(k);
    lista.push([Math.cos(k * ouro) * r, Math.sin(k * ouro) * r]);
  }
  return lista;
})();

/**
 * Acha o lugar livre para uma peça: perto da âncora (a ficha do capítulo) e da
 * peça anterior, sem encostar em nenhuma outra. A distância em y pesa mais: as
 * ilhas crescem deitadas, como a tela.
 */
function lugarLivre(
  peca: { w: number; h: number; giro: number },
  ancora: { x: number; y: number },
  perto: { x: number; y: number } | null,
  ocupadas: Caixa[],
  pesoDoPerto = 0.6,
): { x: number; y: number } {
  const dist = (ax: number, ay: number, b: { x: number; y: number }) => Math.hypot(ax - b.x, (ay - b.y) * 1.35);
  const opcoes = CANDIDATOS.map(([dx, dy], k) => {
    const x = ancora.x + dx;
    const y = ancora.y + dy;
    return { x, y, k, nota: dist(x, y, ancora) + (perto ? pesoDoPerto * dist(x, y, perto) : 0) };
  }).sort((a, b) => a.nota - b.nota || a.k - b.k);
  for (const o of opcoes) {
    const caixa = caixaDa({ ...peca, x: o.x, y: o.y }, FOLGA);
    if (!ocupadas.some((c) => cruzam(c, caixa))) return { x: Math.round(o.x), y: Math.round(o.y) };
  }
  // Não deve acontecer (6000 lugares): vai para longe, à direita de tudo
  const tudo = juntar(ocupadas);
  return { x: tudo.x1 + peca.w, y: ancora.y };
}

/** O tamanho do cartão de uma foto com proporção p (largura/altura) */
function medidasDaFoto(p: number) {
  let fw: number;
  let fh: number;
  if (p >= 1.05) {
    fw = LADO_DA_DEITADA;
    fh = Math.max(300, LADO_DA_DEITADA / p);
  } else if (p <= 0.95) {
    fh = ALTURA_DA_EM_PE;
    fw = Math.max(340, ALTURA_DA_EM_PE * p);
  } else {
    fw = 540;
    fh = 540 / p;
  }
  fw = Math.round(fw);
  fh = Math.round(fh);
  return { fotoW: fw, fotoH: fh, w: fw + 2 * BORDA_DA_FOTO, h: fh + BORDA_DA_FOTO + PE_DA_FOTO };
}

export const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** O ano do cartão: o campo `ano` ou, em começo de capítulo, um ano de 3 ou 4 dígitos no `texto` */
export function anoDaCena(cena: CenaDoQuadro): string | undefined {
  if (cena.ano?.trim()) return cena.ano.trim();
  if (cena.capitulo && cena.texto) {
    const achado = cena.texto.match(/\b(\d{3,4})\b/);
    if (achado) return achado[1];
  }
  return undefined;
}

/** O insert de cinema mudo da cena: o pedido ou, numa cena de rota, o mapa */
export function insertDaCena(cena: CenaDoQuadro): TipoDeInsert | undefined {
  return cena.insert ?? (cena.rota && cena.rota.length >= 2 ? "mapa" : undefined);
}

/** Até onde o insert vai depois do fim da cena (a íris abre de volta para o quadro) */
export const SOBRA_DO_INSERT = 14;

export function planejarQuadro(
  cenas: CenaDoQuadro[],
  opcoes: { tese?: string; encerramento: boolean; proporcoes: ReadonlyMap<string, number> },
): Plano {
  const duracoes = cenas.map((c) => quadrosDaFala(c));
  const inicios: number[] = [];
  duracoes.forEach((d, i) => inicios.push(i === 0 ? 0 : inicios[i - 1] + duracoes[i - 1]));
  const fimDasCenas = inicios.length ? inicios[inicios.length - 1] + duracoes[duracoes.length - 1] : 0;
  const total = fimDasCenas + (opcoes.encerramento ? QUADROS_DO_ENCERRAMENTO : 0);

  // ---- 1. As ilhas (uma por capítulo) e a peça de cada cena ----
  const ilhaDa: number[] = [];
  cenas.forEach((c, i) => ilhaDa.push(i === 0 ? 0 : ilhaDa[i - 1] + (c.capitulo ? 1 : 0)));
  const ilhas = (ilhaDa[ilhaDa.length - 1] ?? 0) + 1;

  const proporcaoDe = (cena: CenaDoQuadro) => {
    if (cena.video) return 16 / 9;
    const p = cena.foto ? opcoes.proporcoes.get(cena.foto) : undefined;
    return p && Number.isFinite(p) && p > 0 ? p : cena.inteira ? 0.75 : 4 / 3;
  };

  type Rascunho = Omit<Peca, "x" | "y" | "aparece" | "animar"> & { x?: number; y?: number };
  const rascunhos: Rascunho[] = [];
  /** A peça de foto de cada cena (a nova, a revisitada ou a da cena anterior) */
  const fotoDaCena: (number | null)[] = [];
  const fichaDaIlha: number[] = [];
  const anoDaCenaId: (number | null)[] = [];
  /** A peça nova de cada cena (null: revisita ou continua a anterior) */
  const novaDaCena: (number | null)[] = [];
  const porArquivoNaIlha = new Map<string, number>();
  const ultimaCopia = new Map<string, number>();
  const ligacoesAutomaticas: { de: number; ate: number; cena: number }[] = [];
  let numero = 0;
  let teseId: number | null = null;
  if (opcoes.tese?.trim()) {
    teseId = rascunhos.length;
    rascunhos.push({ id: teseId, tipo: "tese", ...TESE, giro: -1.2, cena: 0, ilha: -1, titulo: opcoes.tese.trim(), x: 0, y: 0 });
  }
  cenas.forEach((cena, i) => {
    const ilha = ilhaDa[i];
    // Sem capítulo na 1ª cena (o short do CorteVertical): a ilha não tem ficha
    if (cena.capitulo) {
      const id = rascunhos.length;
      fichaDaIlha[ilha] = id;
      rascunhos.push({
        id,
        tipo: "capitulo",
        ...FICHA,
        giro: (sorteio(`ficha-${ilha}`) - 0.5) * 3,
        cena: i,
        ilha,
        titulo: cena.capitulo ?? "",
        numeroDoCapitulo: ilha + 1,
      });
    }
    const arquivo = cena.video ?? cena.foto;
    novaDaCena[i] = null;
    if (arquivo) {
      const chave = `${ilha}|${arquivo}`;
      const ja = porArquivoNaIlha.get(chave);
      if (ja !== undefined) fotoDaCena[i] = ja;
      else {
        const id = rascunhos.length;
        numero += 1;
        const m = medidasDaFoto(proporcaoDe(cena));
        rascunhos.push({
          id,
          tipo: "foto",
          ...m,
          giro: (sorteio(`giro-${i}`) - 0.5) * 6,
          cena: i,
          ilha,
          src: cena.video ? undefined : cena.foto,
          video: cena.video,
          foco: focoEmPorcento(cena.foco),
          numero,
        });
        porArquivoNaIlha.set(chave, id);
        // A mesma imagem já estava em outro capítulo: um barbante liga as duas cópias
        const antes = ultimaCopia.get(arquivo);
        if (antes !== undefined) ligacoesAutomaticas.push({ de: id, ate: antes, cena: i });
        ultimaCopia.set(arquivo, id);
        fotoDaCena[i] = id;
        novaDaCena[i] = id;
      }
    } else fotoDaCena[i] = i > 0 ? fotoDaCena[i - 1] : null;
    const ano = anoDaCena(cena);
    anoDaCenaId[i] = null;
    if (ano) {
      const id = rascunhos.length;
      anoDaCenaId[i] = id;
      rascunhos.push({ id, tipo: "ano", ...ANO, giro: (sorteio(`ano-${i}`) - 0.5) * 5, cena: i, ilha, titulo: ano });
    }
  });

  // ---- 2. Onde fica cada ilha: numa elipse em volta da tese ----
  const areaDaIlha = Array.from({ length: ilhas }, () => 0);
  for (const r of rascunhos) if (r.ilha >= 0) areaDaIlha[r.ilha] += (r.w + FOLGA) * (r.h + FOLGA);
  const raioDa = areaDaIlha.map((a) => Math.sqrt(a / (Math.PI * 0.5)));
  const raioDoMeio = teseId !== null ? 820 : 0;
  const ancoras: { x: number; y: number }[] = [];
  if (ilhas === 1) ancoras.push({ x: teseId !== null ? raioDoMeio + raioDa[0] * 0.8 : 0, y: 0 });
  else {
    // Começa no alto à esquerda e anda no sentido do relógio; aumenta a elipse até ninguém encostar
    const angulo = (k: number) => -Math.PI * 0.8 + (2 * Math.PI * k) / ilhas;
    for (let ry = 400; ry < 40000; ry += 60) {
      const rx = ry * 1.55;
      const pos = raioDa.map((_, k) => ({ x: Math.cos(angulo(k)) * rx, y: Math.sin(angulo(k)) * ry }));
      let cabe = pos.every((p, k) => Math.hypot(p.x, p.y * 1.2) >= raioDa[k] + raioDoMeio + 150);
      for (let a = 0; a < ilhas && cabe; a++)
        for (let b = a + 1; b < ilhas && cabe; b++) if (Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y) < raioDa[a] + raioDa[b] + 120) cabe = false;
      if (cabe) {
        ancoras.push(...pos.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })));
        break;
      }
    }
  }

  // ---- 3. O lugar de cada peça, na ordem em que aparecem ----
  const ocupadas: Caixa[] = [];
  const colocadas = new Map<number, { x: number; y: number }>();
  if (teseId !== null) ocupadas.push(caixaDa({ ...rascunhos[teseId], x: 0, y: 0 }, FOLGA));
  const ultimaDaIlha: ({ x: number; y: number } | null)[] = Array.from({ length: ilhas }, () => null);
  for (const r of rascunhos) {
    if (r.tipo === "tese") {
      colocadas.set(r.id, { x: 0, y: 0 });
      continue;
    }
    let lugar: { x: number; y: number };
    if (r.tipo === "ano") {
      // O cartão do ano fica colado na foto da cena (ou na ficha, se a cena não tem foto nova)
      const dona = fotoDaCena[r.cena] ?? fichaDaIlha[r.ilha];
      const alvo = colocadas.get(dona) ?? ancoras[r.ilha];
      lugar = lugarLivre(r, alvo, null, ocupadas);
    } else if (r.tipo === "capitulo") lugar = lugarLivre(r, ancoras[r.ilha], null, ocupadas);
    else lugar = lugarLivre(r, ancoras[r.ilha], ultimaDaIlha[r.ilha], ocupadas);
    colocadas.set(r.id, lugar);
    ocupadas.push(caixaDa({ ...r, ...lugar }, FOLGA));
    if (r.tipo === "foto") ultimaDaIlha[r.ilha] = lugar;
  }
  const pecas: Peca[] = rascunhos.map((r) => ({ ...r, ...(colocadas.get(r.id) as { x: number; y: number }), aparece: 0, animar: true }));
  const caixaDaPeca = (id: number) => caixaDa(pecas[id]);
  const tudo = juntar(pecas.map((p) => caixaDa(p)));

  // ---- 4. O tempo: paradas da câmera, peças presas, marcas, sons ----
  type Parada = { em: number; alvo: Camera; viagem: number; chegada?: (quadro: number) => void };
  const paradas: Parada[] = [];
  const sons: Plano["sons"] = [];
  const tremores: number[] = [];
  const fios: Fio[] = [];
  const inserts: Insert[] = [];
  let ultimoAlvo: Camera | null = null;
  let livreEm = 0;

  /** Viagem da câmera: mais longa quanto mais longe (em telas) */
  const viagemAte = (alvo: Camera) => {
    if (!ultimoAlvo) return { quadros: 1, telas: 0 };
    const zMenor = Math.min(ultimoAlvo.z, alvo.z);
    const telas = (Math.hypot(alvo.x - ultimoAlvo.x, alvo.y - ultimoAlvo.y) * zMenor) / LARGURA + Math.abs(Math.log(alvo.z / ultimoAlvo.z)) * 0.6;
    return { quadros: Math.round(Math.min(62, Math.max(26, 26 + telas * 13))), telas };
  };
  /** Marca uma parada; devolve o quadro em que a câmera chega */
  const irPara = (em: number, alvo: Camera, quadros?: number) => {
    const inicio = Math.max(em, livreEm);
    const v = viagemAte(alvo);
    const q = quadros ?? v.quadros;
    paradas.push({ em: inicio, alvo, viagem: q });
    if (v.telas > 1.1 && q > 1) sons.push({ tipo: "whoosh", em: inicio });
    ultimoAlvo = alvo;
    livreEm = inicio + q;
    return { inicio, chegada: inicio + q };
  };
  const framePeca = (id: number, preenche = 0.66) => enquadrar(caixaDaPeca(id), preenche);
  /** Revisita: mais perto, num pedaço da foto (o foco ou um lado diferente a cada vez) */
  const framePedaco = (id: number, vez: number, foco?: [number, number]) => {
    const p = pecas[id];
    const lados: [number, number][] = [
      [35, 40],
      [65, 45],
      [50, 60],
      [40, 55],
    ];
    const [fx, fy] = foco ?? lados[vez % lados.length];
    const larg = (p.fotoW ?? p.w) * 0.62;
    const alt = (p.fotoH ?? p.h) * 0.62;
    const r = (p.giro * Math.PI) / 180;
    const lx = ((fx - 50) / 100) * (p.fotoW ?? p.w);
    const ly = ((fy - 50) / 100) * (p.fotoH ?? p.h) - (PE_DA_FOTO - BORDA_DA_FOTO) / 2;
    const cx = p.x + lx * Math.cos(r) - ly * Math.sin(r);
    const cy = p.y + lx * Math.sin(r) + ly * Math.cos(r);
    const meiaL = Math.min(larg, p.w) / 2;
    const meiaA = Math.min(alt, p.h) / 2;
    return enquadrar({ x0: cx - meiaL, y0: cy - meiaA, x1: cx + meiaL, y1: cy + meiaA }, 0.9, 2.6);
  };
  /** Ponto da foto (em %) no quadro */
  const pontoNaFoto = (id: number, px: number, py: number) => {
    const p = pecas[id];
    const r = (p.giro * Math.PI) / 180;
    const lx = ((px - 50) / 100) * (p.fotoW ?? p.w);
    const ly = ((py - 50) / 100) * (p.fotoH ?? p.h) - (PE_DA_FOTO - BORDA_DA_FOTO) / 2;
    return { x: p.x + lx * Math.cos(r) - ly * Math.sin(r), y: p.y + lx * Math.sin(r) + ly * Math.cos(r) };
  };
  const revisitas = new Map<number, number>();

  // As fichas de capítulo ligadas à tese (ou umas às outras, em ordem)
  const ligarFicha = (ilha: number, em: number) => {
    const ficha = fichaDaIlha[ilha];
    if (ficha === undefined) return;
    if (teseId !== null) fios.push({ de: ficha, ate: teseId, em });
    else if (ilha > 0) fios.push({ de: ficha, ate: fichaDaIlha[ilha - 1], em });
  };

  cenas.forEach((cena, i) => {
    const s = inicios[i];
    const d = duracoes[i];
    const e = s + d;
    const ilha = ilhaDa[i];
    const nova = novaDaCena[i];
    const foto = fotoDaCena[i];
    const anoId = anoDaCenaId[i];
    const insert = insertDaCena(cena);
    const prender = (id: number | null | undefined, quando: number, animar = true) => {
      if (id === null || id === undefined) return;
      pecas[id].aparece = Math.max(0, quando);
      pecas[id].animar = animar && quando > 0;
    };
    const enquadrarCena = () => {
      if (foto === null) return fichaDaIlha[ilha] !== undefined ? framePeca(fichaDaIlha[ilha]) : enquadrar(tudo, 0.8);
      if (anoId !== null) return enquadrar(juntar([caixaDaPeca(foto), caixaDaPeca(anoId)]), 0.78);
      if (nova === null && i > 0 && foto === fotoDaCena[i - 1] && !cena.capitulo) {
        const vez = (revisitas.get(foto) ?? 0) + 1;
        revisitas.set(foto, vez);
        return framePedaco(foto, vez, cena.foco ? focoEmPorcento(cena.foco) : undefined);
      }
      if (nova === null) {
        const vez = (revisitas.get(foto) ?? 0) + 1;
        revisitas.set(foto, vez);
        return vez % 2 === 1 ? framePedaco(foto, vez, cena.foco ? focoEmPorcento(cena.foco) : undefined) : framePeca(foto);
      }
      return framePeca(foto);
    };

    // ---- Insert de cinema mudo: a tela fecha em íris e a cena é um filme antigo ----
    if (insert) {
      inserts.push({ de: s, ate: e, cena: i, tipo: insert });
      for (let q = s + 10; q < e - 10; q += 4 * FPS) sons.push({ tipo: "projetor", em: q });
      if (cena.capitulo && i > 0) {
        prender(fichaDaIlha[ilha], s, false);
        ligarFicha(ilha, s);
      } else if (i === 0) {
        prender(fichaDaIlha[0], 0, false);
        if (teseId !== null) {
          prender(teseId, 0, false);
          ligarFicha(0, 0);
        }
      }
      prender(nova, s, false);
      prender(anoId, s, false);
      // Com a tela fechada, a câmera corta para a peça da cena: a íris abre nela
      irPara(Math.max(s, e - 16), enquadrarCena(), 1);
      return;
    }

    // ---- Começo de capítulo: a rede do capítulo que acabou, a ficha nova, a peça ----
    if (i === 0) {
      // O vídeo abre na foto já presa (a miniatura do começo não sai vazia)
      prender(nova, 0, false);
      prender(anoId, 0, false);
      const alvoFoto = enquadrarCena();
      irPara(0, alvoFoto, 1);
      const ficha = fichaDaIlha[0];
      const tese = teseId;
      if (ficha === undefined) {
        if (tese !== null) prender(tese, 0, false);
      } else if (d >= 150) {
        // A ficha do 1º capítulo entra uns 2 s depois do gancho; o barbante sai dela e a
        // câmera vai junto até a tese (a pergunta do vídeo), que é batida à máquina
        const { chegada } = irPara(Math.min(70, d - 120), framePeca(ficha, 0.55));
        prender(ficha, chegada - 16);
        if (tese !== null) {
          prender(tese, chegada);
          ligarFicha(0, chegada + 12);
          const v = irPara(chegada + 30, framePeca(tese, 0.62));
          pecas[tese].digitaEm = v.chegada - 2;
          sons.push({ tipo: "datilografia", em: v.chegada - 2 });
        } else if (e - (chegada + 80) >= 70) irPara(chegada + 80, alvoFoto);
      } else {
        prender(ficha, 0, false);
        if (tese !== null) prender(tese, 0, false);
        ligarFicha(0, 0);
      }
    } else if (cena.capitulo) {
      const ficha = fichaDaIlha[ilha];
      let t = s;
      // A rede do capítulo que acabou (só se a cena tiver tempo para tudo)
      if (d >= 200) {
        const daIlha = pecas.filter((p) => p.ilha === ilha - 1);
        const caixa = juntar([...daIlha.map((p) => caixaDa(p)), ...(teseId !== null ? [caixaDaPeca(teseId)] : [])]);
        const { chegada } = irPara(t, enquadrar(caixa, 0.9), 44);
        t = chegada + 22;
      }
      const { chegada } = irPara(t, framePeca(ficha, 0.6));
      prender(ficha, chegada - 16);
      ligarFicha(ilha, chegada + 6);
      const depoisDaFicha = chegada + 70;
      if (nova !== null || foto !== null) {
        if (e - depoisDaFicha >= 60) {
          const alvo = enquadrarCena();
          const v = irPara(depoisDaFicha, alvo);
          prender(nova, v.inicio + Math.round((v.chegada - v.inicio) * 0.55));
          prender(anoId, v.inicio + Math.round((v.chegada - v.inicio) * 0.7));
          marcas(cena, i, foto, v.chegada, e);
        } else {
          // Sem tempo para ir até a foto: ela já fica presa (a próxima cena passa por ela)
          prender(nova, chegada + 10);
          prender(anoId, chegada + 10);
        }
      }
    } else {
      // ---- Cena comum: a câmera viaja até a peça (nova ou já presa) ----
      const continua = nova === null && foto === fotoDaCena[i - 1] && anoId === null;
      if (continua && !cena.detalhe && !cena.carimbo && !cena.palavra && !cena.ligar) {
        // Mesma imagem, nada novo: a câmera chega mais perto de outro pedaço
        const alvo = enquadrarCena();
        irPara(s, alvo, Math.min(70, Math.max(40, Math.round(d * 0.4))));
      } else {
        const alvo = enquadrarCena();
        const v = irPara(s, alvo);
        prender(nova, v.inicio + Math.round((v.chegada - v.inicio) * 0.55));
        prender(anoId, v.inicio + Math.round((v.chegada - v.inicio) * 0.7));
        marcas(cena, i, foto, v.chegada, e);
      }
    }

    function marcas(c: CenaDoQuadro, indice: number, id: number | null, chegada: number, fim: number) {
      if (id === null) return;
      const p = pecas[id];
      const limite = fim - 20;
      let depois = chegada;
      if (c.texto && p.tipo === "foto") {
        const etiqueta = { texto: c.texto, em: Math.min(chegada + 8, limite) };
        p.etiquetas = [...(p.etiquetas ?? []), etiqueta];
        sons.push({ tipo: "datilografia", em: etiqueta.em });
      }
      if (c.palavra && p.tipo === "foto" && !p.palavra) {
        p.palavra = { texto: c.palavra, em: Math.min(chegada + 14, limite) };
        sons.push({ tipo: "risco", em: p.palavra.em + 14 });
      }
      if (c.detalhe && p.tipo === "foto" && !p.detalhe) {
        const em = Math.min(chegada + 22, limite);
        p.detalhe = { x: c.detalhe[0], y: c.detalhe[1], em };
        sons.push({ tipo: "risco", em });
        // A câmera chega bem perto do detalhe, devagar
        const ponto = pontoNaFoto(id, c.detalhe[0], c.detalhe[1]);
        const meia = Math.min(p.fotoW ?? p.w, p.fotoH ?? p.h) * 0.36;
        if (fim - em > 70) irPara(em + 8, enquadrar({ x0: ponto.x - meia, y0: ponto.y - meia, x1: ponto.x + meia, y1: ponto.y + meia }, 0.9, 2.8), 54);
        depois = em + 30;
      }
      if (c.carimbo && !p.carimbo) {
        const em = Math.min(depois + 28, limite);
        p.carimbo = { texto: c.carimbo, em };
        sons.push({ tipo: "carimbo", em });
        tremores.push(em);
        depois = em + 10;
      }
      const ligar = (Array.isArray(c.ligar) ? c.ligar : c.ligar !== undefined ? [c.ligar] : [])
        .map((n) => n - 1)
        .filter((j) => Number.isInteger(j) && j >= 0 && j < indice);
      const alvos = [...new Set(ligar.map((j) => fotoDaCena[j]).filter((x): x is number => x !== null && x !== id))];
      if (alvos.length) {
        const em = Math.min(depois + 24, limite);
        for (const outra of alvos) fios.push({ de: id, ate: outra, em });
        sons.push({ tipo: "risco", em });
        // A câmera se afasta para mostrar as peças ligadas (se ainda der para ver)
        const caixa = juntar([caixaDaPeca(id), ...alvos.map(caixaDaPeca)]);
        const largo = enquadrar(caixa, 0.86);
        if (largo.z >= 0.3 && fim - em > 60) {
          const v = irPara(em, largo, 44);
          if (fim - (v.chegada + 75) >= 60) irPara(v.chegada + 75, framePeca(id));
        }
      }
    }
  });
  for (const l of ligacoesAutomaticas) fios.push({ de: l.de, ate: l.ate, em: pecas[l.de].aparece + 16 });

  // ---- 5. O fim: o quadro inteiro ----
  const inicioDoFim = opcoes.encerramento ? fimDasCenas : null;
  const geral = enquadrar(tudo, 0.92, 1);
  if (inicioDoFim !== null) irPara(inicioDoFim - 10, geral, 80);
  else if (duracoes.length && duracoes[duracoes.length - 1] > 150) irPara(fimDasCenas - 90, geral, 80);

  // ---- 6. O caminho da câmera: viagem, parada, viagem... (na parada ela chega bem devagar mais perto) ----
  const trechos: Trecho[] = [];
  let atual: Camera = paradas[0]?.alvo ?? enquadrar(tudo);
  let quadro = 0;
  const deriva = (c: Camera, quadros: number): Camera => ({ ...c, z: c.z * (1 + Math.min(0.07, quadros * 0.00022)) });
  paradas.sort((a, b) => a.em - b.em);
  for (const p of paradas) {
    if (p.em > quadro) {
      const B = deriva(atual, p.em - quadro);
      trechos.push({ de: quadro, ate: p.em, A: atual, B, viagem: false, mergulho: 0 });
      atual = B;
      quadro = p.em;
    }
    const zMenor = Math.min(atual.z, p.alvo.z);
    const telas = (Math.hypot(p.alvo.x - atual.x, p.alvo.y - atual.y) * zMenor) / LARGURA;
    trechos.push({ de: quadro, ate: quadro + p.viagem, A: atual, B: p.alvo, viagem: true, mergulho: Math.min(0.45, Math.max(0, (telas - 0.5) * 0.22)) });
    atual = p.alvo;
    quadro += p.viagem;
  }
  trechos.push({ de: quadro, ate: Math.max(quadro + 1, total), A: atual, B: deriva(atual, Math.max(1, total - quadro)), viagem: false, mergulho: 0 });

  // Sons que caem no meio de um insert (a tela fechada) não tocam, só o projetor
  const dentroDeInsert = (q: number) => inserts.some((ins) => q >= ins.de && q < ins.ate + SOBRA_DO_INSERT);
  const sonsFinais = sons.filter((s) => s.tipo === "projetor" || !dentroDeInsert(s.em)).filter((s) => s.em >= 0 && s.em < total);

  return { pecas, fios, trechos, inserts, sons: sonsFinais, tremores, total, inicioDoFim };
}

/** Onde a câmera está num quadro do vídeo */
export function cameraNo(trechos: Trecho[], quadro: number): Camera {
  let lo = 0;
  let hi = trechos.length - 1;
  while (lo < hi) {
    const meio = (lo + hi + 1) >> 1;
    if (trechos[meio].de <= quadro) lo = meio;
    else hi = meio - 1;
  }
  const t = trechos[lo];
  if (!t) return { x: 0, y: 0, z: 1 };
  const bruto = Math.min(1, Math.max(0, (quadro - t.de) / Math.max(1, t.ate - t.de)));
  if (!t.viagem) {
    const p = bruto;
    return { x: t.A.x + (t.B.x - t.A.x) * p, y: t.A.y + (t.B.y - t.A.y) * p, z: t.A.z * Math.pow(t.B.z / t.A.z, p) };
  }
  const p = cinema(bruto);
  // O zoom anda em escala de log (parece constante) e se afasta um pouco no meio da viagem longa
  const z = t.A.z * Math.pow(t.B.z / t.A.z, p) * (1 - t.mergulho * Math.sin(Math.PI * p));
  // O ponto olhado anda de um jeito que o que está na tela não "escorrega" com o zoom
  return { x: t.A.x + (t.B.x - t.A.x) * p, y: t.A.y + (t.B.y - t.A.y) * p, z };
}

/** Tremor da tela quando um carimbo bate (em px da tela) */
export function tremorNo(tremores: number[], quadro: number) {
  let x = 0;
  let y = 0;
  for (const t of tremores) {
    const q = quadro - t;
    if (q < 0 || q > 10) continue;
    const forca = 9 * Math.exp(-q / 3);
    x += Math.sin(q * 2.9) * forca;
    y += Math.cos(q * 3.7) * forca * 0.7;
  }
  return { x, y };
}

/** A caixa do quadro que a câmera vê (com uma margem) */
export function vista(c: Camera, margem = 260): Caixa {
  const meiaL = LARGURA / 2 / c.z + margem;
  const meiaA = ALTURA / 2 / c.z + margem;
  return { x0: c.x - meiaL, y0: c.y - meiaA, x1: c.x + meiaL, y1: c.y + meiaA };
}

export const pecaNaVista = (p: Peca, v: Caixa) => cruzam(caixaDa(p), v);

/**
 * Onde o barbante encosta na peça: no ponto da borda que olha para a outra
 * (a reta entre os centros), um pouco para dentro (o alfinete fica na borda).
 */
export function pontaDoFio(de: Peca, para: Peca) {
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const meiaL = de.w / 2 - 14;
  const meiaA = de.h / 2 - 14;
  const t = Math.min(meiaL / Math.max(1e-6, Math.abs(dx)), meiaA / Math.max(1e-6, Math.abs(dy)));
  return { x: de.x + dx * t, y: de.y + dy * t };
}

export const TEMPO_DO_ANTES_DA_FALA = TEMPOS.antesDaFala;
