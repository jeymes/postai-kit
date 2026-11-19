import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PALETAS, type Ambiente, type Paleta } from "./ambientes";

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

const Chao: React.FC<{ cor: string }> = ({ cor }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[400, 400]} />
    <meshStandardMaterial color={cor} roughness={1} />
  </mesh>
);

const Rio: React.FC<{ margem: string }> = ({ margem }) => (
  <group>
    {/* As margens de terra */}
    {[RIO.z - RIO.largura / 2 - 0.25, RIO.z + RIO.largura / 2 + 0.25].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
        <planeGeometry args={[400, 0.8]} />
        <meshStandardMaterial color={margem} roughness={1} />
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

/** A palmeira: o tronco curvo em gomos e as folhas caindo em volta. */
const Palmeira: React.FC<{ x: number; z: number; escala: number; tom: number }> = ({ x, z, escala, tom }) => {
  const verde = new THREE.Color().setHSL(0.25 + tom * 0.05, 0.5, 0.3 + tom * 0.08).getStyle();
  const curva = (tom - 0.5) * 0.5;
  const gomos = 6;
  return (
    <group position={[x, 0, z]} scale={escala}>
      {Array.from({ length: gomos }, (_, i) => (
        <mesh key={i} position={[curva * (i / gomos) ** 2 * 1.6, 0.25 + i * 0.5, 0]} rotation={[0, 0, -curva * (i / gomos) * 0.6]}>
          <cylinderGeometry args={[0.13 - i * 0.008, 0.16 - i * 0.008, 0.52, 7]} />
          <meshStandardMaterial color={i % 2 ? "#8C6A42" : "#7A5A36"} flatShading />
        </mesh>
      ))}
      <group position={[curva * 1.6, gomos * 0.5 + 0.05, 0]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
            <mesh position={[0.75, -0.25, 0]} rotation={[0, 0, -0.55]}>
              <boxGeometry args={[1.6, 0.06, 0.42]} />
              <meshStandardMaterial color={verde} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/** As plantas: do outro lado do rio e nos lados, longe da ponte e da frente da câmera. */
const Arvores: React.FC<{ tipo: Paleta["plantas"]; muitas: boolean }> = ({ tipo, muitas }) => {
  const lista = useMemo(() => {
    const r = sorteio(7);
    const arvores: Array<{ x: number; z: number; escala: number; pinheiro: boolean; tom: number }> = [];
    for (let i = 0; i < 90; i++) {
      const longe = i < 60;
      const x = (r() - 0.5) * (longe ? 90 : 60);
      const z = longe ? -12 - r() * 40 : -2 + r() * 22;
      if (Math.abs(x) < (longe ? 3.2 : 7)) continue;
      const sorteado = { x, z, escala: 0.8 + r() * 0.9, pinheiro: r() < 0.35, tom: r() };
      // Palmeiras e casas pedem menos plantas (o lugar fica mais aberto)
      if (!muitas && i % 3 !== 0) continue;
      arvores.push(sorteado);
    }
    return arvores;
  }, [muitas]);
  return (
    <>
      {lista.map((a, i) =>
        tipo === "palmeiras" ? (
          <Palmeira key={i} x={a.x} z={a.z} escala={a.escala} tom={a.tom} />
        ) : (
          <Arvore key={i} {...a} pinheiro={tipo === "arvores" && a.pinheiro} />
        ),
      )}
    </>
  );
};

/** As montanhas do fundo (no deserto e na cidade, dunas baixas e largas) */
const Montanhas: React.FC<{ cor: Paleta["montanhas"] }> = ({ cor }) => {
  const lista = useMemo(() => {
    const r = sorteio(11);
    return Array.from({ length: 12 }, (_, i) => ({
      x: -110 + i * 20 + (r() - 0.5) * 10,
      z: -75 - r() * 30,
      raio: (cor.baixas ? 24 : 14) + r() * 14,
      altura: (cor.baixas ? 6 : 16) + r() * (cor.baixas ? 8 : 18),
      cor: new THREE.Color().setHSL(cor.matiz + r() * 0.04, cor.saturacao, cor.luz + r() * 0.1).getStyle(),
    }));
  }, [cor]);
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
const Grama: React.FC<{ matiz: number; rio: boolean }> = ({ matiz, rio }) => {
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
      if (rio && Math.abs(z - RIO.z) < RIO.largura / 2 + 0.5) continue;
      lista.push({
        x,
        z,
        altura: 0.25 + r() * 0.35,
        giro: r() * Math.PI * 2,
        inclina: (r() - 0.5) * 0.5,
        cor: new THREE.Color().setHSL(matiz + r() * 0.06, 0.6, 0.3 + r() * 0.16),
      });
    }
    return lista;
  }, [matiz, rio]);
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

/** Uma casa: de barro (teto reto), de palha (telhado de pirâmide) ou colorida (telhado de duas águas). */
const Casa: React.FC<{ x: number; z: number; tipo: NonNullable<Paleta["casas"]>; tom: number; giro: number }> = ({ x, z, tipo, tom, giro }) => {
  const largura = 2.2 + tom * 1.2;
  const altura = tipo === "barro" ? 1.7 + tom * 0.9 : 1.6 + tom * 0.4;
  const fundura = 2 + tom;
  const parede =
    tipo === "barro"
      ? ["#E8D4AA", "#D9BD8C", "#EFE0C0", "#D2B07C"][Math.floor(tom * 4)]
      : tipo === "palha"
        ? ["#C9A77A", "#B89466", "#D4B488"][Math.floor(tom * 3)]
        : ["#F2A65A", "#7FB7E6", "#F28C8C", "#F6E27A", "#9BD48A"][Math.floor(tom * 5)];
  return (
    <group position={[x, 0, z]} rotation={[0, giro, 0]}>
      <mesh position={[0, altura / 2, 0]}>
        <boxGeometry args={[largura, altura, fundura]} />
        <meshStandardMaterial color={parede} flatShading roughness={1} />
      </mesh>
      {/* Porta e janela, na frente */}
      <mesh position={[-largura * 0.15, 0.5, fundura / 2 + 0.01]}>
        <boxGeometry args={[0.55, 1, 0.04]} />
        <meshStandardMaterial color="#5C3F28" />
      </mesh>
      <mesh position={[largura * 0.25, altura * 0.62, fundura / 2 + 0.01]}>
        <boxGeometry args={[0.42, 0.38, 0.04]} />
        <meshStandardMaterial color={tipo === "coloridas" ? "#CFE9F7" : "#4A3524"} />
      </mesh>
      {tipo === "barro" && (
        <mesh position={[0, altura + 0.08, 0]}>
          <boxGeometry args={[largura + 0.16, 0.16, fundura + 0.16]} />
          <meshStandardMaterial color="#C7A877" flatShading />
        </mesh>
      )}
      {tipo === "palha" && (
        <mesh position={[0, altura + 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.max(largura, fundura) * 0.86, 1.3, 4]} />
          <meshStandardMaterial color="#D8B45A" flatShading />
        </mesh>
      )}
      {tipo === "coloridas" && (
        <mesh position={[0, altura + 0.45, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, fundura / 1.1]}>
          <cylinderGeometry args={[0.62, 0.62, largura + 0.3, 3, 1, false, Math.PI / 6]} />
          <meshStandardMaterial color="#C2453A" flatShading />
        </mesh>
      )}
    </group>
  );
};

/** As casas: no fundo e nos lados, longe de onde os personagens ficam (x -4 a 4, z -2 a 6). */
const Casas: React.FC<{ tipo: NonNullable<Paleta["casas"]>; rio: boolean }> = ({ tipo, rio }) => {
  const lista = useMemo(() => {
    const r = sorteio(31);
    const casas: Array<{ x: number; z: number; tom: number; giro: number }> = [];
    for (let i = 0; i < 40 && casas.length < 16; i++) {
      const fundo = i % 3 !== 0;
      const x = fundo ? (r() - 0.5) * 34 : (r() < 0.5 ? -1 : 1) * (7 + r() * 9);
      const z = fundo ? (rio ? -12.5 : -6) - r() * 12 : -3 + r() * 9;
      if (casas.some((c) => Math.hypot(c.x - x, c.z - z) < 3.6)) continue;
      casas.push({ x, z, tom: r() * 0.999, giro: (r() - 0.5) * 0.5 });
    }
    return casas;
  }, [rio]);
  return (
    <>
      {lista.map((c, i) => (
        <Casa key={i} {...c} tipo={tipo} />
      ))}
    </>
  );
};

/** A muralha da cidade antiga, no fundo, com torres e ameias. */
const Muralha: React.FC = () => (
  <group position={[0, 0, -22]}>
    <mesh position={[0, 1.7, 0]}>
      <boxGeometry args={[90, 3.4, 1.4]} />
      <meshStandardMaterial color="#CDAE74" flatShading roughness={1} />
    </mesh>
    {Array.from({ length: 45 }, (_, i) => (
      <mesh key={i} position={[-44 + i * 2, 3.65, 0.4]}>
        <boxGeometry args={[0.9, 0.5, 0.6]} />
        <meshStandardMaterial color="#C4A268" flatShading />
      </mesh>
    ))}
    {[-30, -16, -6, 6, 16, 30].map((x) => (
      <mesh key={x} position={[x, 2.6, 0.2]}>
        <boxGeometry args={[2.6, 5.2, 2.6]} />
        <meshStandardMaterial color="#C8A66C" flatShading roughness={1} />
      </mesh>
    ))}
    {/* O portão */}
    <mesh position={[0, 1.2, 0.72]}>
      <boxGeometry args={[2.2, 2.4, 0.05]} />
      <meshStandardMaterial color="#6B4A2E" />
    </mesh>
  </group>
);

/** Pedras soltas pelo chão (deserto e aldeia). */
const Pedras: React.FC = () => {
  const lista = useMemo(() => {
    const r = sorteio(53);
    return Array.from({ length: 26 }, () => {
      const x = (r() - 0.5) * 40;
      const z = -14 + r() * 18;
      return { x, z, tam: 0.15 + r() * 0.45, giro: r() * 6, tom: r() };
    }).filter((p) => !(Math.abs(p.x) < 4 && p.z > -3 && p.z < 7));
  }, []);
  return (
    <>
      {lista.map((p, i) => (
        <mesh key={i} position={[p.x, p.tam * 0.35, p.z]} rotation={[p.giro, p.giro * 2, 0]} scale={[1.3, 0.8, 1]}>
          <icosahedronGeometry args={[p.tam, 0]} />
          <meshStandardMaterial color={p.tom > 0.5 ? "#B39A72" : "#9E8862"} flatShading />
        </mesh>
      ))}
    </>
  );
};

/** O mundo inteiro, com a luz e o céu, no lugar escolhido. */
export const Mundo: React.FC<{ balanco: number; queda?: number; ponte?: boolean; tendas?: boolean; rio?: boolean; ambiente?: Ambiente }> = ({
  balanco,
  queda = 0,
  ponte = true,
  tendas = true,
  rio = true,
  ambiente = "campo",
}) => {
  const c = PALETAS[ambiente];
  return (
    <>
      <color attach="background" args={[c.ceu]} />
      <fog attach="fog" args={[c.nevoa, 45, 170]} />
      <hemisphereLight args={["#E6F4FF", c.luzDoChao, 1.25]} />
      <directionalLight position={[20, 32, 12]} intensity={2.1} color={c.luzDoSol} />
      <ambientLight intensity={0.25} />
      <Chao cor={c.chao} />
      {rio && <Rio margem={c.margem} />}
      {rio && ponte && <Ponte balanco={balanco} queda={queda} />}
      <Arvores tipo={c.plantas} muitas={!c.casas && c.plantas !== "palmeiras"} />
      <Montanhas cor={c.montanhas} />
      <Nuvens />
      {c.casas && <Casas tipo={c.casas} rio={rio} />}
      {c.muralha && <Muralha />}
      {c.pedras && <Pedras />}
      {/* As tendas ficam à esquerda: a câmera do plano aberto vem da direita */}
      {tendas && <Tenda x={-6.8} z={0.4} cor="#3D6FD6" />}
      {tendas && <Tenda x={-9.6} z={2.6} cor="#D64545" />}
      {tendas && ambiente === "deserto" && <Tenda x={8.5} z={-4} cor="#D8A23A" />}
      {c.grama !== null && <Grama matiz={c.grama} rio={rio} />}
    </>
  );
};
