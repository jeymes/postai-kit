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
