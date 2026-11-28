import { useThree } from "@react-three/fiber";
import { loadFont as carregarCaveat } from "@remotion/google-fonts/Caveat";
import React, { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import * as THREE from "three";
import type { Placa } from "../../componentes/rotulos";
import { fontes } from "../../nucleo/marca";
import type { Ambiente } from "./ambientes";
import { Fosco } from "./software";

// A placa do cenário (28/11/2026, "texto na cena"): o nome da cidade numa placa
// verde de estrada, o "CURVA PERIGOSA" amarelo, a placa azul de rua, o letreiro
// de loja e a tábua pintada à mão da fazenda. O texto é desenhado num canvas
// (na fonte da marca; a tábua, em letra de mão) e vira a textura da frente da
// placa. Ela fica de frente para a câmera e é do cenário: entra num corte e fica
// até o lugar mudar (o molde cuida disso).

const { fontFamily: CAVEAT } = carregarCaveat("normal", { subsets: ["latin"], weights: ["700"] });

type Estilo = NonNullable<Placa["estilo"]>;

/** O jeito de cada placa: o tamanho da tábua, a altura do meio dela, os postes e as cores */
const JEITO: Record<Estilo, { w: number; h: number; y: number; postes: number[]; poste: string; fundo: string; borda: string; texto: string; maiusculas: boolean; mao: boolean }> = {
  cidade: { w: 2.8, h: 1.3, y: 2.25, postes: [-0.95, 0.95], poste: "#8E959C", fundo: "#1E6B3A", borda: "#FFFFFF", texto: "#FFFFFF", maiusculas: true, mao: false },
  rua: { w: 1.9, h: 0.55, y: 2.6, postes: [0], poste: "#5C636B", fundo: "#1F4E9A", borda: "#FFFFFF", texto: "#FFFFFF", maiusculas: true, mao: false },
  aviso: { w: 1.8, h: 1.0, y: 1.8, postes: [0], poste: "#8E959C", fundo: "#F2C230", borda: "#1B1B1B", texto: "#1B1B1B", maiusculas: true, mao: false },
  loja: { w: 3.2, h: 0.95, y: 2.35, postes: [-1.3, 1.3], poste: "#6B4A2E", fundo: "#B5352E", borda: "#F4E6C8", texto: "#FFF4DC", maiusculas: true, mao: false },
  madeira: { w: 2.1, h: 0.85, y: 1.35, postes: [-0.8, 0.8], poste: "#6B4A2E", fundo: "#9C6B3E", borda: "#7A5230", texto: "#FFF6E2", maiusculas: false, mao: true },
};

/** O estilo que o lugar pede, quando a equipe não escolheu */
export const estiloDaPlaca = (ambiente: Ambiente): Estilo =>
  ambiente === "serra" ? "aviso" : ambiente === "europa" || ambiente === "moderno" ? "rua" : ambiente === "sertao" || ambiente === "aldeia" || ambiente === "campo" ? "madeira" : "loja";

/** Desenha a frente da placa num canvas: o fundo, a borda, o texto (encolhe até caber) e a linha de baixo */
function desenhar(placa: Placa, estilo: Estilo) {
  const j = JEITO[estilo];
  const W = 1024;
  const H = Math.round((W * j.h) / j.w);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = j.fundo;
  ctx.fillRect(0, 0, W, H);
  // A madeira: os veios das tábuas
  if (estilo === "madeira") {
    for (let k = 1; k < 3; k++) {
      ctx.fillStyle = "rgba(60,35,15,0.35)";
      ctx.fillRect(0, (H * k) / 3 - 3, W, 6);
    }
    ctx.strokeStyle = "rgba(60,35,15,0.18)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 14; k++) {
      ctx.beginPath();
      const y = (k * 37) % H;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(W * 0.3, y + 10, W * 0.6, y - 12, W, y + 4);
      ctx.stroke();
    }
  } else {
    const m = Math.round(H * 0.07);
    ctx.strokeStyle = j.borda;
    ctx.lineWidth = Math.max(8, Math.round(H * 0.045));
    ctx.beginPath();
    ctx.roundRect(m, m, W - 2 * m, H - 2 * m, H * 0.08);
    ctx.stroke();
  }
  const familia = j.mao ? CAVEAT : fontes.titulo;
  const texto = j.maiusculas ? placa.texto.toUpperCase() : placa.texto;
  const linha2 = placa.linha2 ? (j.maiusculas ? placa.linha2.toUpperCase() : placa.linha2) : null;
  const caber = (t: string, maximo: number, largura: number, peso: number) => {
    let tam = maximo;
    ctx.font = `${peso} ${tam}px "${familia}"`;
    while (ctx.measureText(t).width > largura && tam > 20) {
      tam -= 4;
      ctx.font = `${peso} ${tam}px "${familia}"`;
    }
    return tam;
  };
  ctx.fillStyle = j.texto;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const peso = j.mao ? 700 : 800;
  const principal = caber(texto, H * (linha2 ? 0.46 : 0.62), W * 0.84, peso);
  const yTexto = linha2 ? H * 0.42 : H * 0.53;
  ctx.font = `${peso} ${principal}px "${familia}"`;
  ctx.fillText(texto, W / 2, yTexto);
  if (linha2) {
    const menor = caber(linha2, H * 0.22, W * 0.7, j.mao ? 700 : 700);
    ctx.font = `${j.mao ? 700 : 700} ${menor}px "${familia}"`;
    ctx.fillText(linha2, W / 2, H * 0.76);
  }
  return c;
}

/** A placa inteira (postes, tábua e a frente com o texto), em pé no chão em `posicao`, girada `giro` */
export const Placa3D: React.FC<{ placa: Placa; estilo: Estilo; posicao: [number, number, number]; giro: number }> = ({ placa, estilo, posicao, giro }) => {
  const j = JEITO[estilo];
  const [textura, setTextura] = useState<THREE.CanvasTexture | null>(null);
  const [espera] = useState(() => delayRender(`Placa: ${placa.texto}`));
  const { advance } = useThree();
  useEffect(() => {
    const familia = j.mao ? CAVEAT : fontes.titulo;
    let vivo = true;
    document.fonts
      .load(`${j.mao ? 700 : 800} 80px "${familia}"`)
      .catch(() => null)
      .then(() => {
        if (!vivo) return;
        const t = new THREE.CanvasTexture(desenhar(placa, estilo));
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        setTextura(t);
      })
      .catch((erro) => cancelRender(erro));
    return () => {
      vivo = false;
    };
  }, [placa, estilo, j.mao]);
  useEffect(() => {
    if (!textura) return;
    advance(performance.now());
    continueRender(espera);
  }, [textura, espera, advance]);
  // Os postes vão até o alto da tábua (a de rua tem um poste mais alto, com a placa no topo)
  const altoDoPoste = j.y + j.h / 2 + (estilo === "rua" ? 0.15 : 0);
  return (
    <group position={posicao} rotation={[0, giro, 0]}>
      {j.postes.map((x) => (
        <mesh key={x} position={[x, altoDoPoste / 2, -0.06]}>
          {estilo === "madeira" || estilo === "loja" ? <boxGeometry args={[0.12, altoDoPoste, 0.12]} /> : <cylinderGeometry args={[0.05, 0.06, altoDoPoste, 8]} />}
          <Fosco color={j.poste} roughness={0.8} flatShading />
        </mesh>
      ))}
      <mesh position={[0, j.y, 0]}>
        <boxGeometry args={[j.w, j.h, 0.06]} />
        <Fosco color={estilo === "madeira" ? "#7A5230" : "#B9BEC4"} roughness={0.8} />
      </mesh>
      {textura && (
        <mesh position={[0, j.y, 0.032]}>
          <planeGeometry args={[j.w, j.h]} />
          <Fosco map={textura} roughness={0.85} emissive="#FFFFFF" emissiveMap={textura} emissiveIntensity={0.28} />
        </mesh>
      )}
    </group>
  );
};

// ---------- O letreiro do fim (28/11/2026) ----------
// No fim "placa" dos vídeos 3D, um letreiro grande do lugar brota do chão atrás
// do elenco, com o logo, a chamada (ctaFinal) e o @ da marca. O jeito vem do
// lugar: tábua de madeira (campo, sertão, aldeia, mar), placa verde de estrada
// (serra), placa azul de rua (praça europeia, moderno) e pedra entalhada
// (deserto, cidade antiga, reino, salão). A linha de baixo vai na cor de
// destaque da marca (na madeira e na pedra, numa faixa, para ler bem).

export type EstiloDoLetreiro = "madeira" | "estrada" | "rua" | "pedra";

export const estiloDoLetreiro = (ambiente: Ambiente): EstiloDoLetreiro =>
  ambiente === "serra" ? "estrada" : ambiente === "europa" || ambiente === "moderno" ? "rua" : ambiente === "deserto" || ambiente === "cidade" || ambiente === "reino" || ambiente === "salao" ? "pedra" : "madeira";

const LETREIRO: Record<EstiloDoLetreiro, { fundo: string; borda: string; texto: string; poste: string; mao: boolean }> = {
  madeira: { fundo: "#9C6B3E", borda: "#6B4A2E", texto: "#FFF6E2", poste: "#6B4A2E", mao: false },
  estrada: { fundo: "#1E6B3A", borda: "#FFFFFF", texto: "#FFFFFF", poste: "#8E959C", mao: false },
  rua: { fundo: "#1F4E9A", borda: "#FFFFFF", texto: "#FFFFFF", poste: "#5C636B", mao: false },
  pedra: { fundo: "#C9B79A", borda: "#9E8B6E", texto: "#4A3B2A", poste: "#B3A182", mao: false },
};

/** Quebra o texto em linhas que cabem em `largura` */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (atual && ctx.measureText(tentativa).width > largura) {
      linhas.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

/** Tira os emojis (a fonte do canvas na nuvem não tem) */
const semEmoji = (t: string) => t.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

function desenharLetreiro(e: { chamada: string; arroba: string; estilo: EstiloDoLetreiro; destaque: string; textoNoDestaque: string; logo: HTMLImageElement | null; inicial: string; proporcao: number }) {
  const j = LETREIRO[e.estilo];
  const W = 1024;
  const H = Math.round(W / e.proporcao);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = j.fundo;
  ctx.fillRect(0, 0, W, H);
  if (e.estilo === "madeira") {
    // As tábuas e os veios
    for (let k = 1; k < 4; k++) {
      ctx.fillStyle = "rgba(60,35,15,0.32)";
      ctx.fillRect(0, (H * k) / 4 - 3, W, 6);
    }
    ctx.strokeStyle = "rgba(60,35,15,0.16)";
    ctx.lineWidth = 3;
    for (let k = 0; k < 22; k++) {
      ctx.beginPath();
      const y = (k * 41) % H;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(W * 0.3, y + 12, W * 0.6, y - 14, W, y + 5);
      ctx.stroke();
    }
  } else if (e.estilo === "pedra") {
    // A pedra: manchas e a moldura entalhada
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(90,70,45,${0.04 + (k % 5) * 0.012})`;
      ctx.beginPath();
      ctx.ellipse((k * 263) % W, (k * 149) % H, 30 + (k % 7) * 14, 18 + (k % 5) * 10, k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(70,55,35,0.55)";
    ctx.lineWidth = 10;
    ctx.strokeRect(28, 28, W - 56, H - 56);
  } else {
    const m = Math.round(H * 0.05);
    ctx.strokeStyle = j.borda;
    ctx.lineWidth = Math.max(10, Math.round(H * 0.03));
    ctx.beginPath();
    ctx.roundRect(m, m, W - 2 * m, H - 2 * m, H * 0.06);
    ctx.stroke();
  }
  const familia = fontes.titulo;
  // O logo no alto, num círculo (sem logo: a inicial na cor de destaque)
  const raio = Math.round(H * 0.13);
  const cy = Math.round(H * 0.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(W / 2, cy, raio, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = e.logo ? "#FFFFFF" : e.destaque;
  ctx.fill();
  if (e.logo) {
    ctx.clip();
    ctx.drawImage(e.logo, W / 2 - raio, cy - raio, raio * 2, raio * 2);
  } else {
    ctx.fillStyle = e.textoNoDestaque;
    ctx.font = `800 ${Math.round(raio * 1.1)}px "${familia}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(e.inicial, W / 2, cy + raio * 0.05);
  }
  ctx.restore();
  ctx.lineWidth = Math.max(6, Math.round(raio * 0.1));
  ctx.strokeStyle = j.borda === "#FFFFFF" ? "#FFFFFF" : "rgba(50,35,20,0.75)";
  ctx.beginPath();
  ctx.arc(W / 2, cy, raio, 0, Math.PI * 2);
  ctx.stroke();

  // A chamada: a maior letra que cabe em até 3 linhas, entre o logo e a faixa do @
  const chamada = semEmoji(e.chamada).toUpperCase();
  const largura = W * 0.84;
  const topo = cy + raio + H * 0.05;
  const faixa = e.arroba ? H * 0.17 : 0;
  const base = H - H * 0.07 - faixa - H * 0.03;
  let tam = Math.round(H * 0.16);
  let linhas: string[] = [];
  for (; tam > 28; tam -= 3) {
    ctx.font = `800 ${tam}px "${familia}"`;
    linhas = quebrar(ctx, chamada, largura);
    if (linhas.length <= 3 && linhas.length * tam * 1.08 <= base - topo && linhas.every((l) => ctx.measureText(l).width <= largura)) break;
  }
  ctx.font = `800 ${tam}px "${familia}"`;
  ctx.fillStyle = j.texto;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const alturaDoBloco = linhas.length * tam * 1.08;
  const y0 = topo + (base - topo - alturaDoBloco) / 2 + tam * 0.54;
  linhas.forEach((l, i) => {
    // A pedra: a letra entalhada (uma luz embaixo)
    if (e.estilo === "pedra") {
      ctx.fillStyle = "rgba(255,245,225,0.55)";
      ctx.fillText(l, W / 2, y0 + i * tam * 1.08 + 3);
      ctx.fillStyle = j.texto;
    }
    ctx.fillText(l, W / 2, y0 + i * tam * 1.08);
  });

  // O @ numa faixa na cor de destaque da marca
  if (e.arroba) {
    ctx.font = `800 ${Math.round(faixa * 0.56)}px "${familia}"`;
    const w = Math.min(W * 0.86, ctx.measureText(e.arroba).width + faixa * 1.1);
    const fy = H - H * 0.07 - faixa;
    ctx.fillStyle = e.destaque;
    ctx.beginPath();
    ctx.roundRect(W / 2 - w / 2, fy, w, faixa, faixa / 2);
    ctx.fill();
    ctx.fillStyle = e.textoNoDestaque;
    ctx.fillText(e.arroba, W / 2, fy + faixa * 0.53, W * 0.82);
  }
  return c;
}

/**
 * O letreiro do fim, em pé no chão em `posicao`. `desde`: quadros desde que o fim
 * começou (ele brota do chão com mola nos primeiros quadros e assenta).
 */
export const LetreiroDoFim3D: React.FC<{
  chamada: string;
  arroba: string;
  estilo: EstiloDoLetreiro;
  destaque: string;
  textoNoDestaque: string;
  logo: string | null;
  inicial: string;
  posicao: [number, number, number];
  largura: number;
  altura: number;
  meio: number;
  desde: number;
}> = ({ chamada, arroba, estilo, destaque, textoNoDestaque, logo, inicial, posicao, largura, altura, meio, desde }) => {
  const j = LETREIRO[estilo];
  const [textura, setTextura] = useState<THREE.CanvasTexture | null>(null);
  const [espera] = useState(() => delayRender(`Letreiro do fim: ${chamada}`));
  const { advance } = useThree();
  useEffect(() => {
    let vivo = true;
    const imagem = new Promise<HTMLImageElement | null>((resolve) => {
      if (!logo) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = logo;
    });
    Promise.all([document.fonts.load(`800 80px "${fontes.titulo}"`).catch(() => null), imagem])
      .then(([, img]) => {
        if (!vivo) return;
        const t = new THREE.CanvasTexture(desenharLetreiro({ chamada, arroba, estilo, destaque, textoNoDestaque, logo: img, inicial, proporcao: largura / altura }));
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        setTextura(t);
      })
      .catch((erro) => cancelRender(erro));
    return () => {
      vivo = false;
    };
  }, [chamada, arroba, estilo, destaque, textoNoDestaque, logo, inicial, largura, altura]);
  useEffect(() => {
    if (!textura) return;
    advance(performance.now());
    continueRender(espera);
  }, [textura, espera, advance]);
  // Brota do chão: cresce com mola (passa um pouco e volta) e balança de leve até assentar
  const t = Math.max(0, desde - 4);
  const cresce = Math.min(1.06, 1 - Math.exp(-t / 5) * Math.cos(t / 3.2));
  const balanca = Math.exp(-t / 14) * Math.sin(t / 2.6) * 0.07;
  const pedra = estilo === "pedra";
  const alto = meio + altura / 2;
  return (
    <group position={posicao} scale={[1, Math.max(0.001, cresce), 1]} rotation={[0, 0, balanca]}>
      {pedra ? (
        // A pedra: um bloco do chão até o alto, mais largo que a face entalhada
        <mesh position={[0, alto / 2 + 0.06, -0.14]}>
          <boxGeometry args={[largura + 0.3, alto + 0.12, 0.26]} />
          <Fosco color={j.poste} roughness={0.95} flatShading />
        </mesh>
      ) : (
        <>
          {[-1, 1].map((lado) => (
            <mesh key={lado} position={[lado * (largura / 2 - 0.22), alto / 2, -0.08]}>
              {estilo === "madeira" ? <boxGeometry args={[0.16, alto, 0.16]} /> : <cylinderGeometry args={[0.065, 0.075, alto, 10]} />}
              <Fosco color={j.poste} roughness={0.8} flatShading />
            </mesh>
          ))}
          <mesh position={[0, meio, -0.01]}>
            <boxGeometry args={[largura + 0.08, altura + 0.08, 0.08]} />
            <Fosco color={estilo === "madeira" ? "#6B4A2E" : "#B9BEC4"} roughness={0.8} />
          </mesh>
        </>
      )}
      {textura && (
        <mesh position={[0, meio, pedra ? 0.008 : 0.035]}>
          <planeGeometry args={[largura, altura]} />
          <Fosco map={textura} roughness={0.85} emissive="#FFFFFF" emissiveMap={textura} emissiveIntensity={0.32} />
        </mesh>
      )}
    </group>
  );
};
