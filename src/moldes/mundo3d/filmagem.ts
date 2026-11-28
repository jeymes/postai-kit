import * as THREE from "three";
import { sorteio } from "./animacao.ts";
import { aplicar, distancia, poseDaTomada, projetar, type PoseDaCamera, type Ponto, type Tomada } from "./camera.ts";

// A filmagem (27/11/2026): o que se decide uma vez por tomada, antes de desenhar.
// - O lado da câmera e um ajuste no ângulo, para ninguém do elenco ficar na
//   frente do rosto de quem está no foco.
// - No plano aberto com mais gente, a câmera mira o meio do grupo e abre o
//   bastante para caber todo mundo (antes, quem estava do lado saía cortado).
// - Quem da multidão fica encostado (na tela) em alguém do elenco sai do plano:
//   um soldado parado atrás do Davi parecia "quatro braços" nele.
// - O caminho da câmera: nada de árvore, casa ou pedra entre ela e o foco.
// Tudo aqui é conta pura (sem o quadro de agora): as abas do render calculam igual.

export type TomadaPronta = Tomada & {
  /** Graus a mais no lado */
  ajuste: number;
  /** 1: quem está junto fica à direita do foco (a câmera vai para esse lado) */
  lado: number;
  parceiro: string | null;
  /** Quem entra no meio do plano (o grupo do plano aberto, ou só o foco) */
  grupo: string[];
  escala: number;
  /** Onde a cena acontece (a sombra do sol cobre em volta) */
  centro: [number, number];
  /** Os índices da multidão que saem deste plano */
  escondidos: number[];
};

export type Palco = {
  ids: string[];
  /** Quem está na cena n (o resto não entra no plano) */
  presentesNa: (cena: number) => string[];
  /** O meio do rosto no mundo (sem a vida e sem o balanço da ponte) */
  rostoDe: (id: string, quadro: number) => Ponto;
  pesDe: (id: string, quadro: number) => Ponto;
  /** O meio da multidão ou da ponte (o foco "multidao" ou "ponte") */
  meioDoGrupo: (foco: string) => Ponto | null;
  multidao: Array<[number, number]>;
  alturaDaMultidao: number;
  sozinho: boolean;
  largura: number;
  altura: number;
};

/** O ponto que a câmera mira: o rosto do foco, o meio do grupo ou o meio da multidão */
export function rostoDaTomada(t: Pick<TomadaPronta, "foco" | "grupo" | "plano">, quadro: number, palco: Pick<Palco, "rostoDe" | "meioDoGrupo">): Ponto {
  const grupo = palco.meioDoGrupo(t.foco);
  if (grupo) return grupo;
  if (t.grupo.length <= 1) {
    const r = palco.rostoDe(t.foco, quadro);
    // Detalhe: as mãos, na frente do peito (uns 0,55 m abaixo do rosto)
    if (t.plano === "detalhe") return [r[0], r[1] - 0.6, r[2]];
    return r;
  }
  const soma: Ponto = [0, 0, 0];
  for (const id of t.grupo) {
    const r = palco.rostoDe(id, quadro);
    soma[0] += r[0];
    soma[1] += r[1];
    soma[2] += r[2];
  }
  return [soma[0] / t.grupo.length, soma[1] / t.grupo.length, soma[2] / t.grupo.length];
}

export function poseDaTomadaPronta(t: TomadaPronta, progresso: number, rosto: Ponto, parceiro: Ponto | null, palco: Pick<Palco, "sozinho" | "ids">): PoseDaCamera {
  return poseDaTomada(t, progresso, rosto, { lado: t.lado, ajuste: t.ajuste, escala: t.escala, sozinho: palco.sozinho && t.foco === palco.ids[0], parceiro: t.plano === "ombro" ? parceiro : null });
}

export function prepararTomadas(planos: Tomada[], palco: Palco): TomadaPronta[] {
  const { largura, altura } = palco;
  const teste = new THREE.PerspectiveCamera(40, largura / altura, 0.3, 450);
  const chao = (id: string, q: number): [number, number] => {
    const p = palco.pesDe(id, q);
    return [p[0], p[2]];
  };
  return planos.map((t) => {
    const ids = palco.presentesNa(t.cena);
    const meio = Math.round((t.inicio + t.fim) / 2);
    const doGrupo = palco.meioDoGrupo(t.foco);
    const aqui = doGrupo ? ([doGrupo[0], doGrupo[2]] as [number, number]) : chao(t.foco, meio);
    const perto = doGrupo
      ? []
      : ids
          .filter((o) => o !== t.foco)
          .map((o) => ({ o, d: Math.hypot(chao(o, t.inicio)[0] - aqui[0], chao(o, t.inicio)[1] - aqui[1]) }))
          .sort((a, b) => a.d - b.d);
    const parceiro = perto[0]?.o ?? null;
    // A câmera vai para o lado de quem está junto (como no cinema); sozinho, alterna
    const lado = parceiro ? Math.sign(chao(parceiro, t.inicio)[0] - chao(t.foco, t.inicio)[0]) || t.sentido : t.sentido;
    // "ombro" precisa de alguém a mais de 1,1 m (abraçados, a câmera entraria na cabeça de quem está de costas)
    const longe = parceiro ? Math.hypot(chao(parceiro, meio)[0] - chao(t.foco, meio)[0], chao(parceiro, meio)[1] - chao(t.foco, meio)[1]) : 0;
    const plano = t.plano === "ombro" && (!parceiro || longe < 1.1 || Math.hypot(chao(parceiro, t.fim - 1)[0] - chao(t.foco, t.fim - 1)[0], chao(parceiro, t.fim - 1)[1] - chao(t.foco, t.fim - 1)[1]) < 1.1) ? (parceiro ? "medio" : "close") : t.plano;
    // O plano aberto pega quem está a até 6 m do foco e abre o bastante para caber todos
    let grupo = [t.foco];
    let escala = doGrupo ? 1.9 : 1;
    if (!doGrupo && (plano === "aberto" || plano === "por-cima")) {
      grupo = [t.foco, ...perto.filter((x) => x.d < 6).map((x) => x.o)];
      if (grupo.length > 1) {
        const xs = grupo.map((id) => chao(id, meio)[0]);
        const largo = Math.max(...xs) - Math.min(...xs) + 1.6;
        // A tela tem 0,56 da altura de largura; no aberto cabem 7,6 m de altura
        escala = Math.max(1, largo / (7.6 * 0.5625 * 0.85));
      }
    }
    const pronta: TomadaPronta = { ...t, plano, ajuste: 0, lado, parceiro, grupo, escala, centro: aqui, escondidos: [] };
    const rosto = (q: number) => rostoDaTomada(pronta, q, palco);
    const parceiroRosto = (q: number) => (parceiro ? palco.rostoDe(parceiro, q) : null);
    const filmar = (ajuste: number, k: number, q: number) => aplicar(teste, poseDaTomadaPronta({ ...pronta, ajuste }, k, rosto(q), parceiroRosto(q), palco));

    // Ninguém do elenco pode ficar na frente do rosto do foco: tenta outros ângulos
    const tapado = (ajuste: number) => {
      filmar(ajuste, 0.5, meio);
      const alvo = palco.rostoDe(t.foco, meio);
      const a0 = projetar(teste, alvo, largura, altura);
      const dAlvo = distancia(teste, alvo);
      return ids.some((o) => {
        if (o === t.foco || (plano === "ombro" && o === parceiro) || grupo.includes(o)) return false;
        const r = palco.rostoDe(o, meio);
        if (distancia(teste, r) > dAlvo) return false;
        const c = caixa(teste, r, palco.pesDe(o, meio), largura, altura);
        // Na frente do rosto, ou tão perto da lente que entra enorme e cortado na beira do plano
        const naTela = c.x + c.meia > 0 && c.x - c.meia < largura;
        if (naTela && distancia(teste, r) < Math.max(2.4, dAlvo * 0.7)) return true;
        return Math.abs(a0.x - c.x) < c.meia + 40 && a0.y > c.topo && a0.y < c.pe;
      });
    };
    pronta.ajuste = doGrupo ? 0 : ([0, 12, -12, 22, -22, 32, -32, 45, -45].find((a) => !tapado(a)) ?? 0);

    // A multidão encostada (na tela) em alguém do elenco, na frente ou atrás, sai do plano
    const escondidos = new Set<number>();
    for (const k of [0, 0.5, 1]) {
      const q = Math.round(t.inicio + (t.fim - t.inicio) * k);
      filmar(pronta.ajuste, k, q);
      const caixas = ids.map((o) => caixa(teste, palco.rostoDe(o, q), palco.pesDe(o, q), largura, altura));
      palco.multidao.forEach(([x, z], i) => {
        const base: Ponto = [x, palco.alturaDaMultidao, z];
        const m = caixa(teste, [x, base[1] + 1.46, z], base, largura, altura);
        if (m.d < 1.8) escondidos.add(i);
        for (const c of caixas) if (Math.abs(m.x - c.x) < (m.meia + c.meia) * 1.05 && m.topo < c.pe && m.pe > c.topo) escondidos.add(i);
      });
    }
    pronta.escondidos = [...escondidos].sort((a, b) => a - b);
    return pronta;
  });
}

/** A caixa de alguém na tela: a largura do corpo (uns 0,8 m) na escala de onde ele está */
function caixa(camera: THREE.PerspectiveCamera, rosto: Ponto, pes: Ponto, largura: number, altura: number) {
  const a = projetar(camera, rosto, largura, altura);
  const b = projetar(camera, pes, largura, altura);
  const porMetro = Math.abs(b.y - a.y) / Math.max(0.3, rosto[1] - pes[1]);
  return { x: (a.x + b.x) / 2, topo: a.y - 0.45 * porMetro, pe: b.y, meia: 0.4 * porMetro, d: distancia(camera, rosto) };
}

/** Onde a câmera passa em todas as tomadas: "livre" (true = pode ter árvore, casa ou pedra) e "semGrama" (longe da lente) */
export function caminhoLivre(tomadas: TomadaPronta[], palco: Palco): { livre: (x: number, z: number) => boolean; semGrama: (x: number, z: number) => boolean } {
  const trechos: Array<[number, number, number, number]> = [];
  const teste = new THREE.PerspectiveCamera(40, palco.largura / palco.altura, 0.3, 450);
  for (const t of tomadas) {
    for (const k of [0, 0.5, 1]) {
      const q = Math.round(t.inicio + (t.fim - t.inicio) * k);
      const rosto = rostoDaTomada(t, q, palco);
      aplicar(teste, poseDaTomadaPronta(t, k, rosto, t.parceiro ? palco.rostoDe(t.parceiro, q) : null, palco));
      trechos.push([teste.position.x, teste.position.z, rosto[0], rosto[2]]);
    }
  }
  const livre = (x: number, z: number) =>
    trechos.every(([ax, az, bx, bz]) => {
      const dx = bx - ax;
      const dz = bz - az;
      const n = dx * dx + dz * dz || 1;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / n));
      const d = Math.hypot(ax + dx * u - x, az + dz * u - z);
      return d > (u < 0.25 ? 2.6 : 1.5);
    });
  // A grama: nada a menos de 40% do caminho até o foco (a folha perto da lente fica enorme)
  const semGrama = (x: number, z: number) =>
    trechos.every(([ax, az, bx, bz]) => {
      const dx = bx - ax;
      const dz = bz - az;
      const n = dx * dx + dz * dz || 1;
      const u = ((x - ax) * dx + (z - az) * dz) / n;
      if (u > 0.6) return true;
      const uu = Math.max(0, u);
      return Math.hypot(ax + dx * uu - x, az + dz * uu - z) > 1.2 + Math.sqrt(n) * 0.25;
    });
  return { livre, semGrama };
}

/** O fim da ponte do lado da câmera (Mundo.tsx: PONTE.z2) */
const PONTE_Z2 = -3.4;

// Onde fica cada um da multidão: em fileiras na ponte ou, no chão, atrás do elenco e
// para os lados, nunca bem atrás de alguém do elenco (27/11/2026: um soldado parado
// atrás do Davi parecia dois braços a mais nele)
export function lugaresDaMultidao(quantos: number, naPonte: boolean, elenco: Array<[number, number]>, semente: number): Array<[number, number]> {
  const r = sorteio(41 + (semente % 997));
  if (naPonte)
    return Array.from({ length: quantos }, (_, i) => {
      const fileira = Math.floor(i / 3);
      const coluna = (i % 3) - 1;
      return [coluna * 0.62 + (r() - 0.5) * 0.12, PONTE_Z2 - 0.5 - fileira * 0.75 + (r() - 0.5) * 0.15];
    });
  const vagas: Array<[number, number, number]> = [];
  for (let fileira = 0; fileira < 6; fileira++)
    for (let coluna = -8; coluna <= 8; coluna++) {
      const x = coluna * 0.74 + (fileira % 2) * 0.37 + (r() - 0.5) * 0.2;
      const z = -1.6 - fileira * 0.85 + (r() - 0.5) * 0.25;
      if (elenco.some(([ex, ez]) => Math.abs(x - ex) < 1.3 && z < ez + 0.5)) continue;
      vagas.push([x, z, Math.abs(x) * 0.5 + fileira * 1.1 + r() * 0.4]);
    }
  return vagas
    .sort((a, b) => a[2] - b[2])
    .slice(0, quantos)
    .map(([x, z]) => [x, z]);
}

