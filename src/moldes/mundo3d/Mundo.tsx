import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// O mundo 3D low-poly do molde Mundo3D (protótipo, 18/11/2026): campo, rio,
// ponte de madeira com cerca, árvores, montanhas, tendas, nuvens e grama.
// Tudo feito aqui, com formas simples (sem baixar modelo nenhum) e sorteio
// com semente fixa: o mesmo quadro sai sempre igual.
//
// Medidas em "metros": o chão é y = 0; o rio corre no eixo x; a ponte cruza o
// rio no x = 0.

export const RIO = { z: -7, largura: 5 };
export const PONTE = { meiaLargura: 1.3, z1: -10.6, z2: -3.4, altura: 0.62 };

/** Sorteio com semente (mulberry32): o mesmo número, a mesma sequência. */
export function sorteio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const Chao: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[400, 400]} />
    <meshStandardMaterial color="#79C24B" roughness={1} />
  </mesh>
);

const Rio: React.FC = () => (
  <group>
    {/* As margens de terra */}
    {[RIO.z - RIO.largura / 2 - 0.25, RIO.z + RIO.largura / 2 + 0.25].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
        <planeGeometry args={[400, 0.8]} />
        <meshStandardMaterial color="#9C8A55" roughness={1} />
      </mesh>
    ))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, RIO.z]}>
      <planeGeometry args={[400, RIO.largura]} />
      <meshStandardMaterial color="#3E8ED8" roughness={0.12} metalness={0.35} />
    </mesh>
  </group>
);

/**
 * A ponte de tábuas com a cerca branca. `balanco`: o quanto ela gira em torno
 * do próprio eixo; `queda` (0 a 1): ela desce para o rio e tomba.
 */
export const Ponte: React.FC<{ balanco: number; queda?: number }> = ({ balanco, queda = 0 }) => {
  const comprimento = PONTE.z2 - PONTE.z1;
  const tabuas = Math.round(comprimento / 0.34);
  return (
    <group position={[0, -queda * 1.1, (PONTE.z1 + PONTE.z2) / 2]} rotation={[queda * 0.22, 0, balanco + queda * 0.18]}>
      {Array.from({ length: tabuas }, (_, i) => (
        <mesh key={i} position={[0, PONTE.altura - 0.06, -comprimento / 2 + 0.17 + i * 0.34]}>
          <boxGeometry args={[PONTE.meiaLargura * 2, 0.12, 0.3]} />
          <meshStandardMaterial color={i % 2 ? "#A8743F" : "#9A6A38"} roughness={0.9} flatShading />
        </mesh>
      ))}
      {/* As vigas embaixo e os pilares no rio */}
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, PONTE.altura - 0.22, 0]}>
          <boxGeometry args={[0.18, 0.2, comprimento]} />
          <meshStandardMaterial color="#7A5530" flatShading />
        </mesh>
      ))}
      {[-2.2, 2.2].flatMap((z) =>
        [-0.9, 0.9].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
            <cylinderGeometry args={[0.12, 0.14, 0.8, 6]} />
            <meshStandardMaterial color="#6E4B29" flatShading />
          </mesh>
        )),
      )}
      {/* A cerca branca dos dois lados */}
      {[-PONTE.meiaLargura + 0.05, PONTE.meiaLargura - 0.05].map((x) => (
        <group key={x}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} position={[x, PONTE.altura + 0.42, -comprimento / 2 + i * (comprimento / 8)]}>
              <boxGeometry args={[0.09, 0.84, 0.09]} />
              <meshStandardMaterial color="#F4F4F0" roughness={0.6} />
            </mesh>
          ))}
          {[0.82, 0.46].map((y) => (
            <mesh key={y} position={[x, PONTE.altura + y, 0]}>
              <boxGeometry args={[0.07, 0.07, comprimento]} />
              <meshStandardMaterial color="#F4F4F0" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const Arvore: React.FC<{ x: number; z: number; escala: number; pinheiro: boolean; tom: number }> = ({ x, z, escala, pinheiro, tom }) => {
  const verde = new THREE.Color().setHSL(0.27 + tom * 0.05, 0.55, 0.32 + tom * 0.1).getStyle();
  return (
    <group position={[x, 0, z]} scale={escala}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.17, 1.2, 6]} />
        <meshStandardMaterial color="#7B5232" flatShading />
      </mesh>
      {pinheiro ? (
        <>
          <mesh position={[0, 1.7, 0]}>
            <coneGeometry args={[0.85, 1.6, 7]} />
            <meshStandardMaterial color={verde} flatShading />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[0.6, 1.2, 7]} />
            <meshStandardMaterial color={verde} flatShading />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 1.75, 0]}>
          <icosahedronGeometry args={[0.95, 0]} />
          <meshStandardMaterial color={verde} flatShading />
        </mesh>
      )}
    </group>
  );
};

/** As árvores: do outro lado do rio e nos lados, longe da ponte e da frente da câmera. */
const Arvores: React.FC = () => {
  const lista = useMemo(() => {
    const r = sorteio(7);
    const arvores: Array<{ x: number; z: number; escala: number; pinheiro: boolean; tom: number }> = [];
    for (let i = 0; i < 90; i++) {
      const longe = i < 60;
      const x = (r() - 0.5) * (longe ? 90 : 60);
      const z = longe ? -12 - r() * 40 : -2 + r() * 22;
      if (Math.abs(x) < (longe ? 3.2 : 7)) continue;
      arvores.push({ x, z, escala: 0.8 + r() * 0.9, pinheiro: r() < 0.35, tom: r() });
    }
    return arvores;
  }, []);
  return (
    <>
      {lista.map((a, i) => (
        <Arvore key={i} {...a} />
      ))}
    </>
  );
};

const Montanhas: React.FC = () => {
  const lista = useMemo(() => {
    const r = sorteio(11);
    return Array.from({ length: 12 }, (_, i) => ({
      x: -110 + i * 20 + (r() - 0.5) * 10,
      z: -75 - r() * 30,
      raio: 14 + r() * 14,
      altura: 16 + r() * 18,
      cor: new THREE.Color().setHSL(0.3 + r() * 0.06, 0.38, 0.38 + r() * 0.12).getStyle(),
    }));
  }, []);
  return (
    <>
      {lista.map((m, i) => (
        <mesh key={i} position={[m.x, m.altura / 2 - 0.5, m.z]}>
          <coneGeometry args={[m.raio, m.altura, 7]} />
          <meshStandardMaterial color={m.cor} flatShading roughness={1} />
        </mesh>
      ))}
    </>
  );
};

const Tenda: React.FC<{ x: number; z: number; cor: string }> = ({ x, z, cor }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.9, 0]}>
      <coneGeometry args={[1.25, 1.8, 10]} />
      <meshStandardMaterial color="#F6F3EA" flatShading />
    </mesh>
    <mesh position={[0, 1.55, 0]}>
      <coneGeometry args={[0.55, 0.7, 10]} />
      <meshStandardMaterial color={cor} flatShading />
    </mesh>
    <mesh position={[0, 2.25, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 1, 5]} />
      <meshStandardMaterial color="#5C4630" />
    </mesh>
    <mesh position={[0.22, 2.6, 0]}>
      <boxGeometry args={[0.42, 0.26, 0.02]} />
      <meshStandardMaterial color={cor} />
    </mesh>
  </group>
);

const Nuvens: React.FC = () => {
  const lista = useMemo(() => {
    const r = sorteio(23);
    return Array.from({ length: 9 }, () => ({
      x: (r() - 0.5) * 120,
      y: 22 + r() * 10,
      z: -50 - r() * 40,
      bolas: Array.from({ length: 4 + Math.floor(r() * 3) }, () => [(r() - 0.5) * 7, (r() - 0.5) * 1.6, (r() - 0.5) * 3, 1.6 + r() * 1.6] as const),
    }));
  }, []);
  return (
    <>
      {lista.map((n, i) => (
        <group key={i} position={[n.x, n.y, n.z]}>
          {n.bolas.map(([x, y, z, raio], j) => (
            <mesh key={j} position={[x, y, z]}>
              <icosahedronGeometry args={[raio, 1]} />
              <meshStandardMaterial color="#FFFFFF" flatShading roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};

/** A grama em 3D: milhares de folhas finas (uma malha só, desenhada de uma vez). */
const Grama: React.FC = () => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const folhas = useMemo(() => {
    const r = sorteio(3);
    const lista: Array<{ x: number; z: number; altura: number; giro: number; inclina: number; cor: THREE.Color }> = [];
    const total = 7000;
    for (let i = 0; i < total; i++) {
      const perto = i < 5200;
      const x = (r() - 0.5) * (perto ? 30 : 40);
      const z = perto ? -4 + r() * 18 : -10 - r() * 14;
      // Nada de grama no rio
      if (Math.abs(z - RIO.z) < RIO.largura / 2 + 0.5) continue;
      lista.push({
        x,
        z,
        altura: 0.25 + r() * 0.35,
        giro: r() * Math.PI * 2,
        inclina: (r() - 0.5) * 0.5,
        cor: new THREE.Color().setHSL(0.26 + r() * 0.06, 0.6, 0.3 + r() * 0.16),
      });
    }
    return lista;
  }, []);
  useLayoutEffect(() => {
    const malha = ref.current;
    if (!malha) return;
    const m = new THREE.Object3D();
    folhas.forEach((f, i) => {
      m.position.set(f.x, f.altura / 2, f.z);
      m.rotation.set(f.inclina, f.giro, f.inclina / 2);
      m.scale.set(1, f.altura / 0.4, 1);
      m.updateMatrix();
      malha.setMatrixAt(i, m.matrix);
      malha.setColorAt(i, f.cor);
    });
    malha.instanceMatrix.needsUpdate = true;
    if (malha.instanceColor) malha.instanceColor.needsUpdate = true;
  }, [folhas]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, folhas.length]}>
      <coneGeometry args={[0.035, 0.4, 3]} />
      <meshStandardMaterial roughness={1} flatShading />
    </instancedMesh>
  );
};

/** O mundo inteiro, com a luz e o céu. */
export const Mundo: React.FC<{ balanco: number; queda?: number; ponte?: boolean; tendas?: boolean }> = ({ balanco, queda = 0, ponte = true, tendas = true }) => (
  <>
    <color attach="background" args={["#9ED2F6"]} />
    <fog attach="fog" args={["#C3E4F8", 45, 170]} />
    <hemisphereLight args={["#E6F4FF", "#557F33", 1.25]} />
    <directionalLight position={[20, 32, 12]} intensity={2.1} />
    <ambientLight intensity={0.25} />
    <Chao />
    <Rio />
    {ponte && <Ponte balanco={balanco} queda={queda} />}
    <Arvores />
    <Montanhas />
    <Nuvens />
    {/* As tendas ficam à esquerda: a câmera do plano aberto vem da direita */}
    {tendas && <Tenda x={-6.8} z={0.4} cor="#3D6FD6" />}
    {tendas && <Tenda x={-9.6} z={2.6} cor="#D64545" />}
    <Grama />
  </>
);
