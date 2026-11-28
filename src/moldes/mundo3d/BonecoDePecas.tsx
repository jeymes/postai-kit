import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import type { Traje, Variacao } from "./ambientes";
import type { TestaAgora } from "../../componentes/personagens/MarcaNaTesta";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FALANDO, formaDoRhubarb, TRACO, type Expressao, type FormaDaBoca, type Palavra, type Visual } from "../../componentes/personagens/Boneco";
import { alturaDoQuadril, CORPO, GRAUS, giroDaPerna, giroDoOmbro, type Postura } from "./animacao";

// O "boneco de peças" (18/11/2026; refeito em 27/11/2026): um personagem 3D
// próprio, feito de blocos arredondados (como um brinquedo de encaixar), com as
// cores do elenco (pele, cabelo, roupa, sapato) e o tipo de cabelo. Dicas do
// estilo em GUIA-BONECO-DE-PECAS.md (mesma pasta).
//
// 27/11/2026 (o dono: "tem que ficar igual animação feita em computação
// gráfica"): o boneco ganhou cotovelo, joelho, tronco e pescoço que giram (a
// postura vem pronta de animacao.ts), mão de luva no lugar da bola, luz de
// cinema (material que pega a luz do sol, sombra de verdade e contraluz) no
// lugar do desenho em 3 tons com contorno, celular 3D na mão e as variações de
// roupa. A cabeça continua com a frente reta e o rosto desenhado no canvas.

// Medidas em metros do mundo (o boneco tem 1,75 de altura); as das juntas ficam em CORPO (animacao.ts)
const M = {
  coxa: { l: 0.2, p: 0.22 },
  canela: { l: 0.18, p: 0.2 },
  pe: { l: 0.2, a: 0.09, p: 0.3 },
  tronco: { lCima: 0.6, lBaixo: 0.5, a: 0.62, p: 0.34 },
  braco: { l: 0.14, p: 0.15 },
  antebraco: { l: 0.13, p: 0.14 },
  cabeca: { l: 0.58, a: 0.56, p: 0.52 },
};
/** Do quadril ao pescoço, no tronco */
const PESCOCO = CORPO.pescoco - CORPO.quadril;
const OMBRO_Y = CORPO.ombroY - CORPO.quadril;

const bloco = (l: number, a: number, p: number, raio = 0.06) => new RoundedBoxGeometry(l, a, p, 3, Math.min(raio, l / 2 - 0.001, a / 2 - 0.001, p / 2 - 0.001));

/** Afunila um bloco: a largura (x) e a fundura (z) mudam de baixo para cima */
function afunilar(g: THREE.BufferGeometry, baixo: [number, number], cima: [number, number]) {
  g.computeBoundingBox();
  const caixa = g.boundingBox!;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - caixa.min.y) / (caixa.max.y - caixa.min.y);
    pos.setX(i, pos.getX(i) * (baixo[0] + (cima[0] - baixo[0]) * t));
    pos.setZ(i, pos.getZ(i) * (baixo[1] + (cima[1] - baixo[1]) * t));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// As peças são as mesmas para todos os bonecos: feitas uma vez só (antes, cada boneco fazia as suas)
const GEO = (() => {
  const t = M.tronco;
  return {
    coxa: bloco(M.coxa.l, CORPO.coxa + 0.08, M.coxa.p, 0.07),
    canela: bloco(M.canela.l, CORPO.canela + 0.04, M.canela.p, 0.07),
    // A túnica comprida: a parte de baixo de cada perna, larga (as duas juntas parecem uma barra só)
    barraDaPerna: afunilar(bloco(1, CORPO.canela + 0.06, 1, 0.06), [0.27, 0.27], [0.23, 0.24]),
    coxaDaTunica: afunilar(bloco(1, CORPO.coxa + 0.1, 1, 0.08), [0.25, 0.26], [0.27, 0.28]),
    joelho: new THREE.SphereGeometry(0.095, 16, 12),
    pe: bloco(M.pe.l, M.pe.a, M.pe.p, 0.04),
    troncoCurto: afunilar(bloco(1, t.a + 0.16, 1, 0.12), [t.lBaixo, t.p * 1.08], [t.lCima, t.p]),
    troncoLongo: afunilar(bloco(1, t.a, 1, 0.12), [t.lBaixo, t.p * 1.05], [t.lCima, t.p]),
    saiaLonga: afunilar(bloco(1, 0.46, 1, 0.1), [0.62, 0.44], [0.52, 0.36]),
    saiaCurta: afunilar(bloco(1, 0.24, 1, 0.08), [0.6, 0.42], [0.52, 0.37]),
    colete: afunilar(bloco(1, t.a + 0.02, 1, 0.1), [t.lBaixo + 0.04, t.p * 1.1], [t.lCima + 0.03, t.p + 0.04]),
    cinto: afunilar(bloco(1, 0.08, 1, 0.03), [0.55, 0.38], [0.54, 0.37]),
    barra: afunilar(bloco(1, 0.06, 1, 0.03), [0.63, 0.45], [0.62, 0.45]),
    faixa: bloco(0.12, 0.86, 0.04, 0.02),
    braco: bloco(M.braco.l, CORPO.bracoCima + 0.06, M.braco.p, 0.06),
    antebraco: bloco(M.antebraco.l, CORPO.antebraco + 0.05, M.antebraco.p, 0.06),
    cotovelo: new THREE.SphereGeometry(0.07, 14, 10),
    manga: bloco(M.braco.l + 0.04, CORPO.bracoCima * 0.6, M.braco.p + 0.04, 0.06),
    mangaLonga: bloco(M.braco.l + 0.035, CORPO.bracoCima + 0.07, M.braco.p + 0.035, 0.06),
    punho: bloco(M.antebraco.l + 0.03, CORPO.antebraco * 0.9, M.antebraco.p + 0.03, 0.06),
    // A mão de luva (palma e dedos juntos) e o polegar
    mao: bloco(0.085, 0.15, 0.13, 0.04),
    polegar: bloco(0.05, 0.08, 0.05, 0.02),
    pescoco: new THREE.CylinderGeometry(0.08, 0.09, 0.12, 16),
    cabeca: bloco(M.cabeca.l, M.cabeca.a, M.cabeca.p, 0.16),
    cabeloTopo: bloco(M.cabeca.l + 0.04, 0.15, M.cabeca.p + 0.04, 0.07),
    cabeloAtras: bloco(M.cabeca.l + 0.05, M.cabeca.a * 0.8, 0.16, 0.07),
    cabeloLongo: bloco(M.cabeca.l + 0.08, 0.62, 0.16, 0.07),
    mecha: bloco(0.08, 0.42, 0.12, 0.035),
    franja: bloco(M.cabeca.l - 0.04, 0.09, 0.06, 0.03),
    coque: new THREE.SphereGeometry(0.13, 20, 14),
    barba: bloco(M.cabeca.l + 0.02, 0.27, 0.14, 0.09),
    tiara: bloco(M.cabeca.l + 0.07, 0.045, M.cabeca.p + 0.07, 0.02),
    pano: bloco(M.cabeca.l + 0.09, 0.26, M.cabeca.p + 0.09, 0.12),
    panoAtras: bloco(M.cabeca.l + 0.1, 0.62, 0.12, 0.05),
    turbante: bloco(M.cabeca.l + 0.1, 0.24, M.cabeca.p + 0.1, 0.11),
    capacete: bloco(M.cabeca.l + 0.08, 0.3, M.cabeca.p + 0.08, 0.13),
    crista: bloco(0.06, 0.12, M.cabeca.p * 0.8, 0.025),
    ponta: bloco(0.07, 0.11, 0.05, 0.02),
    aba: new THREE.CylinderGeometry(0.46, 0.46, 0.035, 28),
    copa: new THREE.CylinderGeometry(0.22, 0.25, 0.17, 24),
    capa: afunilar(bloco(1, 1.0, 1, 0.025), [0.74, 0.05], [0.58, 0.05]),
    capaCurta: afunilar(bloco(1, 0.42, 1, 0.04), [0.78, 0.42], [0.62, 0.38]),
    abaDoVeu: bloco(0.09, 0.56, 0.22, 0.04),
    faixaDoTurbante: bloco(M.cabeca.l + 0.12, 0.07, M.cabeca.p + 0.12, 0.03),
    rosto: new THREE.PlaneGeometry(M.cabeca.l * 0.98, M.cabeca.a * 0.98),
    celular: bloco(0.09, 0.17, 0.016, 0.01),
    telaDoCelular: new THREE.PlaneGeometry(0.076, 0.148),
  };
})();

// ---------- Materiais: os que pegam a luz do sol (pele, pano, metal), um por cor ----------
type Tipo = "pele" | "pano" | "cabelo" | "couro" | "metal" | "ouro";
const MATERIAIS = new Map<string, THREE.Material>();
/** Render por software (a nuvem): o boneco não recebe sombra (a sombra de 1 amostra fazia "dentes" no rosto); o chão recebe */
let porSoftware = false;
export const renderPorSoftware = (sim: boolean) => {
  porSoftware = sim;
};
function material(cor: string, tipo: Tipo) {
  const chave = `${cor}|${tipo}`;
  let m = MATERIAIS.get(chave);
  if (!m) {
    const base = { color: new THREE.Color(cor) };
    m =
      tipo === "metal"
        ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.32, metalness: 0.75 })
        : tipo === "ouro"
          ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.28, metalness: 0.85 })
          : new THREE.MeshStandardMaterial({ ...base, roughness: tipo === "pele" ? 0.5 : tipo === "cabelo" ? 0.62 : tipo === "couro" ? 0.7 : 0.82, metalness: 0 });
    MATERIAIS.set(chave, m);
  }
  return m;
}

const Peca: React.FC<{
  geo: THREE.BufferGeometry;
  cor: string;
  tipo?: Tipo;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}> = ({ geo, cor, tipo = "pano", position, rotation, scale }) => (
  <mesh geometry={geo} material={material(cor, tipo)} position={position} rotation={rotation} scale={scale} castShadow receiveShadow={!porSoftware} />
);

/**
 * A sombra macia de contato embaixo do boneco (a do sol vem do mundo). Por software
 * (a nuvem), o sol não faz sombra: a de contato fica mais escura, para ninguém flutuar.
 */
const texturasDaSombra = new Map<boolean, THREE.CanvasTexture>();
export function sombraMacia(forte = false) {
  const pronta = texturasDaSombra.get(forte);
  if (pronta) return pronta;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(20,16,28,${forte ? 0.78 : 0.55})`);
    g.addColorStop(0.55, `rgba(20,16,28,${forte ? 0.36 : 0.22})`);
    g.addColorStop(1, "rgba(20,16,28,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const textura = new THREE.CanvasTexture(c);
  texturasDaSombra.set(forte, textura);
  return textura;
}

// ---------- O rosto, desenhado no canvas (frente reta da cabeça) ----------
const BOCA_ESCURA = "#5A1F2B";
const LINGUA = "#E0607A";

type Rosto = {
  expressao: Expressao;
  forma: string | null;
  piscando: boolean;
  /** Para onde os olhos olham, em pixels do desenho: [lado, cima] */
  olhos: [number, number];
  lagrimas: boolean;
  barba: string | null;
  oculos: boolean;
};

function sobrancelha(ctx: CanvasRenderingContext2D, x: number, y: number, lado: -1 | 1, inclinaMeio: number, altura: number) {
  // inclinaMeio > 0: a ponta de dentro sobe (preocupada); < 0: desce (brava)
  ctx.beginPath();
  ctx.moveTo(x - lado * 34, y - altura);
  ctx.quadraticCurveTo(x, y - altura - 10, x + lado * 34, y - altura - inclinaMeio);
  ctx.stroke();
}

function desenharRosto(ctx: CanvasRenderingContext2D, r: Rosto) {
  const T = 512;
  ctx.clearRect(0, 0, T, T);
  // Barba: a parte de baixo do rosto na cor do cabelo (cantos redondos como a cabeça); a boca vai por cima
  if (r.barba) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(4, 4, T - 8, T - 8, 140);
    ctx.clip();
    ctx.fillStyle = r.barba;
    ctx.strokeStyle = TRACO;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-10, 250);
    ctx.quadraticCurveTo(120, 330, 256, 312);
    ctx.quadraticCurveTo(392, 330, 522, 250);
    ctx.lineTo(522, 522);
    ctx.lineTo(-10, 522);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = TRACO;
  ctx.fillStyle = TRACO;
  const e = r.expressao;
  const grande = e === "surpresa" || e === "medo";
  const fechadosFelizes = e === "radiante" || e === "aliviada";
  const olhoY = 228;
  // Bochechas
  if (!r.barba || e === "sem-graca") {
    ctx.fillStyle = e === "sem-graca" ? "rgba(255,110,130,0.55)" : "rgba(255,143,163,0.38)";
    for (const x of [130, 382]) {
      ctx.beginPath();
      ctx.ellipse(x, 318, 40, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = TRACO;
  }
  // Olhos
  for (const [x, lado] of [
    [164, -1],
    [348, 1],
  ] as const) {
    if (r.piscando || fechadosFelizes) {
      ctx.lineWidth = 13;
      ctx.beginPath();
      if (fechadosFelizes) ctx.arc(x, olhoY + 14, 26, Math.PI * 1.1, Math.PI * 1.9);
      else {
        ctx.moveTo(x - 26, olhoY + 4);
        ctx.quadraticCurveTo(x, olhoY + 16, x + 26, olhoY + 4);
      }
      ctx.stroke();
    } else {
      const rx = grande ? 34 : 29;
      const ry = grande ? 48 : 41;
      ctx.fillStyle = TRACO;
      ctx.beginPath();
      ctx.ellipse(x + r.olhos[0], olhoY - r.olhos[1], rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x + r.olhos[0] + 9, olhoY - r.olhos[1] - 15, grande ? 12 : 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sobrancelhas
    ctx.lineWidth = 15;
    const [inclina, altura] =
      e === "preocupada" || e === "medo"
        ? [22, e === "medo" ? 84 : 70]
        : e === "brava"
          ? [-24, 58]
          : e === "surpresa"
            ? [0, 92]
            : e === "feliz" || e === "radiante"
              ? [4, 76]
              : [0, 66];
    sobrancelha(ctx, x, olhoY, lado === -1 ? 1 : -1, inclina, altura);
  }
  // Óculos: dois aros redondos
  if (r.oculos) {
    ctx.lineWidth = 9;
    for (const x of [164, 348]) {
      ctx.beginPath();
      ctx.arc(x, olhoY, 52, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(216, olhoY);
    ctx.lineTo(296, olhoY);
    ctx.stroke();
  }
  // Boca: falando (formas do Rhubarb) ou a da expressão
  const bx = 256;
  const by = r.barba ? 352 : 340;
  ctx.lineWidth = 11;
  const bocaAberta = (l: number, a: number, lingua = true, dentes = false) => {
    ctx.fillStyle = BOCA_ESCURA;
    ctx.beginPath();
    ctx.moveTo(bx - l, by);
    ctx.quadraticCurveTo(bx - l, by + a * 1.3, bx, by + a * 1.3);
    ctx.quadraticCurveTo(bx + l, by + a * 1.3, bx + l, by);
    ctx.quadraticCurveTo(bx, by - a * 0.35, bx - l, by);
    ctx.closePath();
    ctx.fill();
    if (lingua && a > 14) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = LINGUA;
      ctx.beginPath();
      ctx.ellipse(bx, by + a * 1.2, l * 0.6, a * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (dentes) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(bx - l * 0.7, by - 2, l * 1.4, Math.min(12, a * 0.5));
    }
    ctx.stroke();
  };
  const linha = (curva: number, l = 34) => {
    ctx.beginPath();
    ctx.moveTo(bx - l, by);
    ctx.quadraticCurveTo(bx, by + curva, bx + l, by);
    ctx.stroke();
  };
  if (r.forma) {
    const f = r.forma;
    if (f === "A") linha(4, 26);
    else if (f === "B" || f === "G") bocaAberta(32, 12, false, true);
    else if (f === "C" || f === "H") bocaAberta(36, 24);
    else if (f === "D") bocaAberta(42, 34);
    else if (f === "E") bocaAberta(26, 26);
    else if (f === "F") bocaAberta(16, 16, false);
    else linha(8, 28);
  } else if (e === "radiante") bocaAberta(48, 30);
  else if (e === "feliz" || e === "aliviada") linha(30, 44);
  else if (e === "surpresa") bocaAberta(20, 22, false);
  else if (e === "medo") bocaAberta(28, 16, false);
  else if (e === "preocupada") linha(-16, 28);
  else if (e === "brava") linha(-6, 34);
  else if (e === "sem-graca") {
    ctx.beginPath();
    ctx.moveTo(bx - 30, by + 4);
    ctx.quadraticCurveTo(bx - 14, by - 8, bx, by + 2);
    ctx.quadraticCurveTo(bx + 14, by + 12, bx + 30, by);
    ctx.stroke();
  } else linha(12, 30);
  // Lágrimas: dois fios azuis descendo dos olhos e uma gota
  if (r.lagrimas) {
    ctx.fillStyle = "rgba(120,190,255,0.9)";
    ctx.strokeStyle = "rgba(70,140,220,0.95)";
    ctx.lineWidth = 4;
    for (const x of [164, 348]) {
      ctx.beginPath();
      ctx.moveTo(x - 10, olhoY + 40);
      ctx.quadraticCurveTo(x - 16, olhoY + 90, x - 8, olhoY + 130);
      ctx.lineTo(x + 6, olhoY + 130);
      ctx.quadraticCurveTo(x + 2, olhoY + 90, x + 8, olhoY + 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - 1, olhoY + 142, 10, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// ---------- Marca na testa (26/11/2026) ----------
/** A luz macia do brilho (um degradê redondo, feito uma vez) */
let texturaDoBrilho: THREE.CanvasTexture | null = null;
function brilhoMacio() {
  if (texturaDoBrilho) return texturaDoBrilho;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,246,200,1)");
    g.addColorStop(0.35, "rgba(255,213,74,0.6)");
    g.addColorStop(1, "rgba(255,213,74,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  texturaDoBrilho = new THREE.CanvasTexture(c);
  texturaDoBrilho.colorSpace = THREE.SRGBColorSpace;
  return texturaDoBrilho;
}

/** O sinal em losango na testa (escuro, ou dourado brilhando) e a luz macia em volta */
const MarcaNaTesta3D: React.FC<{ testa: TestaAgora; y: number; z: number }> = ({ testa, y, z }) => {
  const frame = useCurrentFrame();
  const desde = frame - testa.desde;
  if (desde < 0) return null;
  const entra = Math.min(1, desde / 12);
  const pulso = 0.8 + 0.2 * Math.sin(desde / 7);
  const comMarca = testa.tipo !== "brilho";
  const comBrilho = testa.tipo !== "marca";
  return (
    <group position={[0, y, z]} scale={0.4 + 0.6 * entra}>
      {comBrilho && (
        <>
          <mesh position={[0, 0, -0.002]}>
            <planeGeometry args={[0.26 * pulso, 0.26 * pulso]} />
            <meshBasicMaterial map={brilhoMacio()} transparent opacity={entra} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight position={[0, 0, 0.25]} color="#FFD54A" intensity={0.8 * pulso * entra} distance={1.2} />
        </>
      )}
      {comMarca && (
        <group scale={[0.65, 1, 1]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.06, 0.06]} />
            <meshBasicMaterial color={testa.cor ?? (comBrilho ? "#FFB800" : "#8E1F2A")} transparent opacity={entra} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ---------- O boneco ----------
export type DetalhesDePecas = {
  /** Barba (cor do cabelo) */
  barba?: boolean;
};

/** Tudo o que muda de um quadro para o outro (vem pronto do Mundo3D, calculado em animacao.ts) */
export type EstadoDoBoneco = {
  postura: Postura;
  expressao: Expressao;
  lagrimas: boolean;
  /** O pulinho de reação quando a expressão muda (metros) */
  pulo: number;
  /** O celular na mão direita: com a tela para o rosto ou de costas; a escala faz ele sair do bolso e voltar */
  celular: { modo: "tela" | "costas"; escala: number } | null;
  /** O objeto na mão (direita, 1; esquerda, -1, quando a direita está com o celular) e a escala (entra e sai sem pular) */
  naMao: { objeto: React.ReactNode; escala: number; lado: 1 | -1 } | null;
  /** O balanço do cabelo, do véu e da capa (andando, mais) */
  vento: number;
};

const escurecer = (cor: string, f = 0.72) => "#" + new THREE.Color(cor).multiplyScalar(f).getHexString();

const METAL = "#A7B0BA";
const OURO = "#F2C14E";
const PALHA = "#D9B86A";
const SANDALIA = "#8B5A2B";
const COURO = "#7A5230";

const _qOmbro = new THREE.Quaternion();
const _qCotovelo = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0);

export const BonecoDePecas: React.FC<{
  visual: Visual;
  detalhes?: DetalhesDePecas;
  estado: EstadoDoBoneco;
  palavras: Palavra[];
  boca?: FormaDaBoca[];
  posicao: [number, number, number];
  virar?: number;
  espelhar?: boolean;
  semente?: number;
  /** A roupa e o que vai na cabeça (vêm do lugar da história, ou da equipe) */
  traje: Traje;
  /** Os detalhes da variação de roupa (barra, colete, faixa, capa curta) */
  variacao?: Variacao;
  /** Marca ou brilho na testa (26/11/2026) */
  testa?: TestaAgora | null;
}> = ({ visual, detalhes = {}, estado, palavras, boca, posicao, virar = 0, espelhar = false, semente = 0, traje, variacao = {}, testa }) => {
  const frame = useCurrentFrame();
  const p = estado.postura;

  const falando = palavras.some((q) => q.inicio <= frame && frame < q.fim);
  const forma = boca?.length ? formaDoRhubarb(boca, frame) : falando ? FALANDO[Math.floor(frame / 3) % FALANDO.length] : null;
  // Pisca a cada 3 a 5 s (cada um no seu tempo) e às vezes duas vezes seguidas
  const ciclo = 100 + (semente % 5) * 17;
  const noCiclo = (frame + semente * 37 + 50) % ciclo;
  const piscando = (noCiclo < 4 || (semente % 3 === 0 && noCiclo > 9 && noCiclo < 13)) && estado.expressao !== "radiante" && estado.expressao !== "aliviada";

  const { figurino, acessorio, pano } = traje;
  const longa = figurino === "tunica-longa" || figurino === "manto";
  const moderno = figurino === "moderno";
  const armadura = figurino === "armadura";
  const mangaLonga = Boolean(visual.mangaLonga || variacao.mangaLonga);
  // Roupa antiga de túnica curta: pernas de fora (cor da pele) e sandália
  const corDaPerna = moderno ? visual.calca : visual.pele;
  const corDoPe = moderno ? visual.sapato : SANDALIA;
  const roupa = variacao.roupa ?? visual.roupa;
  const corDoTronco = armadura ? METAL : roupa;

  // O rosto: redesenhado só quando muda
  const { canvas, textura } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, textura: t };
  }, []);
  const olhos: [number, number] = [Math.round(p.olhos[0] * 16 + (estado.expressao === "sem-graca" ? 12 : 0)), Math.round(p.olhos[1] * 20)];
  const chave = `${estado.expressao}|${forma}|${piscando}|${olhos.join(",")}|${estado.lagrimas}`;
  const ultima = React.useRef("");
  if (ultima.current !== chave) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      desenharRosto(ctx, {
        expressao: estado.expressao,
        forma,
        piscando,
        olhos,
        lagrimas: estado.lagrimas,
        barba: detalhes.barba ? visual.cabelo : null,
        oculos: Boolean(visual.oculos),
      });
      textura.needsUpdate = true;
      ultima.current = chave;
    }
  }

  const quadril = alturaDoQuadril(p);
  const c = M.cabeca;
  const penteado = visual.penteado;
  const t = frame / 30;
  // O cabelo comprido, o véu e a capa balançam um pouco atrás do corpo
  const balanco = Math.sin(t * 1.3 + semente) * 0.03 + estado.vento * (0.12 + Math.sin(t * 9 + semente) * 0.05);

  // As pernas: coxa, joelho, canela e pé (o pé fica reto no chão enquanto dá)
  const perna = (lado: 1 | -1) => {
    const pp = lado === 1 ? p.pernaDir : p.pernaEsq;
    const q = giroDaPerna(pp, lado, new THREE.Quaternion());
    const total = pp.joelho - pp.quadril[0];
    const reto = Math.min(1, Math.max(0, 1 - (Math.abs(total) - 40) / 50));
    const corDaCoxa = longa ? roupa : corDaPerna;
    return (
      <group key={lado} position={[lado * CORPO.pernaX, 0, 0]} quaternion={q}>
        <Peca geo={longa ? GEO.coxaDaTunica : GEO.coxa} cor={corDaCoxa} tipo={moderno ? "pano" : longa ? "pano" : "pele"} position={[0, -CORPO.coxa / 2 + 0.03, 0]} />
        <group position={[0, -CORPO.coxa, 0]} rotation={[pp.joelho * GRAUS, 0, 0]}>
          {!longa && <Peca geo={GEO.joelho} cor={corDaPerna} tipo={moderno ? "pano" : "pele"} />}
          <Peca geo={longa ? GEO.barraDaPerna : GEO.canela} cor={longa ? roupa : corDaPerna} tipo={moderno || longa ? "pano" : "pele"} position={[0, -CORPO.canela / 2 + (longa ? -0.01 : 0), 0]} />
          {longa && variacao.barra && <Peca geo={GEO.barra} cor={variacao.barra} position={[0, -CORPO.canela + 0.01, 0]} scale={[0.43, 1, 0.55]} />}
          <group position={[0, -CORPO.canela, 0]} rotation={[-total * GRAUS * reto, 0, 0]}>
            <Peca geo={GEO.pe} cor={corDoPe} tipo="couro" position={[0, -M.pe.a / 2 + 0.005, 0.05]} />
          </group>
        </group>
      </group>
    );
  };

  // Os braços: ombro, cotovelo, antebraço e a mão de luva; na direita, o celular ou o objeto
  const braco = (lado: 1 | -1) => {
    const b = lado === 1 ? p.dir : p.esq;
    const qOmbro = giroDoOmbro(b, lado, new THREE.Quaternion());
    const corDoBraco = mangaLonga ? roupa : visual.pele;
    // O objeto fica de pé (desfaz o giro do ombro e do cotovelo)
    const comObjeto = estado.naMao && estado.naMao.escala > 0.01 && estado.naMao.lado === lado;
    const comCelular = lado === 1 && estado.celular && estado.celular.escala > 0.01;
    const desfaz = comObjeto || comCelular ? _qOmbro.copy(qOmbro).multiply(_qCotovelo.setFromAxisAngle(X, -b.cotovelo * GRAUS)).clone().invert() : null;
    return (
      <group key={lado} position={[lado * CORPO.ombroX, OMBRO_Y + p.ombros, 0]} quaternion={qOmbro}>
        <Peca geo={GEO.braco} cor={corDoBraco} tipo={mangaLonga ? "pano" : "pele"} position={[0, -CORPO.bracoCima / 2 + 0.03, 0]} />
        {!armadura && <Peca geo={mangaLonga ? GEO.mangaLonga : GEO.manga} cor={roupa} position={[0, mangaLonga ? -CORPO.bracoCima / 2 + 0.03 : -CORPO.bracoCima * 0.25 + 0.03, 0]} />}
        {armadura && <Peca geo={GEO.manga} cor={METAL} tipo="metal" position={[0, -CORPO.bracoCima * 0.25 + 0.03, 0]} />}
        <group position={[0, -CORPO.bracoCima, 0]} rotation={[-b.cotovelo * GRAUS, 0, 0]}>
          <Peca geo={GEO.cotovelo} cor={corDoBraco} tipo={mangaLonga ? "pano" : "pele"} />
          <Peca geo={mangaLonga ? GEO.punho : GEO.antebraco} cor={corDoBraco} tipo={mangaLonga ? "pano" : "pele"} position={[0, -CORPO.antebraco / 2, 0]} />
          <group position={[0, -CORPO.antebraco - 0.02, 0]}>
            <Peca geo={GEO.mao} cor={visual.pele} tipo="pele" position={[0, -0.055, 0.01]} />
            <Peca geo={GEO.polegar} cor={visual.pele} tipo="pele" position={[-lado * 0.03, -0.02, 0.075]} rotation={[0.35, 0, lado * 0.3]} />
            {desfaz && comCelular && estado.celular && (
              <group position={[0, -0.05, 0.02]} quaternion={desfaz}>
                {/* Olhando: o celular em pé acima da mão, a tela virada para o rosto; baixado: pendurado na mão, de costas */}
                <group
                  position={estado.celular.modo === "tela" ? [0, 0.075, 0.05] : [0, -0.1, 0.05]}
                  rotation={[estado.celular.modo === "tela" ? 0.55 : 0, estado.celular.modo === "tela" ? 0 : lado * 0.4, 0]}
                  scale={estado.celular.escala}
                >
                  <mesh geometry={GEO.celular} material={material("#1E1A24", "couro")} castShadow />
                  <mesh geometry={GEO.telaDoCelular} position={[0, 0, -0.0085]} rotation={[0, Math.PI, 0]}>
                    <meshStandardMaterial color="#BDEBDD" emissive="#9FE3D0" emissiveIntensity={0.9} roughness={0.3} />
                  </mesh>
                </group>
              </group>
            )}
            {desfaz && comObjeto && estado.naMao && (
              <group position={[0, -0.06, 0.05]} quaternion={desfaz}>
                <group scale={estado.naMao.escala}>{estado.naMao.objeto}</group>
              </group>
            )}
          </group>
        </group>
      </group>
    );
  };

  const corDoCinto = variacao.cinto ?? (armadura ? COURO : visual.sapato);
  return (
    <group position={posicao} rotation={[0, virar, 0]} scale={[espelhar ? -1 : 1, 1, 1]}>
      {/* A sombra de contato embaixo (a do sol vem do mundo) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p.deitado * 0.75, 0.012, 0]} scale={[(1 + p.deitado * 1.4) * (porSoftware ? 1.1 : 1), porSoftware ? 1.1 : 1, 1]} renderOrder={1}>
        <planeGeometry args={[0.95, 0.75]} />
        <meshBasicMaterial map={sombraMacia(porSoftware)} transparent depthWrite={false} />
      </mesh>
      {/* Caído: o corpo inteiro deita de lado, girando nos pés */}
      <group rotation={[0, 0, (-p.deitado * Math.PI) / 2]} position={[0, p.deitado * 0.29, 0]}>
        <group position={[0, quadril + estado.pulo, 0]}>
          {perna(-1)}
          {perna(1)}
          {/* A saia da túnica (comprida ou curta) presa no quadril */}
          {longa && <Peca geo={GEO.saiaLonga} cor={roupa} position={[0, -0.13, 0]} />}
          {!longa && !moderno && <Peca geo={GEO.saiaCurta} cor={armadura ? COURO : roupa} tipo={armadura ? "couro" : "pano"} position={[0, -0.05, 0]} />}
          {!longa && !moderno && variacao.barra && <Peca geo={GEO.barra} cor={variacao.barra} position={[0, -0.155, 0]} scale={[0.97, 1, 0.97]} />}
          <group rotation={new THREE.Euler(p.tronco[0] * GRAUS, p.tronco[1] * GRAUS, p.tronco[2] * GRAUS, "YXZ")}>
            {/* Tronco (a túnica curta cobre o quadril), cinto, colete e faixa */}
            <Peca geo={longa ? GEO.troncoLongo : GEO.troncoCurto} cor={corDoTronco} tipo={armadura ? "metal" : "pano"} position={[0, longa ? M.tronco.a / 2 : (M.tronco.a + 0.16) / 2 - 0.16, 0]} />
            {variacao.colete && !armadura && <Peca geo={GEO.colete} cor={variacao.colete} position={[0, M.tronco.a / 2 + (longa ? 0.005 : -0.02), 0]} scale={[1, 1, 1]} />}
            {!moderno && <Peca geo={GEO.cinto} cor={corDoCinto} tipo="couro" position={[0, longa ? 0.14 : 0.02, 0]} scale={variacao.colete ? [1.08, 1, 1.12] : 1} />}
            {variacao.faixa && !armadura && <Peca geo={GEO.faixa} cor={variacao.faixa} position={[0, 0.32, M.tronco.p / 2 + (variacao.colete ? 0.04 : 0.015)]} rotation={[0, 0, 0.62]} />}
            {/* A capa cai das costas (manto) e a capa curta cobre os ombros */}
            {figurino === "manto" && (
              <group position={[0, 0.6, -M.tronco.p / 2 - 0.03]} rotation={[0.07 + balanco, 0, 0]}>
                <Peca geo={GEO.capa} cor={pano} position={[0, -0.5, -0.02]} />
              </group>
            )}
            {variacao.capaCurta && figurino !== "manto" && <Peca geo={GEO.capaCurta} cor={variacao.capaCurta} position={[0, 0.46, -0.01]} />}
            {braco(-1)}
            {braco(1)}
            {/* Cabeça (gira no pescoço) */}
            <mesh geometry={GEO.pescoco} material={material(visual.pele, "pele")} position={[0, PESCOCO + 0.02, 0]} castShadow />
            <group position={[0, PESCOCO + 0.05, 0]} rotation={new THREE.Euler(p.cabeca[0] * GRAUS, p.cabeca[1] * GRAUS, p.cabeca[2] * GRAUS, "YXZ")}>
              <Peca geo={GEO.cabeca} cor={visual.pele} tipo="pele" position={[0, c.a / 2, 0]} />
              {/* O rosto, na frente reta da cabeça */}
              <mesh geometry={GEO.rosto} position={[0, c.a / 2, c.p / 2 + 0.003]}>
                <meshBasicMaterial map={textura} transparent alphaTest={0.4} toneMapped={false} />
              </mesh>
              {/* Barba: desenhada no rosto e com volume embaixo do queixo */}
              {detalhes.barba && <Peca geo={GEO.barba} cor={visual.cabelo} tipo="cabelo" position={[0, 0.04, c.p / 2 - 0.1]} />}
              {/* Cabelo (o véu, o turbante e o capacete cobrem o de cima) */}
              {acessorio === "veu" ? (
                <>
                  <Peca geo={GEO.pano} cor={pano} position={[0, c.a + 0.03, -0.01]} />
                  <group position={[0, c.a, -c.p / 2 - 0.02]} rotation={[balanco, 0, 0]}>
                    <Peca geo={GEO.panoAtras} cor={pano} position={[0, -0.3, 0]} />
                  </group>
                  {/* As abas do véu caem dos lados do rosto */}
                  {[-1, 1].map((lado) => (
                    <Peca key={lado} geo={GEO.abaDoVeu} cor={pano} position={[lado * (c.l / 2 + 0.04), c.a - 0.28, c.p / 2 - 0.15]} />
                  ))}
                </>
              ) : (
                <>
                  {acessorio !== "turbante" && acessorio !== "capacete" && <Peca geo={GEO.cabeloTopo} cor={visual.cabelo} tipo="cabelo" position={[0, c.a + 0.02, -0.01]} />}
                  <group position={[0, penteado === "ondulado" ? c.a - 0.05 : c.a * 0.9, -c.p / 2 + 0.02]} rotation={[penteado === "ondulado" ? balanco : 0, 0, 0]}>
                    <Peca
                      geo={penteado === "ondulado" ? GEO.cabeloLongo : GEO.cabeloAtras}
                      cor={visual.cabelo}
                      tipo="cabelo"
                      position={[0, penteado === "ondulado" ? -0.31 : c.a * 0.55 - c.a * 0.9, 0]}
                    />
                  </group>
                  {penteado === "ondulado" &&
                    [-1, 1].map((lado) => <Peca key={lado} geo={GEO.mecha} cor={visual.cabelo} tipo="cabelo" position={[lado * (c.l / 2 + 0.01), c.a - 0.24, c.p / 2 - 0.12]} />)}
                  {penteado === "chanel" && acessorio === "nenhum" && <Peca geo={GEO.franja} cor={visual.cabelo} tipo="cabelo" position={[0, c.a - 0.1, c.p / 2 + 0.01]} />}
                  {penteado === "coque" && acessorio === "nenhum" && <Peca geo={GEO.coque} cor={visual.cabelo} tipo="cabelo" position={[0, c.a + 0.08, -0.12]} />}
                </>
              )}
              {acessorio === "turbante" && (
                <>
                  <Peca geo={GEO.turbante} cor={pano} position={[0, c.a + 0.04, -0.01]} />
                  <Peca geo={GEO.faixaDoTurbante} cor={escurecer(pano)} position={[0, c.a - 0.05, -0.01]} />
                </>
              )}
              {acessorio === "capacete" && (
                <>
                  <Peca geo={GEO.capacete} cor={METAL} tipo="metal" position={[0, c.a - 0.02, -0.01]} />
                  <Peca geo={GEO.crista} cor="#B5352E" position={[0, c.a + 0.17, -0.02]} />
                </>
              )}
              {acessorio === "coroa" &&
                [-2, -1, 0, 1, 2].map((k) => <Peca key={k} geo={GEO.ponta} cor={OURO} tipo="ouro" position={[k * 0.11, c.a + 0.1 + (k === 0 ? 0.02 : 0), c.p / 2 - 0.02]} />)}
              {acessorio === "coroa" && <Peca geo={GEO.tiara} cor={OURO} tipo="ouro" position={[0, c.a + 0.04, 0]} />}
              {acessorio === "chapeu" && (
                <>
                  <Peca geo={GEO.aba} cor={PALHA} position={[0, c.a + 0.04, 0]} />
                  <Peca geo={GEO.copa} cor={PALHA} position={[0, c.a + 0.14, 0]} />
                </>
              )}
              {visual.tiara && acessorio === "nenhum" && <Peca geo={GEO.tiara} cor="#E3C28F" position={[0, c.a - 0.07, 0]} />}
              {testa && <MarcaNaTesta3D testa={testa} y={c.a * 0.81} z={c.p / 2 + 0.012} />}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
