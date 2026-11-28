import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { passo, POSTURAS, sorteio, viver } from "./animacao";
import { trajeDoAmbiente, visualDeFigurante, type Ambiente } from "./ambientes";
import { BonecoDePecas } from "./BonecoDePecas";

// A vida da rua (27/11/2026, a referência do dono: o short do Baú Torto, com
// gente passando, bonde, carro e um gato no fundo): figurantes que atravessam o
// fundo andando de verdade (o passo do tamanho da perna), um veículo (o carro no
// lugar moderno; a carroça com o burro nos lugares antigos) e um gato sentado
// que mexe a cabeça e o rabo. Tudo longe do elenco (no fundo, depois do rio):
// ninguém passa colado atrás de alguém do elenco. Só do quadro: o mesmo quadro
// sai sempre igual, em qualquer aba do render.

const FPS = 30;
/** Os lugares com rua (gente passando e veículo) */
export const COM_RUA: Ambiente[] = ["cidade", "moderno", "aldeia", "mar"];

const Material: React.FC<{ cor: string; brilho?: boolean }> = ({ cor, brilho }) => <meshStandardMaterial color={cor} roughness={brilho ? 0.3 : 0.75} metalness={brilho ? 0.4 : 0} />;

/** O carro de hoje (corpo, cabine, vidro e rodas que giram) */
const Carro: React.FC<{ cor: string; giro: number }> = ({ cor, giro }) => (
  <group>
    <mesh position={[0, 0.55, 0]} castShadow>
      <boxGeometry args={[3.6, 0.6, 1.6]} />
      <Material cor={cor} brilho />
    </mesh>
    <mesh position={[-0.2, 1.05, 0]} castShadow>
      <boxGeometry args={[2, 0.5, 1.45]} />
      <Material cor={cor} brilho />
    </mesh>
    <mesh position={[-0.2, 1.05, 0]}>
      <boxGeometry args={[2.02, 0.36, 1.47]} />
      <meshStandardMaterial color="#9CC7E0" roughness={0.1} metalness={0.3} />
    </mesh>
    {[-1.2, 1.2].flatMap((x) =>
      [-0.8, 0.8].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.32, z]} rotation={[Math.PI / 2, giro, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.22, 14]} />
          <Material cor="#222" />
        </mesh>
      )),
    )}
  </group>
);

/** A carroça de madeira puxada por um burro (as pernas do burro andam) */
const Carroca: React.FC<{ giro: number; fase: number }> = ({ giro, fase }) => {
  const perna = (k: number) => Math.sin(fase + k * Math.PI) * 0.45;
  return (
    <group>
      <mesh position={[-0.6, 0.85, 0]} castShadow>
        <boxGeometry args={[2, 0.5, 1.3]} />
        <Material cor="#8A5A32" />
      </mesh>
      <mesh position={[-0.6, 1.2, 0]}>
        <boxGeometry args={[1.7, 0.3, 1.1]} />
        <Material cor="#D9B86A" />
      </mesh>
      {[-0.72, 0.72].map((z) => (
        <mesh key={z} position={[-0.6, 0.5, z]} rotation={[Math.PI / 2, giro, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
          <Material cor="#5C3F28" />
        </mesh>
      ))}
      {/* O burro */}
      <group position={[1.4, 0, 0]}>
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[1.1, 0.5, 0.45]} />
          <Material cor="#8C8278" />
        </mesh>
        <mesh position={[0.62, 1.3, 0]} rotation={[0, 0, -0.6]} castShadow>
          <boxGeometry args={[0.45, 0.28, 0.26]} />
          <Material cor="#8C8278" />
        </mesh>
        {[-0.08, 0.08].map((z) => (
          <mesh key={z} position={[0.62, 1.55, z]}>
            <boxGeometry args={[0.06, 0.22, 0.05]} />
            <Material cor="#6E655C" />
          </mesh>
        ))}
        {[
          [0.4, 0.14, 0],
          [0.4, -0.14, 1],
          [-0.4, 0.14, 1],
          [-0.4, -0.14, 0],
        ].map(([x, z, k]) => (
          <group key={`${x}${z}`} position={[x, 0.72, z]} rotation={[0, 0, perna(k)]}>
            <mesh position={[0, -0.36, 0]}>
              <boxGeometry args={[0.1, 0.72, 0.1]} />
              <Material cor="#6E655C" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/** O gato sentado: a cabeça olha em volta e o rabo balança */
const Gato: React.FC<{ quadro: number }> = ({ quadro }) => {
  const t = quadro / FPS;
  return (
    <group scale={0.9}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.2, 0.3, 0.28]} />
        <Material cor="#E39B4B" />
      </mesh>
      <group position={[0, 0.36, 0.06]} rotation={[0, Math.sin(t * 0.7) * 0.6, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.17, 0.17]} />
          <Material cor="#E39B4B" />
        </mesh>
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, 0.11, 0]}>
            <coneGeometry args={[0.04, 0.08, 4]} />
            <Material cor="#C97F35" />
          </mesh>
        ))}
        {[-0.045, 0.045].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.087]}>
            <boxGeometry args={[0.03, 0.03, 0.005]} />
            <meshBasicMaterial color="#2B2340" />
          </mesh>
        ))}
      </group>
      <group position={[0, 0.05, -0.14]} rotation={[0.9 + Math.sin(t * 2.1) * 0.25, Math.sin(t * 1.3) * 0.5, 0]}>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.05, 0.28, 0.05]} />
          <Material cor="#C97F35" />
        </mesh>
      </group>
    </group>
  );
};

/** Quantos passam e em que faixa: longe, depois do rio (ou no fundo da rua) */
export const Figurantes: React.FC<{ ambiente: Ambiente; semente: number; rio: boolean; livre: (x: number, z: number) => boolean; comMultidao: boolean }> = ({
  ambiente,
  semente,
  rio,
  livre,
  comMultidao,
}) => {
  const quadro = useCurrentFrame();
  const t = quadro / FPS;
  // A rua: entre o elenco e a primeira fileira de casas (z -3,4 a -4,5); com rio, na outra margem
  const fundo = rio ? -10.2 : -3.4;
  const gente = useMemo(() => {
    const r = sorteio(77 + semente);
    return Array.from({ length: 4 }, (_, i) => ({
      z: fundo - i * (rio ? 0.5 : 0.32) - r() * 0.1,
      sentido: (i % 2 ? -1 : 1) as 1 | -1,
      velocidade: 0.9 + r() * 0.4,
      comeco: r() * 30,
      semente: 200 + i * 11 + Math.floor(r() * 50),
    }));
  }, [semente, fundo, rio]);
  // O gato fica perto de uma casa, de um lado (onde a câmera não passa)
  const gato = useMemo(() => {
    const r = sorteio(91 + semente);
    for (let k = 0; k < 12; k++) {
      const x = (r() < 0.5 ? -1 : 1) * (3.6 + r() * 1.6);
      const z = -0.5 + r() * 2;
      if (livre(x, z)) return [x, z] as [number, number];
    }
    return null;
  }, [semente, livre]);
  const veiculo = ambiente === "mar" ? null : ambiente === "moderno" ? "carro" : "carroca";
  const cor = ["#C2453A", "#3F63B8", "#F2C14E", "#5E8C5A"][semente % 4];
  // O veículo passa de vez em quando (a cada 14 s), devagar, bem no fundo
  const periodo = 14;
  const vel = veiculo === "carro" ? 5 : 2.2;
  const tv = (t + (semente % 7)) % periodo;
  const xv = -22 + tv * vel;
  return (
    <>
      {/* Com multidão na história, ela já dá vida: ninguém passa no meio dela */}
      {!comMultidao && gente.map((g, i) => {
        // Atravessa de um lado ao outro (32 m) e volta a entrar pelo começo, fora do plano
        const andou = g.comeco + t * g.velocidade;
        const x = -16 + (andou % 32);
        const visual = visualDeFigurante(g.semente);
        const postura = viver(passo(POSTURAS.normal, andou, 1, false), { quadro, semente: g.semente, batida: 0, ouvindo: 0, olharLado: 0, pouca: true, nome: "normal", desde: 0 });
        return (
          <BonecoDePecas
            key={i}
            visual={visual}
            traje={trajeDoAmbiente(ambiente, visual, g.semente)}
            estado={{ postura, expressao: "neutra", lagrimas: false, pulo: 0, celular: null, naMao: null, vento: 1 }}
            palavras={[]}
            posicao={[x * g.sentido, 0, g.z]}
            virar={(g.sentido * Math.PI) / 2}
            semente={g.semente}
          />
        );
      })}
      {veiculo && !comMultidao && xv < 22 && (
        <group position={[xv, 0, fundo - (rio ? 1.6 : 0.5)]}>
          {veiculo === "carro" ? <Carro cor={cor} giro={-(tv * vel) / 0.32} /> : <Carroca giro={-(tv * vel) / 0.5} fase={tv * 7} />}
        </group>
      )}
      {gato && ambiente !== "mar" && (
        <group position={[gato[0], 0, gato[1]]} rotation={[0, (gato[0] > 0 ? -1 : 1) * 0.9, 0]}>
          <Gato quadro={quadro} />
        </group>
      )}
    </>
  );
};

