import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";

// Os objetos de cena do Mundo3D (21/11/2026): animais, a oferta, o altar, o
// fogo e a serpente, que a crítica pedia ("o narrador conta a oferta, mas o
// vídeo mostra só os personagens"). Formas simples e low-poly, como o resto do
// mundo (Mundo.tsx), sem baixar modelo nenhum. Medidas em metros; chão em y = 0.

export const OBJETOS = [
  "ovelha",
  "cordeiro",
  "altar",
  "altar-com-fogo",
  "fogueira",
  "cesto-de-frutos",
  "feixe-de-trigo",
  "cajado",
  "serpente",
  "jarro",
  "arvore-com-frutos",
  "pedra-grande",
  // 26/11/2026 (pedido da crítica: objetos de casamento e festa)
  "caixinha-de-alianca",
  "buque",
  "bolo",
  "presente",
  "terno-no-cabide",
] as const;
export type TipoDeObjeto = (typeof OBJETOS)[number];

const LA = "#F4F1EA";
const ESCURO = "#3B3330";

const Ovelha: React.FC<{ tamanho: number }> = ({ tamanho }) => {
  const frame = useCurrentFrame();
  // A cabeça desce e sobe devagar (pastando)
  const cabeca = Math.sin(frame / 22) * 0.08;
  return (
    <group scale={tamanho}>
      <mesh position={[0, 0.55, 0]} scale={[1.25, 0.85, 0.85]}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial color={LA} roughness={1} flatShading />
      </mesh>
      <group position={[0.55, 0.68 + cabeca, 0]}>
        <mesh scale={[1.1, 0.85, 0.75]}>
          <icosahedronGeometry args={[0.17, 0]} />
          <meshStandardMaterial color={ESCURO} flatShading />
        </mesh>
        {[-0.1, 0.1].map((z) => (
          <mesh key={z} position={[-0.04, 0.06, z * 1.2]} rotation={[z > 0 ? 0.6 : -0.6, 0, 0]}>
            <boxGeometry args={[0.06, 0.04, 0.14]} />
            <meshStandardMaterial color={ESCURO} />
          </mesh>
        ))}
      </group>
      {[
        [0.3, 0.18],
        [0.3, -0.18],
        [-0.3, 0.18],
        [-0.3, -0.18],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.17, z]}>
          <cylinderGeometry args={[0.045, 0.04, 0.34, 5]} />
          <meshStandardMaterial color={ESCURO} />
        </mesh>
      ))}
    </group>
  );
};

/** Pedras empilhadas; com fogo, a chama e a fumaça em cima */
const Altar: React.FC<{ fogo: boolean }> = ({ fogo }) => {
  const pedras = useMemo(
    () =>
      [
        [-0.32, 0.22, -0.2, 0.3],
        [0.3, 0.22, -0.18, 0.32],
        [0, 0.22, 0.28, 0.3],
        [-0.05, 0.55, -0.05, 0.3],
        [0.28, 0.52, 0.18, 0.24],
        [-0.3, 0.52, 0.16, 0.24],
      ] as const,
    [],
  );
  return (
    <group>
      {pedras.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i, i * 2, 0]}>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i % 2 ? "#9E978C" : "#B3ACA0"} flatShading />
        </mesh>
      ))}
      {fogo && (
        <group position={[0, 0.8, 0]} scale={0.8}>
          <Fogo />
        </group>
      )}
    </group>
  );
};

/** A chama que tremula e a lenha cruzada */
const Fogo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (n: number) => 1 + Math.sin(frame / 2.3 + n) * 0.12 + Math.sin(frame / 5.1 + n * 2) * 0.08;
  return (
    <group>
      {[0, Math.PI / 2, Math.PI / 4].map((giro) => (
        <mesh key={giro} position={[0, 0.06, 0]} rotation={[0, giro, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 5]} />
          <meshStandardMaterial color="#6B4226" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.32, 0]} scale={[1, t(0), 1]}>
        <coneGeometry args={[0.2, 0.55, 6]} />
        <meshStandardMaterial color="#FF8A1F" emissive="#FF6A00" emissiveIntensity={1.2} flatShading />
      </mesh>
      <mesh position={[0.04, 0.3, 0.03]} scale={[1, t(2), 1]}>
        <coneGeometry args={[0.11, 0.42, 6]} />
        <meshStandardMaterial color="#FFE066" emissive="#FFC400" emissiveIntensity={1.4} flatShading />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color="#FFA040" intensity={2.5 * t(1)} distance={4} />
    </group>
  );
};

const CestoDeFrutos: React.FC = () => {
  const frutas = ["#C8302C", "#F08A24", "#7A3B8F", "#E9C23A", "#C8302C", "#6FAF3A"];
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.34, 0.26, 0.32, 10, 1, true]} />
        <meshStandardMaterial color="#B07A3E" side={THREE.DoubleSide} flatShading />
      </mesh>
      {frutas.map((cor, i) => {
        const a = (i / frutas.length) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.16, 0.34 + (i % 2) * 0.06, Math.sin(a) * 0.16]}>
            <icosahedronGeometry args={[0.1, 1]} />
            <meshStandardMaterial color={cor} flatShading />
          </mesh>
        );
      })}
    </group>
  );
};

const FeixeDeTrigo: React.FC = () => (
  <group>
    {Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return (
        <group key={i} position={[Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06]} rotation={[Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.9, 4]} />
            <meshStandardMaterial color="#C9A548" />
          </mesh>
          <mesh position={[0, 0.98, 0]}>
            <capsuleGeometry args={[0.035, 0.14, 2, 5]} />
            <meshStandardMaterial color="#E2BE5A" flatShading />
          </mesh>
        </group>
      );
    })}
    <mesh position={[0, 0.4, 0]}>
      <torusGeometry args={[0.09, 0.02, 4, 10]} />
      <meshStandardMaterial color="#8A5A2B" />
    </mesh>
  </group>
);

/** O cajado de pastor fincado no chão, com a curva em cima */
const Cajado: React.FC = () => (
  <group rotation={[0, 0, 0.06]}>
    <mesh position={[0, 0.85, 0]}>
      <cylinderGeometry args={[0.025, 0.03, 1.7, 6]} />
      <meshStandardMaterial color="#7A5230" flatShading />
    </mesh>
    <mesh position={[0.11, 1.7, 0]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.11, 0.025, 5, 10, Math.PI]} />
      <meshStandardMaterial color="#7A5230" flatShading />
    </mesh>
  </group>
);

/** A serpente no chão, que se mexe em ondas; a cabeça levantada */
const Serpente: React.FC = () => {
  const frame = useCurrentFrame();
  // Mais grossa e com a cabeça erguida: fina, ela sumia na grama
  const ponto = (i: number) =>
    new THREE.Vector3(-1.2 + i * 0.22, 0.09 + (i > 8 ? (i - 8) * 0.16 : 0), Math.sin(i * 0.9 + frame / 6) * 0.2 * (i > 8 ? 0.3 : 1));
  const geometria = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => ponto(i))), 48, 0.09, 7, false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame],
  );
  const cabeca = ponto(11);
  return (
    <group>
      <mesh geometry={geometria}>
        <meshStandardMaterial color="#6E7F1E" flatShading />
      </mesh>
      <mesh position={[cabeca.x + 0.06, cabeca.y, cabeca.z]} scale={[1.5, 0.75, 1.05]}>
        <icosahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#5A6A16" flatShading />
      </mesh>
      {[-0.05, 0.05].map((z) => (
        <mesh key={z} position={[cabeca.x + 0.12, cabeca.y + 0.06, cabeca.z + z]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshStandardMaterial color="#F5D53A" emissive="#B08A00" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

const Jarro: React.FC = () => {
  const geometria = useMemo(() => {
    const perfil = [
      [0.0, 0],
      [0.16, 0.02],
      [0.24, 0.18],
      [0.22, 0.38],
      [0.12, 0.5],
      [0.1, 0.6],
      [0.14, 0.64],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(perfil, 10);
  }, []);
  return (
    <mesh geometry={geometria}>
      <meshStandardMaterial color="#B8643A" flatShading side={THREE.DoubleSide} />
    </mesh>
  );
};

/** A árvore do jardim com frutos vermelhos (Éden) */
const ArvoreComFrutos: React.FC = () => (
  <group scale={1.4}>
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.12, 0.17, 1.2, 6]} />
      <meshStandardMaterial color="#7B5232" flatShading />
    </mesh>
    <mesh position={[0, 1.75, 0]}>
      <icosahedronGeometry args={[0.95, 0]} />
      <meshStandardMaterial color="#3F8F3A" flatShading />
    </mesh>
    {[
      [0.6, 1.6, 0.5],
      [-0.55, 1.9, 0.45],
      [0.2, 2.2, 0.75],
      [-0.3, 1.45, 0.75],
      [0.75, 2.0, -0.1],
    ].map(([x, y, z], i) => (
      <mesh key={i} position={[x, y, z]}>
        <icosahedronGeometry args={[0.11, 1]} />
        <meshStandardMaterial color="#D2322D" flatShading />
      </mesh>
    ))}
  </group>
);

const PedraGrande: React.FC = () => (
  <mesh position={[0, 0.45, 0]} scale={[1.3, 0.9, 1]} rotation={[0.3, 0.8, 0]}>
    <dodecahedronGeometry args={[0.6, 0]} />
    <meshStandardMaterial color="#A39C90" flatShading />
  </mesh>
);

// ---- Casamento e festa (26/11/2026) ----
// Maiores que na vida real (uns 2x): de verdade, a caixinha some no plano aberto.

const Material: React.FC<{ cor: string; brilho?: boolean }> = ({ cor, brilho }) => (
  <meshStandardMaterial color={cor} flatShading roughness={brilho ? 0.3 : 0.9} metalness={brilho ? 0.6 : 0} />
);

/** Mesinha redonda (o bolo e a caixinha ficam em cima quando estão no chão) */
const Mesinha: React.FC = () => (
  <group>
    <mesh position={[0, 0.72, 0]}>
      <cylinderGeometry args={[0.42, 0.42, 0.05, 20]} />
      <Material cor="#C9A37A" />
    </mesh>
    <mesh position={[0, 0.36, 0]}>
      <cylinderGeometry args={[0.05, 0.06, 0.7, 8]} />
      <Material cor="#A27B54" />
    </mesh>
    <mesh position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.25, 0.28, 0.04, 16]} />
      <Material cor="#A27B54" />
    </mesh>
  </group>
);

const CaixinhaDeAlianca: React.FC = () => (
  <group>
    <mesh position={[0, 0.06, 0]}>
      <boxGeometry args={[0.24, 0.12, 0.2]} />
      <Material cor="#C9486A" />
    </mesh>
    {/* A tampa aberta para trás e a aliança brilhando */}
    <mesh position={[0, 0.2, -0.1]} rotation={[-0.35, 0, 0]}>
      <boxGeometry args={[0.24, 0.2, 0.04]} />
      <Material cor="#B23A57" />
    </mesh>
    <mesh position={[0, 0.16, 0.02]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.05, 0.016, 8, 20]} />
      <meshStandardMaterial color="#F2C14E" emissive="#B08A00" emissiveIntensity={0.5} metalness={0.8} roughness={0.25} />
    </mesh>
  </group>
);

const Buque: React.FC = () => (
  <group>
    <mesh position={[0, 0.14, 0]}>
      <cylinderGeometry args={[0.05, 0.03, 0.28, 8]} />
      <Material cor="#5E9E4A" />
    </mesh>
    {(
      [
        [0, 0.36, 0, "#FFFFFF"],
        [0.1, 0.32, 0.05, "#F7C6D0"],
        [-0.1, 0.32, 0.05, "#E86A8A"],
        [0.05, 0.33, -0.09, "#E86A8A"],
        [-0.06, 0.34, -0.08, "#FFFFFF"],
        [0, 0.3, 0.11, "#F7C6D0"],
      ] as const
    ).map(([x, y, z, cor], i) => (
      <mesh key={i} position={[x, y, z]}>
        <icosahedronGeometry args={[0.075, 1]} />
        <Material cor={cor} />
      </mesh>
    ))}
  </group>
);

const BoloDeFesta: React.FC = () => (
  <group>
    {(
      [
        [0.3, 0.2, 0.1],
        [0.22, 0.17, 0.3],
        [0.14, 0.15, 0.47],
      ] as const
    ).map(([r, a, y], i) => (
      <group key={i}>
        <mesh position={[0, y + a / 2, 0]}>
          <cylinderGeometry args={[r, r, a, 20]} />
          <Material cor="#FFFFFF" />
        </mesh>
        <mesh position={[0, y + a - 0.01, 0]}>
          <torusGeometry args={[r, 0.022, 6, 24]} />
          <Material cor="#E86A8A" />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.66, 0]}>
      <sphereGeometry args={[0.05, 10, 8]} />
      <Material cor="#E86A8A" />
    </mesh>
    <mesh position={[0, 0.05, 0]}>
      <cylinderGeometry args={[0.36, 0.36, 0.04, 20]} />
      <Material cor="#E7ECEF" brilho />
    </mesh>
  </group>
);

const Presente: React.FC = () => (
  <group>
    <mesh position={[0, 0.2, 0]}>
      <boxGeometry args={[0.4, 0.4, 0.4]} />
      <Material cor="#5B8DEF" />
    </mesh>
    <mesh position={[0, 0.2, 0]}>
      <boxGeometry args={[0.08, 0.42, 0.42]} />
      <Material cor="#F2C14E" />
    </mesh>
    <mesh position={[0, 0.2, 0]}>
      <boxGeometry args={[0.42, 0.42, 0.08]} />
      <Material cor="#F2C14E" />
    </mesh>
    {[-1, 1].map((lado) => (
      <mesh key={lado} position={[lado * 0.07, 0.45, 0]} rotation={[0, 0, lado * 0.6]}>
        <torusGeometry args={[0.06, 0.02, 6, 12]} />
        <Material cor="#F2C14E" />
      </mesh>
    ))}
  </group>
);

/** O paletó escuro (com camisa e gravata) no cabide; no chão, num cabideiro */
const Terno: React.FC = () => (
  <group>
    <mesh position={[0, -0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.015, 0.015, 0.44, 6]} />
      <Material cor="#7A5230" />
    </mesh>
    <mesh position={[0, -0.36, 0]}>
      <boxGeometry args={[0.46, 0.6, 0.12]} />
      <Material cor="#2E3550" />
    </mesh>
    <mesh position={[0, -0.18, 0.062]}>
      <boxGeometry args={[0.12, 0.22, 0.01]} />
      <Material cor="#FFFFFF" />
    </mesh>
    <mesh position={[0, -0.2, 0.07]}>
      <boxGeometry args={[0.035, 0.2, 0.01]} />
      <Material cor="#B23A3A" />
    </mesh>
  </group>
);

const Cabideiro: React.FC = () => (
  <group>
    <mesh position={[0, 0.9, 0]}>
      <cylinderGeometry args={[0.025, 0.03, 1.8, 8]} />
      <Material cor="#8A6040" />
    </mesh>
    <mesh position={[0, 0.03, 0]}>
      <cylinderGeometry args={[0.22, 0.25, 0.05, 12]} />
      <Material cor="#8A6040" />
    </mesh>
  </group>
);

/**
 * Os objetos que dá para segurar na mão (bonecos de peças: `naMao`), com o
 * ponto (0, 0, 0) onde a mão pega. No chão, os pequenos ficam numa mesinha.
 */
export const OBJETOS_DE_MAO = ["caixinha-de-alianca", "buque", "bolo", "presente", "terno-no-cabide", "cajado", "jarro", "cesto-de-frutos", "feixe-de-trigo"] as const;
export const ehObjetoDeMao = (tipo: string): tipo is (typeof OBJETOS_DE_MAO)[number] => (OBJETOS_DE_MAO as readonly string[]).includes(tipo);

/** O objeto na mão: menor e de pé (o boneco desvira pelo braço) */
export const ObjetoNaMao3D: React.FC<{ tipo: TipoDeObjeto }> = ({ tipo }) => (
  <group scale={tipo === "cajado" ? 0.95 : tipo === "terno-no-cabide" ? 0.8 : 0.55}>
    {tipo === "caixinha-de-alianca" && <CaixinhaDeAlianca />}
    {tipo === "buque" && <group position={[0, -0.1, 0]}><Buque /></group>}
    {tipo === "bolo" && <BoloDeFesta />}
    {tipo === "presente" && <Presente />}
    {tipo === "terno-no-cabide" && <Terno />}
    {tipo === "cajado" && <group position={[0, -0.9, 0]}><Cajado /></group>}
    {tipo === "jarro" && <Jarro />}
    {tipo === "cesto-de-frutos" && <CestoDeFrutos />}
    {tipo === "feixe-de-trigo" && <group position={[0, -0.4, 0]}><FeixeDeTrigo /></group>}
  </group>
);

export const ObjetoDeCena: React.FC<{ tipo: TipoDeObjeto; posicao: [number, number, number]; giro?: number; escala?: number }> = ({
  tipo,
  posicao,
  giro = 0,
  escala = 1,
}) => (
  <group position={posicao} rotation={[0, giro, 0]} scale={escala}>
    {tipo === "ovelha" && <Ovelha tamanho={1} />}
    {tipo === "cordeiro" && <Ovelha tamanho={0.65} />}
    {tipo === "altar" && <Altar fogo={false} />}
    {tipo === "altar-com-fogo" && <Altar fogo />}
    {tipo === "fogueira" && <Fogo />}
    {tipo === "cesto-de-frutos" && <CestoDeFrutos />}
    {tipo === "feixe-de-trigo" && <FeixeDeTrigo />}
    {tipo === "cajado" && <Cajado />}
    {tipo === "serpente" && <Serpente />}
    {tipo === "jarro" && <Jarro />}
    {tipo === "arvore-com-frutos" && <ArvoreComFrutos />}
    {tipo === "pedra-grande" && <PedraGrande />}
    {tipo === "caixinha-de-alianca" && (
      <>
        <Mesinha />
        <group position={[0, 0.745, 0]} scale={1.3}>
          <CaixinhaDeAlianca />
        </group>
      </>
    )}
    {tipo === "buque" && (
      <>
        <Mesinha />
        <group position={[0, 0.745, 0]} rotation={[0, 0, Math.PI / 2.3]}>
          <Buque />
        </group>
      </>
    )}
    {tipo === "bolo" && (
      <>
        <Mesinha />
        <group position={[0, 0.745, 0]}>
          <BoloDeFesta />
        </group>
      </>
    )}
    {tipo === "presente" && <Presente />}
    {tipo === "terno-no-cabide" && (
      <>
        <Cabideiro />
        <group position={[0, 1.75, 0.04]}>
          <Terno />
        </group>
      </>
    )}
  </group>
);
