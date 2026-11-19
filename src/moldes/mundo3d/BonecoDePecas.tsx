import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import type { Traje } from "./ambientes";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  FALANDO,
  formaDoRhubarb,
  TRACO,
  type Expressao,
  type FormaDaBoca,
  type Momento,
  type Palavra,
  type Pose,
  type Visual,
} from "../../componentes/personagens/Boneco";

// PROTÓTIPO (18/11/2026): o "boneco de peças", um personagem 3D próprio e simples,
// feito de blocos arredondados (como um brinquedo de encaixar). Ele não imita o
// desenho 2D: só pega as cores do elenco (pele, cabelo, roupa, sapato) e o tipo
// de cabelo. Dicas do estilo em GUIA-BONECO-DE-PECAS.md (mesma pasta).
//
// Por que funciona: com formas simples de propósito, cada peça é rígida e gira
// numa junta (ombro, quadril, pescoço); a cabeça tem a frente reta, então o
// rosto (desenhado aqui, no canvas) não distorce; o contorno tem a mesma
// espessura em tudo (casca invertida empurrada pela normal) e a luz tem 3 tons.

// Medidas em metros do mundo (o boneco tem 1,75 de altura, como o palito)
const M = {
  perna: { l: 0.2, a: 0.46, p: 0.22, x: 0.12 },
  pe: { l: 0.21, a: 0.09, p: 0.3 },
  quadril: 0.5,
  tronco: { lCima: 0.6, lBaixo: 0.5, a: 0.6, p: 0.34 },
  ombro: { x: 0.37, y: 1.0 },
  braco: { l: 0.14, c: 0.5, p: 0.15 },
  mao: 0.085,
  pescoco: 1.1,
  cabeca: { l: 0.58, a: 0.56, p: 0.52 },
};
const ESPESSURA = 0.016;

/** A luz em 3 tons, sem degradê (o "cel shading") */
const RAMPA = (() => {
  const dados = new Uint8Array([140, 140, 140, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(dados, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

/** O contorno: a mesma peça, por dentro, empurrada para fora pela normal */
const CONTORNO = (() => {
  const m = new THREE.MeshBasicMaterial({ color: TRACO, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\n  transformed += normalize(normal) * ${ESPESSURA.toFixed(4)};`,
    );
  };
  return m;
})();

const bloco = (l: number, a: number, p: number, raio = 0.06) => new RoundedBoxGeometry(l, a, p, 4, Math.min(raio, l / 2 - 0.001, a / 2 - 0.001, p / 2 - 0.001));

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

const Peca: React.FC<{
  geo: THREE.BufferGeometry;
  cor: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ geo, cor, position, rotation }) => (
  <group position={position} rotation={rotation}>
    <mesh geometry={geo}>
      <meshToonMaterial color={cor} gradientMap={RAMPA} />
    </mesh>
    <mesh geometry={geo} material={CONTORNO} />
  </group>
);

// ---------- Poses: para onde aponta cada braço (no corpo: x para o lado, y para cima, z para a frente) ----------
type Direcao = [number, number, number];
const POSES_DE_PECAS: Record<Pose, { esq: Direcao; dir: Direcao; sentado?: boolean }> = {
  normal: { esq: [-0.12, -1, 0.04], dir: [0.12, -1, 0.04] },
  cintura: { esq: [-0.12, -1, 0.04], dir: [0.75, -0.65, -0.1] },
  celular: { esq: [-0.12, -1, 0.04], dir: [0.05, -0.35, 0.95] },
  cabeca: { esq: [0.45, 0.85, 0.3], dir: [-0.45, 0.85, 0.3] },
  explicando: { esq: [-0.12, -1, 0.04], dir: [0.45, -0.15, 0.88] },
  comemorando: { esq: [-0.55, 0.83, 0.1], dir: [0.55, 0.83, 0.1] },
  pensando: { esq: [0.1, -0.7, 0.7], dir: [-0.45, 0.5, 0.75] },
  sentado: { esq: [-0.1, -0.6, 0.8], dir: [0.1, -0.6, 0.8], sentado: true },
};
const BAIXO = new THREE.Vector3(0, -1, 0);
const giroDoBraco = (d: Direcao) => new THREE.Quaternion().setFromUnitVectors(BAIXO, new THREE.Vector3(...d).normalize());

// ---------- O rosto, desenhado no canvas (frente reta da cabeça) ----------
const BOCA_ESCURA = "#5A1F2B";
const LINGUA = "#E0607A";

type Rosto = {
  expressao: Expressao;
  forma: string | null;
  piscando: boolean;
  olhar: number;
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
      ctx.ellipse(x + r.olhar, olhoY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x + r.olhar + 9, olhoY - 15, grande ? 12 : 10, 0, Math.PI * 2);
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
}

// ---------- O boneco ----------
export type DetalhesDePecas = {
  /** Barba (cor do cabelo) */
  barba?: boolean;
};

const escurecer = (cor: string) => "#" + new THREE.Color(cor).multiplyScalar(0.72).getHexString();

const METAL = "#A7B0BA";
const OURO = "#F2C14E";
const PALHA = "#D9B86A";
const SANDALIA = "#8B5A2B";

export const BonecoDePecas: React.FC<{
  visual: Visual;
  detalhes?: DetalhesDePecas;
  momentos: Momento[];
  palavras: Palavra[];
  boca?: FormaDaBoca[];
  posicao: [number, number, number];
  virar?: number;
  espelhar?: boolean;
  semente?: number;
  /** A roupa e o que vai na cabeça (vêm do lugar da história, ou da equipe) */
  traje: Traje;
  /** Marchando ou andando: pernas e braços balançam */
  andando?: boolean;
}> = ({ visual, detalhes = {}, momentos, palavras, boca, posicao, virar = 0, espelhar = false, semente = 0, traje, andando = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Pose e expressão de agora (a pose muda com mola; pulinho quando a expressão muda)
  let i = 0;
  momentos.forEach((m, k) => {
    if (m.em <= frame) i = k;
  });
  const atual = momentos[i];
  const antes = momentos[Math.max(0, i - 1)];
  const p =
    i === 0
      ? 1
      : spring({
          frame: frame - atual.em,
          fps,
          config: { damping: 13, stiffness: 140 },
        });
  const de = POSES_DE_PECAS[antes.pose];
  const para = POSES_DE_PECAS[atual.pose];
  // Andando: as pernas e os braços balançam (o braço vai para a frente com a perna do outro lado)
  const passo = andando ? Math.sin(frame * 0.38 + semente) * 0.5 : 0;
  const balancoDoBraco = (lado: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lado * passo * 0.7);
  const giroEsq = balancoDoBraco(-1).multiply(giroDoBraco(de.esq).slerp(giroDoBraco(para.esq), p));
  const giroDir = balancoDoBraco(1).multiply(giroDoBraco(de.dir).slerp(giroDoBraco(para.dir), p));
  const desde = frame - atual.em;
  const pulo = i > 0 && antes.expressao !== atual.expressao && desde < 12 ? Math.sin((desde / 12) * Math.PI) * 0.05 : 0;
  const sentado = Boolean(para.sentado);

  const falando = palavras.some((q) => q.inicio <= frame && frame < q.fim);
  const forma = boca?.length ? formaDoRhubarb(boca, frame) : falando ? FALANDO[Math.floor(frame / 3) % FALANDO.length] : null;
  const emFala = palavras.length > 0 && palavras[0].inicio <= frame && frame < palavras[palavras.length - 1].fim + 4;
  const piscando = (frame + semente * 37 + 50) % 97 < 4 && atual.expressao !== "radiante";

  // As peças (feitas uma vez)
  const { figurino, acessorio, pano } = traje;
  const longa = figurino === "tunica-longa" || figurino === "manto";
  const moderno = figurino === "moderno";
  // Roupa antiga de túnica curta: pernas de fora (cor da pele) e sandália
  const corDaPerna = moderno ? visual.calca : visual.pele;
  const corDoPe = moderno ? visual.sapato : SANDALIA;
  const corDoTronco = figurino === "armadura" ? METAL : visual.roupa;
  const geo = useMemo(() => {
    const t = M.tronco;
    return {
      perna: bloco(M.perna.l, M.perna.a, M.perna.p, 0.05),
      pe: bloco(M.pe.l, M.pe.a, M.pe.p, 0.04),
      tronco: afunilar(bloco(1, longa ? t.a : t.a + 0.14, 1, 0.12), [t.lBaixo, t.p * 1.05], [t.lCima, t.p]),
      saia: afunilar(bloco(1, M.quadril + 0.12, 1, 0.1), [0.72, 0.46], [0.52, 0.36]),
      cinto: afunilar(bloco(1, 0.07, 1, 0.03), [0.56, 0.38], [0.55, 0.37]),
      braco: bloco(M.braco.l, M.braco.c, M.braco.p, 0.06),
      manga: bloco(M.braco.l + 0.04, M.braco.c * 0.42, M.braco.p + 0.04, 0.06),
      mao: new THREE.SphereGeometry(M.mao, 20, 14),
      pescoco: new THREE.CylinderGeometry(0.08, 0.09, 0.1, 16),
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
      capa: bloco(0.6, 1.0, 0.05, 0.025),
      abaDoVeu: bloco(0.09, 0.56, 0.22, 0.04),
      faixa: bloco(M.cabeca.l + 0.12, 0.07, M.cabeca.p + 0.12, 0.03),
      rosto: new THREE.PlaneGeometry(M.cabeca.l * 0.98, M.cabeca.a * 0.98),
    };
  }, [longa]);

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
  const olhar = atual.expressao === "sem-graca" ? 12 : 0;
  const chave = `${atual.expressao}|${forma}|${piscando}`;
  const ultima = React.useRef("");
  if (ultima.current !== chave) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      desenharRosto(ctx, {
        expressao: atual.expressao,
        forma,
        piscando,
        olhar,
        barba: detalhes.barba ? visual.cabelo : null,
        oculos: Boolean(visual.oculos),
      });
      textura.needsUpdate = true;
      ultima.current = chave;
    }
  }

  // Vida: respira, a cabeça balança quando fala
  const respira = Math.sin(frame / 14 + semente) * 0.008;
  const inclina = emFala ? Math.sin(frame / 6 + semente) * 0.05 : Math.sin(frame / 40 + semente) * 0.025;
  const acena = emFala ? Math.sin(frame / 9 + semente) * 0.05 : 0;
  const descida = sentado ? M.perna.a * 0.9 : 0;
  const c = M.cabeca;
  const penteado = visual.penteado;
  const sapato = visual.sapato;

  return (
    <group position={[posicao[0], posicao[1] + pulo - descida, posicao[2]]} rotation={[0, virar, 0]} scale={[espelhar ? -1 : 1, 1, 1]}>
      {/* Sombra */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012 + descida, 0]}>
        <circleGeometry args={[0.36, 28]} />
        <meshBasicMaterial color={TRACO} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      {/* Pernas (giram no quadril) e pés */}
      {[-1, 1].map((lado) => (
        <group key={lado} position={[lado * M.perna.x, M.quadril, 0]} rotation={[sentado ? -Math.PI / 2 : 0, 0, 0]}>
          <group rotation={[lado * passo, 0, 0]}>
            {!longa && <Peca geo={geo.perna} cor={corDaPerna} position={[0, -M.perna.a / 2, 0]} />}
            <Peca geo={geo.pe} cor={corDoPe} position={[0, -M.quadril + M.pe.a / 2, 0.05]} />
          </group>
        </group>
      ))}
      {longa && !sentado && <Peca geo={geo.saia} cor={visual.roupa} position={[0, (M.quadril + 0.12) / 2 + 0.02, 0]} />}
      <group position={[0, respira, 0]}>
        {/* Tronco (túnica curta cobre o quadril) e cinto */}
        <Peca geo={geo.tronco} cor={corDoTronco} position={[0, M.quadril + (longa ? M.tronco.a / 2 : M.tronco.a / 2 - 0.07), 0]} />
        {!moderno && <Peca geo={geo.cinto} cor={figurino === "armadura" ? "#6B4A2E" : sapato} position={[0, longa ? M.quadril + 0.14 : M.quadril + 0.02, 0]} />}
        {/* Manto: a capa cai das costas */}
        {figurino === "manto" && <Peca geo={geo.capa} cor={pano} position={[0, 0.58, -M.tronco.p / 2 - 0.05]} rotation={[0.08, 0, 0]} />}
        {/* Braços (giram no ombro): manga da roupa em cima, mão redonda na ponta */}
        {(
          [
            [-1, giroEsq],
            [1, giroDir],
          ] as const
        ).map(([lado, giro]) => (
          <group key={lado} position={[lado * M.ombro.x, M.ombro.y, 0]} quaternion={giro}>
            <Peca geo={geo.braco} cor={visual.mangaLonga ? visual.roupa : visual.pele} position={[0, -M.braco.c / 2 + 0.04, 0]} />
            <Peca geo={geo.manga} cor={visual.roupa} position={[0, -M.braco.c * 0.21 + 0.04, 0]} />
            <Peca geo={geo.mao} cor={visual.pele} position={[0, -M.braco.c + 0.02, 0]} />
          </group>
        ))}
        {/* Cabeça (gira no pescoço) */}
        <mesh geometry={geo.pescoco} position={[0, M.pescoco + 0.02, 0]}>
          <meshToonMaterial color={visual.pele} gradientMap={RAMPA} />
        </mesh>
        <group position={[0, M.pescoco + 0.05, 0]} rotation={[acena, 0, inclina]}>
          <Peca geo={geo.cabeca} cor={visual.pele} position={[0, c.a / 2, 0]} />
          {/* O rosto, na frente reta da cabeça */}
          <mesh geometry={geo.rosto} position={[0, c.a / 2, c.p / 2 + 0.003]}>
            <meshBasicMaterial map={textura} transparent alphaTest={0.4} />
          </mesh>
          {/* Barba: desenhada no rosto e com volume embaixo do queixo */}
          {detalhes.barba && <Peca geo={geo.barba} cor={visual.cabelo} position={[0, 0.04, c.p / 2 - 0.1]} />}
          {/* Cabelo (o véu, o turbante e o capacete cobrem o de cima) */}
          {acessorio === "veu" ? (
            <>
              <Peca geo={geo.pano} cor={pano} position={[0, c.a + 0.03, -0.01]} />
              <Peca geo={geo.panoAtras} cor={pano} position={[0, c.a - 0.3, -c.p / 2 - 0.02]} />
              {/* As abas do véu caem dos lados do rosto */}
              {[-1, 1].map((lado) => (
                <Peca key={lado} geo={geo.abaDoVeu} cor={pano} position={[lado * (c.l / 2 + 0.04), c.a - 0.28, c.p / 2 - 0.15]} />
              ))}
            </>
          ) : (
            <>
              {acessorio !== "turbante" && acessorio !== "capacete" && <Peca geo={geo.cabeloTopo} cor={visual.cabelo} position={[0, c.a + 0.02, -0.01]} />}
              <Peca
                geo={penteado === "ondulado" ? geo.cabeloLongo : geo.cabeloAtras}
                cor={visual.cabelo}
                position={[0, penteado === "ondulado" ? c.a - 0.36 : c.a * 0.55, -c.p / 2 + 0.02]}
              />
              {penteado === "ondulado" &&
                [-1, 1].map((lado) => <Peca key={lado} geo={geo.mecha} cor={visual.cabelo} position={[lado * (c.l / 2 + 0.01), c.a - 0.24, c.p / 2 - 0.12]} />)}
              {penteado === "chanel" && acessorio === "nenhum" && <Peca geo={geo.franja} cor={visual.cabelo} position={[0, c.a - 0.1, c.p / 2 + 0.01]} />}
              {penteado === "coque" && acessorio === "nenhum" && <Peca geo={geo.coque} cor={visual.cabelo} position={[0, c.a + 0.08, -0.12]} />}
            </>
          )}
          {acessorio === "turbante" && (
            <>
              <Peca geo={geo.turbante} cor={pano} position={[0, c.a + 0.04, -0.01]} />
              <Peca geo={geo.faixa} cor={escurecer(pano)} position={[0, c.a - 0.05, -0.01]} />
            </>
          )}
          {acessorio === "capacete" && (
            <>
              <Peca geo={geo.capacete} cor={METAL} position={[0, c.a - 0.02, -0.01]} />
              <Peca geo={geo.crista} cor="#B5352E" position={[0, c.a + 0.17, -0.02]} />
            </>
          )}
          {acessorio === "coroa" &&
            [-2, -1, 0, 1, 2].map((k) => <Peca key={k} geo={geo.ponta} cor={OURO} position={[k * 0.11, c.a + 0.1 + (k === 0 ? 0.02 : 0), c.p / 2 - 0.02]} />)}
          {acessorio === "coroa" && <Peca geo={geo.tiara} cor={OURO} position={[0, c.a + 0.04, 0]} />}
          {acessorio === "chapeu" && (
            <>
              <Peca geo={geo.aba} cor={PALHA} position={[0, c.a + 0.04, 0]} />
              <Peca geo={geo.copa} cor={PALHA} position={[0, c.a + 0.14, 0]} />
            </>
          )}
          {visual.tiara && acessorio === "nenhum" && <Peca geo={geo.tiara} cor="#E3C28F" position={[0, c.a - 0.07, 0]} />}
        </group>
      </group>
    </group>
  );
};
