import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sorteio } from "./animacao";
import { renderPorSoftware } from "./BonecoDePecas";
import { luzDaHora, PALETAS, type Ambiente, type Hora, type Paleta } from "./ambientes";
import { PONTE } from "./plano";
import { Fosco, useSoftware } from "./software";

// O mundo 3D low-poly do molde Mundo3D (protótipo, 18/11/2026): campo, rio,
// ponte de madeira com cerca, árvores, montanhas, tendas, nuvens e grama.
// Tudo feito aqui, com formas simples (sem baixar modelo nenhum) e sorteio
// com semente fixa: o mesmo quadro sai sempre igual.
//
// Medidas em "metros": o chão é y = 0; o rio corre no eixo x; a ponte cruza o
// rio no x = 0.
//
// 27/11/2026 (luz de cinema): céu em degradê com o brilho do sol, sol com sombra
// de verdade (macia), luz do céu, contraluz que desenha a borda dos bonecos,
// chão com manchas (sem a cor chapada), a semente do episódio (as árvores, as
// casas e as pedras mudam de lugar a cada vídeo) e nada no caminho da câmera
// (o cenário recebe sombra, mas só os bonecos e os objetos fazem sombra: no render
// da nuvem, por software, a sombra de tudo dobrava o tempo)
// (antes, uma árvore da frente podia tapar o plano inteiro).

/** Onde não pode ter nada (o caminho da câmera): true = livre */
export type Livre = (x: number, z: number) => boolean;
const sempre: Livre = () => true;
/** Camadas no chão (rio, margem, tapete): um pouco acima e "puxadas" para a frente, sem tremer de longe */
const deitado = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } as const;

export const RIO = { z: -7, largura: 5 };
// A ponte mora em plano.ts (conta pura: o conferir também usa)
export { PONTE };

/** Sorteio com semente (mulberry32): o mesmo número, a mesma sequência (fica em animacao.ts, sem React) */
export { sorteio };

/** As manchas do chão (claro e escuro, de leve), repetidas: o chão não fica de uma cor só */
let texturaDoChao: THREE.CanvasTexture | null = null;
function manchas() {
  if (texturaDoChao) return texturaDoChao;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#EDEDED";
    ctx.fillRect(0, 0, 256, 256);
    const r = sorteio(99);
    for (let i = 0; i < 260; i++) {
      const claro = r() < 0.45;
      // Manchas leves (antes, as escuras viravam "poças" no plano aberto)
      ctx.fillStyle = claro ? `rgba(255,255,255,${0.06 + r() * 0.08})` : `rgba(60,50,40,${0.015 + r() * 0.03})`;
      const x = r() * 256;
      const y = r() * 256;
      const raio = 4 + r() * 26;
      // Repete nas bordas (a textura emenda sem costura)
      for (const dx of [-256, 0, 256])
        for (const dy of [-256, 0, 256]) {
          ctx.beginPath();
          ctx.ellipse(x + dx, y + dy, raio, raio * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
    }
  }
  texturaDoChao = new THREE.CanvasTexture(c);
  texturaDoChao.wrapS = THREE.RepeatWrapping;
  texturaDoChao.wrapT = THREE.RepeatWrapping;
  texturaDoChao.repeat.set(110, 110);
  texturaDoChao.colorSpace = THREE.SRGBColorSpace;
  texturaDoChao.anisotropy = 8;
  return texturaDoChao;
}

const Chao: React.FC<{ cor: string }> = ({ cor }) => {
  const software = useSoftware();
  const textura = manchas();
  if (software) textura.anisotropy = 1;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <Fosco color={cor} map={textura} roughness={0.95} />
    </mesh>
  );
};

/** O céu: degradê do horizonte para o alto, com o brilho em volta do sol */
const Ceu: React.FC<{ topo: string; horizonte: string; sol: [number, number, number]; corDoSol: string }> = ({ topo, horizonte, sol, corDoSol }) => {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          topo: { value: new THREE.Color(topo) },
          horizonte: { value: new THREE.Color(horizonte) },
          corDoSol: { value: new THREE.Color(corDoSol) },
          sol: { value: new THREE.Vector3(...sol).normalize() },
        },
        vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 topo; uniform vec3 horizonte; uniform vec3 corDoSol; uniform vec3 sol; varying vec3 vDir;
          void main() {
            float h = max(vDir.y, 0.0);
            vec3 cor = mix(horizonte, topo, pow(h, 0.55));
            float s = max(dot(normalize(vDir), sol), 0.0);
            cor += corDoSol * (pow(s, 24.0) * 0.35 + pow(s, 400.0) * 1.2);
            gl_FragColor = vec4(cor, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [topo, horizonte, sol, corDoSol],
  );
  return (
    <mesh scale={320} material={material} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
};

/** O reflexo macio do ambiente (uma sala clara, feita uma vez): o material ganha volume */
const Reflexo: React.FC<{ forca: number }> = ({ forca }) => {
  const { gl, scene } = useThree();
  // Por software (a nuvem), sem o reflexo: ler o mapa em cada pixel dobrava o tempo dos planos de perto
  const software = useSoftware();
  useMemo(() => {
    renderPorSoftware(software);
    if (software) return null;
    const gerador = new THREE.PMREMGenerator(gl);
    const textura = gerador.fromScene(new RoomEnvironment(), 0.04).texture;
    gerador.dispose();
    scene.environment = textura;
    return textura;
  }, [gl, scene, software]);
  scene.environmentIntensity = forca;
  return null;
};

/**
 * As luzes de cinema: o sol (com sombra macia que acompanha onde a cena acontece),
 * a luz do céu (preenche as sombras) e a contraluz por trás (desenha a borda).
 */
const Luzes: React.FC<{ hora: ReturnType<typeof luzDaHora>; centro: [number, number]; chao: string; forcaDoCeu?: number }> = ({ hora, centro, chao, forcaDoCeu = 1 }) => {
  const alvo = useMemo(() => new THREE.Object3D(), []);
  // Na nuvem o render é por software (SwiftShader): a sombra fica menor (1024) para não dobrar o tempo
  const { gl } = useThree();
  const software = useSoftware();
  const tamanho = useMemo(() => {
    // Por software, a sombra com 1 amostra (a filtrada lia o mapa 4 vezes em cada pixel do chão)
    if (software) gl.shadowMap.type = THREE.BasicShadowMap;
    return software ? 1024 : 2048;
  }, [gl, software]);
  alvo.position.set(centro[0], 0, centro[1]);
  alvo.updateMatrixWorld();
  const d = hora.direcaoDoSol;
  const n = Math.hypot(...d);
  const sol: [number, number, number] = [centro[0] + (d[0] / n) * 40, (d[1] / n) * 40, centro[1] + (d[2] / n) * 40];
  return (
    <>
      <primitive object={alvo} />
      <directionalLight
        position={sol}
        target={alvo}
        intensity={hora.forcaDoSol}
        color={hora.sol}
        // Por software (a nuvem), o sol não faz sombra: ela custava 12% do tempo do render.
        // Ficam as sombras de contato (o círculo macio sob os pés e sob os objetos)
        castShadow={!software}
        shadow-mapSize-width={tamanho}
        shadow-mapSize-height={tamanho}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={5}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      <hemisphereLight args={[hora.luzDoCeu, chao, hora.forcaDoCeu * forcaDoCeu]} />
      <directionalLight position={[centro[0] - 8, 14, centro[1] - 22]} intensity={hora.forcaDaContraluz} color={hora.contraluz} />
    </>
  );
};

const Rio: React.FC<{ margem: string }> = ({ margem }) => (
  <group>
    {/* As margens de terra */}
    {[RIO.z - RIO.largura / 2 - 0.25, RIO.z + RIO.largura / 2 + 0.25].map((z) => (
      <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, z]} receiveShadow>
        <planeGeometry args={[400, 0.8]} />
        <Fosco color={margem} roughness={1} {...deitado} />
      </mesh>
    ))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, RIO.z]} receiveShadow>
      <planeGeometry args={[400, RIO.largura]} />
      <Fosco color="#3E8ED8" roughness={0.08} metalness={0.2} {...deitado} />
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
        <mesh key={i} castShadow position={[0, PONTE.altura - 0.06, -comprimento / 2 + 0.17 + i * 0.34]}>
          <boxGeometry args={[PONTE.meiaLargura * 2, 0.12, 0.3]} />
          <Fosco color={i % 2 ? "#A8743F" : "#9A6A38"} roughness={0.9} flatShading />
        </mesh>
      ))}
      {/* As vigas embaixo e os pilares no rio */}
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} castShadow position={[x, PONTE.altura - 0.22, 0]}>
          <boxGeometry args={[0.18, 0.2, comprimento]} />
          <Fosco color="#7A5530" flatShading />
        </mesh>
      ))}
      {[-2.2, 2.2].flatMap((z) =>
        [-0.9, 0.9].map((x) => (
          <mesh key={`${x}${z}`} position={[x, 0.2, z]}>
            <cylinderGeometry args={[0.12, 0.14, 0.8, 6]} />
            <Fosco color="#6E4B29" flatShading />
          </mesh>
        )),
      )}
      {/* A cerca branca dos dois lados */}
      {[-PONTE.meiaLargura + 0.05, PONTE.meiaLargura - 0.05].map((x) => (
        <group key={x}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} castShadow position={[x, PONTE.altura + 0.42, -comprimento / 2 + i * (comprimento / 8)]}>
              <boxGeometry args={[0.09, 0.84, 0.09]} />
              <Fosco color="#F4F4F0" roughness={0.6} />
            </mesh>
          ))}
          {[0.82, 0.46].map((y) => (
            <mesh key={y} castShadow position={[x, PONTE.altura + y, 0]}>
              <boxGeometry args={[0.07, 0.07, comprimento]} />
              <Fosco color="#F4F4F0" roughness={0.6} />
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
        <Fosco color="#7B5232" flatShading />
      </mesh>
      {pinheiro ? (
        <>
          <mesh position={[0, 1.7, 0]}>
            <coneGeometry args={[0.85, 1.6, 7]} />
            <Fosco color={verde} flatShading />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <coneGeometry args={[0.6, 1.2, 7]} />
            <Fosco color={verde} flatShading />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 1.75, 0]}>
          <icosahedronGeometry args={[0.95, 0]} />
          <Fosco color={verde} flatShading />
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
        <mesh key={i} castShadow position={[curva * (i / gomos) ** 2 * 1.6, 0.25 + i * 0.5, 0]} rotation={[0, 0, -curva * (i / gomos) * 0.6]}>
          <cylinderGeometry args={[0.13 - i * 0.008, 0.16 - i * 0.008, 0.52, 7]} />
          <Fosco color={i % 2 ? "#8C6A42" : "#7A5A36"} flatShading />
        </mesh>
      ))}
      <group position={[curva * 1.6, gomos * 0.5 + 0.05, 0]}>
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
            <mesh position={[0.75, -0.25, 0]} rotation={[0, 0, -0.55]}>
              <boxGeometry args={[1.6, 0.06, 0.42]} />
              <Fosco color={verde} flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/** As plantas: do outro lado do rio e nos lados, longe da ponte e da frente da câmera. */
const Arvores: React.FC<{ tipo: Paleta["plantas"]; muitas: boolean; livre?: Livre; semente: number }> = ({ tipo, muitas, livre = sempre, semente }) => {
  const lista = useMemo(() => {
    const r = sorteio(7 + semente);
    const arvores: Array<{ x: number; z: number; escala: number; pinheiro: boolean; tom: number }> = [];
    for (let i = 0; i < 90; i++) {
      const longe = i < 60;
      const x = (r() - 0.5) * (longe ? 90 : 60);
      // As de perto ficam dos lados, até z 9 (mais para a frente fica a câmera)
      const z = longe ? -12 - r() * 40 : -2 + r() * 11;
      if (Math.abs(x) < (longe ? 3.2 : 7)) continue;
      const sorteado = { x, z, escala: 0.8 + r() * 0.9, pinheiro: r() < 0.35, tom: r() };
      // Palmeiras e casas pedem menos plantas (o lugar fica mais aberto)
      if (!muitas && i % 3 !== 0) continue;
      if (!livre(x, z)) continue;
      arvores.push(sorteado);
    }
    return arvores;
  }, [muitas, livre, semente]);
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
const Montanhas: React.FC<{ cor: Paleta["montanhas"]; semente: number }> = ({ cor, semente }) => {
  const lista = useMemo(() => {
    const r = sorteio(11 + semente);
    return Array.from({ length: 12 }, (_, i) => ({
      x: -110 + i * 20 + (r() - 0.5) * 10,
      z: -75 - r() * 30,
      raio: (cor.baixas ? 24 : 14) + r() * 14,
      altura: (cor.baixas ? 6 : 16) + r() * (cor.baixas ? 8 : 18),
      cor: new THREE.Color().setHSL(cor.matiz + r() * 0.04, cor.saturacao, cor.luz + r() * 0.1).getStyle(),
    }));
  }, [cor, semente]);
  return (
    <>
      {lista.map((m, i) => (
        <mesh key={i} castShadow position={[m.x, m.altura / 2 - 0.5, m.z]}>
          <coneGeometry args={[m.raio, m.altura, 7]} />
          <Fosco color={m.cor} flatShading roughness={1} />
        </mesh>
      ))}
    </>
  );
};

const Tenda: React.FC<{ x: number; z: number; cor: string }> = ({ x, z, cor }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, 0.9, 0]}>
      <coneGeometry args={[1.25, 1.8, 10]} />
      <Fosco color="#F6F3EA" flatShading />
    </mesh>
    <mesh position={[0, 1.55, 0]}>
      <coneGeometry args={[0.55, 0.7, 10]} />
      <Fosco color={cor} flatShading />
    </mesh>
    <mesh position={[0, 2.25, 0]}>
      <cylinderGeometry args={[0.025, 0.025, 1, 5]} />
      <Fosco color="#5C4630" />
    </mesh>
    <mesh position={[0.22, 2.6, 0]}>
      <boxGeometry args={[0.42, 0.26, 0.02]} />
      <Fosco color={cor} />
    </mesh>
  </group>
);

const Nuvens: React.FC<{ semente: number; cor?: string }> = ({ semente, cor = "#FFFFFF" }) => {
  const lista = useMemo(() => {
    const r = sorteio(23 + semente);
    return Array.from({ length: 9 }, () => ({
      x: (r() - 0.5) * 120,
      y: 22 + r() * 10,
      z: -50 - r() * 40,
      bolas: Array.from({ length: 4 + Math.floor(r() * 3) }, () => [(r() - 0.5) * 7, (r() - 0.5) * 1.6, (r() - 0.5) * 3, 1.6 + r() * 1.6] as const),
    }));
  }, [semente]);
  return (
    <>
      {lista.map((n, i) => (
        <group key={i} position={[n.x, n.y, n.z]}>
          {n.bolas.map(([x, y, z, raio], j) => (
            <mesh key={j} castShadow position={[x, y, z]}>
              <icosahedronGeometry args={[raio, 1]} />
              <Fosco color={cor} flatShading roughness={1} emissive={cor} emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
};

/** A grama em 3D: milhares de folhas finas (uma malha só, desenhada de uma vez). */
const Grama: React.FC<{ matiz: number; rio: boolean; semente: number; livre: Livre }> = ({ matiz, rio, semente, livre }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const folhas = useMemo(() => {
    const r = sorteio(3 + semente);
    const lista: Array<{ x: number; z: number; altura: number; giro: number; inclina: number; cor: THREE.Color }> = [];
    const total = 7000;
    for (let i = 0; i < total; i++) {
      const perto = i < 5200;
      const x = (r() - 0.5) * (perto ? 30 : 40);
      const z = perto ? -4 + r() * 18 : -10 - r() * 14;
      const altura = perto ? 0.1 + r() * 0.16 : 0.2 + r() * 0.3;
      // Perto da câmera, nada de folha (no plano médio ela cobria as pernas)
      if (!livre(x, z)) continue;
      // Nada de grama no rio
      if (rio && Math.abs(z - RIO.z) < RIO.largura / 2 + 0.5) continue;
      lista.push({
        x,
        z,
        altura,
        giro: r() * Math.PI * 2,
        inclina: (r() - 0.5) * 0.5,
        cor: new THREE.Color().setHSL(matiz + r() * 0.06, 0.6, 0.3 + r() * 0.16),
      });
    }
    return lista;
  }, [matiz, rio, semente, livre]);
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
      <Fosco roughness={1} flatShading />
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
        <Fosco color={parede} flatShading roughness={1} />
      </mesh>
      {/* Porta e janela, na frente */}
      <mesh position={[-largura * 0.15, 0.5, fundura / 2 + 0.01]}>
        <boxGeometry args={[0.55, 1, 0.04]} />
        <Fosco color="#5C3F28" />
      </mesh>
      <mesh position={[largura * 0.25, altura * 0.62, fundura / 2 + 0.01]}>
        <boxGeometry args={[0.42, 0.38, 0.04]} />
        <Fosco color={tipo === "coloridas" ? "#CFE9F7" : "#4A3524"} />
      </mesh>
      {tipo === "barro" && (
        <mesh position={[0, altura + 0.08, 0]}>
          <boxGeometry args={[largura + 0.16, 0.16, fundura + 0.16]} />
          <Fosco color="#C7A877" flatShading />
        </mesh>
      )}
      {tipo === "palha" && (
        <mesh position={[0, altura + 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[Math.max(largura, fundura) * 0.86, 1.3, 4]} />
          <Fosco color="#D8B45A" flatShading />
        </mesh>
      )}
      {tipo === "coloridas" && (
        <mesh position={[0, altura + 0.45, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, fundura / 1.1]}>
          <cylinderGeometry args={[0.62, 0.62, largura + 0.3, 3, 1, false, Math.PI / 6]} />
          <Fosco color="#C2453A" flatShading />
        </mesh>
      )}
    </group>
  );
};

/** As casas: no fundo e nos lados, longe de onde os personagens ficam (x -4 a 4, z -2 a 6). */
const Casas: React.FC<{ tipo: NonNullable<Paleta["casas"]>; rio: boolean; semente: number; livre: Livre }> = ({ tipo, rio, semente, livre }) => {
  const lista = useMemo(() => {
    const r = sorteio(31 + semente);
    const casas: Array<{ x: number; z: number; tom: number; giro: number }> = [];
    for (let i = 0; i < 40 && casas.length < 16; i++) {
      const fundo = i % 3 !== 0;
      const x = fundo ? (r() - 0.5) * 34 : (r() < 0.5 ? -1 : 1) * (7 + r() * 9);
      const z = fundo ? (rio ? -12.5 : -6) - r() * 12 : -3 + r() * 9;
      if (casas.some((c) => Math.hypot(c.x - x, c.z - z) < 3.6)) continue;
      // Nem na frente da câmera, nem no caminho dela (a casa tem uns 3 m: confere os cantos)
      if (![[0, 0], [1.6, 1.6], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]].every(([dx, dz]) => livre(x + dx, z + dz))) continue;
      casas.push({ x, z, tom: r() * 0.999, giro: (r() - 0.5) * 0.5 });
    }
    return casas;
  }, [rio, semente, livre]);
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
      <Fosco color="#CDAE74" flatShading roughness={1} />
    </mesh>
    {Array.from({ length: 45 }, (_, i) => (
      <mesh key={i} castShadow position={[-44 + i * 2, 3.65, 0.4]}>
        <boxGeometry args={[0.9, 0.5, 0.6]} />
        <Fosco color="#C4A268" flatShading />
      </mesh>
    ))}
    {[-30, -16, -6, 6, 16, 30].map((x) => (
      <mesh key={x} castShadow position={[x, 2.6, 0.2]}>
        <boxGeometry args={[2.6, 5.2, 2.6]} />
        <Fosco color="#C8A66C" flatShading roughness={1} />
      </mesh>
    ))}
    {/* O portão */}
    <mesh position={[0, 1.2, 0.72]}>
      <boxGeometry args={[2.2, 2.4, 0.05]} />
      <Fosco color="#6B4A2E" />
    </mesh>
  </group>
);

/** Pedras soltas pelo chão (deserto e aldeia). */
const Pedras: React.FC<{ livre?: Livre; semente: number }> = ({ livre = sempre, semente }) => {
  const lista = useMemo(() => {
    const r = sorteio(53 + semente);
    return Array.from({ length: 26 }, () => {
      const x = (r() - 0.5) * 40;
      const z = -14 + r() * 18;
      return { x, z, tam: 0.15 + r() * 0.45, giro: r() * 6, tom: r() };
    }).filter((p) => !(Math.abs(p.x) < 4 && p.z > -3 && p.z < 7) && livre(p.x, p.z));
  }, [livre, semente]);
  return (
    <>
      {lista.map((p, i) => (
        <mesh key={i} castShadow position={[p.x, p.tam * 0.35, p.z]} rotation={[p.giro, p.giro * 2, 0]} scale={[1.3, 0.8, 1]}>
          <icosahedronGeometry args={[p.tam, 0]} />
          <Fosco color={p.tom > 0.5 ? "#B39A72" : "#9E8862"} flatShading />
        </mesh>
      ))}
    </>
  );
};


// ---------- Reino: o castelo no fundo ----------
const PEDRA = "#ABA49A";
const Torre: React.FC<{ x: number; z: number; altura: number; raio: number; telhado: string }> = ({ x, z, altura, raio, telhado }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, altura / 2, 0]}>
      <cylinderGeometry args={[raio, raio * 1.05, altura, 10]} />
      <Fosco color={PEDRA} flatShading roughness={1} />
    </mesh>
    <mesh position={[0, altura + raio * 0.9, 0]}>
      <coneGeometry args={[raio * 1.25, raio * 1.8, 10]} />
      <Fosco color={telhado} flatShading />
    </mesh>
    {/* A bandeira no alto */}
    <mesh position={[0, altura + raio * 2.2, 0]}>
      <cylinderGeometry args={[0.05, 0.05, 1.6, 5]} />
      <Fosco color="#5C4630" />
    </mesh>
    <mesh position={[0.45, altura + raio * 2.6, 0]}>
      <boxGeometry args={[0.85, 0.5, 0.03]} />
      <Fosco color={telhado} />
    </mesh>
    {/* As janelinhas */}
    {[0.45, 0.7].map((f) => (
      <mesh key={f} castShadow position={[0, altura * f, raio + 0.01]}>
        <boxGeometry args={[0.35, 0.7, 0.05]} />
        <Fosco color="#2E2A28" />
      </mesh>
    ))}
  </group>
);

const Castelo: React.FC = () => (
  <group position={[0, 0, -30]}>
    {/* O muro com ameias */}
    <mesh position={[0, 3, 0]}>
      <boxGeometry args={[26, 6, 2]} />
      <Fosco color={PEDRA} flatShading roughness={1} />
    </mesh>
    {Array.from({ length: 13 }, (_, i) => (
      <mesh key={i} castShadow position={[-12 + i * 2, 6.4, 0.5]}>
        <boxGeometry args={[1, 0.8, 0.9]} />
        <Fosco color="#A19A90" flatShading />
      </mesh>
    ))}
    {/* A torre de menagem no meio, mais alta */}
    <mesh position={[0, 6.5, -4]}>
      <boxGeometry args={[9, 13, 6]} />
      <Fosco color="#B2ABA1" flatShading roughness={1} />
    </mesh>
    <Torre x={-13} z={0} altura={9} raio={1.9} telhado="#3F63B8" />
    <Torre x={13} z={0} altura={9} raio={1.9} telhado="#3F63B8" />
    <Torre x={-5} z={-4} altura={16} raio={1.6} telhado="#C2453A" />
    <Torre x={5} z={-4} altura={16} raio={1.6} telhado="#C2453A" />
    {/* O portão em arco */}
    <mesh position={[0, 1.6, 1.02]}>
      <boxGeometry args={[3, 3.2, 0.05]} />
      <Fosco color="#5C3F28" />
    </mesh>
    <mesh position={[0, 3.2, 1.02]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.5, 1.5, 0.05, 16, 1, false, -Math.PI / 2, Math.PI]} />
      <Fosco color="#5C3F28" />
    </mesh>
  </group>
);

// ---------- Mar: a água no fundo, a espuma na beira e os barcos ----------
const BEIRA = -5;
const Mar: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, BEIRA - 100]}>
      <planeGeometry args={[400, 200]} />
      <Fosco color="#2F86C9" roughness={0.1} metalness={0.2} {...deitado} />
    </mesh>
    {/* A água rasa e a espuma na beira */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, BEIRA - 1.2]}>
      <planeGeometry args={[400, 2.4]} />
      <Fosco color="#5FB6E0" roughness={0.15} metalness={0.1} {...deitado} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, BEIRA + 0.1]}>
      <planeGeometry args={[400, 0.45]} />
      <Fosco color="#F6FBFF" roughness={1} {...deitado} />
    </mesh>
  </group>
);

const Barco: React.FC<{ x: number; z: number; giro: number; vela: string }> = ({ x, z, giro, vela }) => (
  <group position={[x, 0.05, z]} rotation={[0, giro, 0]}>
    <mesh position={[0, 0.35, 0]} scale={[1, 0.5, 0.42]}>
      <cylinderGeometry args={[1.9, 1.3, 1.4, 6]} />
      <Fosco color="#7A5132" flatShading />
    </mesh>
    <mesh position={[0, 2.2, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 3.4, 5]} />
      <Fosco color="#5C4630" />
    </mesh>
    <mesh position={[0.05, 2.4, 0]}>
      <boxGeometry args={[0.04, 2.2, 1.9]} />
      <Fosco color={vela} flatShading />
    </mesh>
  </group>
);

const Barcos: React.FC = () => (
  <>
    <Barco x={-9} z={-16} giro={0.4} vela="#F4EEE0" />
    <Barco x={6} z={-24} giro={-0.3} vela="#E8D2A6" />
    <Barco x={18} z={-38} giro={0.2} vela="#F4EEE0" />
    <Barco x={-22} z={-44} giro={-0.5} vela="#D9B98A" />
  </>
);

// ---------- Salão do trono: chão de pedra, tapete vermelho, colunas e o trono ----------
const OURO = "#D9A93E";
const Salao: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <Fosco color="#9A8670" roughness={0.7} map={manchas()} />
    </mesh>
    {/* As lajotas: linhas mais escuras no chão */}
    {Array.from({ length: 13 }, (_, i) => (
      <mesh key={`l${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -14 + i * 2.5]}>
        <planeGeometry args={[32, 0.06]} />
        <Fosco color="#7A6854" {...deitado} />
      </mesh>
    ))}
    {/* O tapete vermelho até o trono */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -1]} receiveShadow>
      <planeGeometry args={[3.2, 24]} />
      <Fosco color="#9E2430" roughness={1} {...deitado} />
    </mesh>
    {[-1.65, 1.65].map((x) => (
      <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.035, -1]}>
        <planeGeometry args={[0.12, 24]} />
        <Fosco color={OURO} {...deitado} />
      </mesh>
    ))}
    {/* As paredes: o fundo e os lados */}
    <mesh position={[0, 7, -15]}>
      <boxGeometry args={[34, 14, 1]} />
      <Fosco color="#B9A68A" flatShading roughness={1} />
    </mesh>
    {[-16.5, 16.5].map((x) => (
      <mesh key={x} castShadow position={[x, 7, 0]}>
        <boxGeometry args={[1, 14, 32]} />
        <Fosco color="#AE9B80" flatShading roughness={1} />
      </mesh>
    ))}
    {/* Os estandartes na parede do fundo */}
    {[-6, 6].map((x) => (
      <group key={x} position={[x, 7.5, -14.45]}>
        <mesh>
          <boxGeometry args={[2.2, 5, 0.05]} />
          <Fosco color="#9E2430" />
        </mesh>
        <mesh position={[0, 0.6, 0.04]}>
          <boxGeometry args={[0.9, 0.9, 0.02]} />
          <Fosco color={OURO} />
        </mesh>
      </group>
    ))}
    {/* As colunas, em duas fileiras */}
    {[-6.5, 6.5].flatMap((x) =>
      [-11, -5, 1, 7].map((z) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.7, 0.6, 1.7]} />
            <Fosco color="#C9B99E" flatShading />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <cylinderGeometry args={[0.62, 0.7, 11.4, 12]} />
            <Fosco color="#D8CAB0" flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 11.9, 0]}>
            <boxGeometry args={[1.8, 0.6, 1.8]} />
            <Fosco color="#C9B99E" flatShading />
          </mesh>
          {/* A tocha acesa na coluna */}
          <mesh position={[0, 4.2, 0.75]}>
            <coneGeometry args={[0.16, 0.4, 6]} />
            <Fosco color="#FFB547" emissive="#FF8A1F" emissiveIntensity={1.4} />
          </mesh>
        </group>
      )),
    )}
    {/* O trono no alto dos degraus */}
    <group position={[0, 0, -12]}>
      {[0, 1, 2].map((d) => (
        <mesh key={d} castShadow position={[0, 0.2 + d * 0.4, -d * 0.6]}>
          <boxGeometry args={[6 - d * 1.2, 0.4, 3.4 - d * 0.6]} />
          <Fosco color="#C4B293" flatShading />
        </mesh>
      ))}
      <group position={[0, 1.2, -1.4]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1.8, 1, 1.4]} />
          <Fosco color={OURO} flatShading metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.05, 0.05]}>
          <boxGeometry args={[1.4, 0.15, 1.1]} />
          <Fosco color="#9E2430" />
        </mesh>
        <mesh position={[0, 2.3, -0.6]}>
          <boxGeometry args={[1.8, 3.4, 0.25]} />
          <Fosco color={OURO} flatShading metalness={0.3} />
        </mesh>
        <mesh position={[0, 2.1, -0.46]}>
          <boxGeometry args={[1.3, 2.4, 0.05]} />
          <Fosco color="#9E2430" />
        </mesh>
      </group>
    </group>
  </group>
);

// Onde pode ter planta e pedra: nada no mar nem na frente do castelo
const naAreia = (_x: number, z: number) => z > BEIRA + 1;
const foraDoCastelo = (x: number, z: number) => !(Math.abs(x) < 19 && z < -18);
const livreDo = (c: Paleta) => (c.mar ? naAreia : c.castelo ? foraDoCastelo : undefined);

/** O mundo inteiro, com a luz e o céu, no lugar escolhido. */
export const Mundo: React.FC<{
  balanco: number;
  queda?: number;
  ponte?: boolean;
  tendas?: boolean;
  rio?: boolean;
  ambiente?: Ambiente;
  /** A semente do episódio: as árvores, as casas e as pedras mudam de lugar */
  semente?: number;
  hora?: Hora;
  /** Onde a cena acontece agora (a sombra do sol cobre em volta) */
  centro?: [number, number];
  /** O caminho da câmera: nada fica ali */
  livre?: Livre;
  /** Perto da câmera: sem folha de grama */
  semGrama?: Livre;
}> = ({ balanco, queda = 0, ponte = true, tendas = true, rio = true, ambiente = "campo", semente = 0, hora = "dia", centro = [0, 2], livre = sempre, semGrama = sempre }) => {
  const c = PALETAS[ambiente];
  const luz = luzDaHora(c, hora);
  // O que já tinha um filtro (mar, castelo) soma o caminho da câmera
  const doLugar = livreDo(c);
  const livreTudo = useMemo<Livre>(() => (doLugar ? (x, z) => doLugar(x, z) && livre(x, z) : livre), [doLugar, livre]);
  if (c.interior)
    return (
      <>
        <color attach="background" args={[c.ceu]} />
        <fog attach="fog" args={[c.nevoa, 30, 90]} />
        <Reflexo forca={0.25} />
        <Luzes hora={{ ...luz, sol: c.luzDoSol, forcaDoSol: 1.8, direcaoDoSol: [6, 20, 14], luzDoCeu: "#FFE9C9", forcaDoCeu: 0.8, contraluz: "#FFC982", forcaDaContraluz: 1.4 }} centro={centro} chao={c.luzDoChao} />
        <pointLight position={[0, 9, -8]} intensity={60} distance={30} color="#FFC982" />
        <Salao />
      </>
    );
  return (
    <>
      <color attach="background" args={[luz.ceuHorizonte]} />
      {/* A névoa da distância (o fundo clareia e dá profundidade) */}
      <fog attach="fog" args={[luz.nevoa, 22, 140]} />
      <Ceu topo={luz.ceuTopo} horizonte={luz.ceuHorizonte} sol={luz.direcaoDoSol} corDoSol={luz.sol} />
      <Reflexo forca={hora === "noite" ? 0.12 : 0.3} />
      <Luzes hora={luz} centro={centro} chao={c.luzDoChao} />
      <Chao cor={hora === "noite" ? new THREE.Color(c.chao).multiplyScalar(0.55).getStyle() : c.chao} />
      {rio && <Rio margem={c.margem} />}
      {rio && ponte && <Ponte balanco={balanco} queda={queda} />}
      <Arvores tipo={c.plantas} muitas={!c.casas && c.plantas !== "palmeiras"} livre={livreTudo} semente={semente} />
      <Montanhas cor={c.montanhas} semente={semente} />
      {hora !== "noite" && <Nuvens semente={semente} cor={hora === "tarde" ? "#FFE2C6" : "#FFFFFF"} />}
      {c.casas && <Casas tipo={c.casas} rio={rio} semente={semente} livre={livreTudo} />}
      {c.muralha && <Muralha />}
      {c.pedras && <Pedras livre={livreTudo} semente={semente} />}
      {c.castelo && <Castelo />}
      {c.mar && <Mar />}
      {c.mar && <Barcos />}
      {/* As tendas ficam à esquerda: a câmera do plano aberto vem da direita */}
      {tendas && livreTudo(-6.8, 0.4) && <Tenda x={-6.8} z={0.4} cor="#3D6FD6" />}
      {tendas && livreTudo(-9.6, 2.6) && <Tenda x={-9.6} z={2.6} cor="#D64545" />}
      {tendas && ambiente === "deserto" && livreTudo(8.5, -4) && <Tenda x={8.5} z={-4} cor="#D8A23A" />}
      {c.grama !== null && <Grama matiz={c.grama} rio={rio} semente={semente} livre={semGrama} />}
    </>
  );
};
