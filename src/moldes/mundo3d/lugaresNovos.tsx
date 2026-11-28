import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import { sorteio } from "./animacao";
import { ESTRADA, beiraDoVale, meioDaEstrada, naEstrada, noPlanalto, paraOVale, pontoNaEstrada } from "./estrada";
import { Fosco } from "./software";

// Os lugares novos do Mundo3D (28/11/2026), no mesmo low-poly dos outros (formas
// simples, cor chapada, nada baixado): a estrada de serra com a curva, a mureta,
// as placas de curva e o vale; o sertão (mandacaru, galho seco, chão rachado); e
// a praça da cidade europeia antiga (sobrados, torre com relógio, chafariz,
// postes). Leves para o render por software: material fosco, sem sombra do
// cenário, poucas peças (as repetidas numa malha só quando são muitas).

/** Camadas no chão (asfalto, faixas): um pouco acima e puxadas para a frente, sem tremer de longe */
const deitado = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } as const;
const FPS = 30;

// ---------- Texturas do chão (feitas uma vez, por código) ----------

let rachado: THREE.CanvasTexture | null = null;
/** O chão rachado do sertão: as gretas da terra seca (as bordas de um mosaico de Voronoi, que emenda sem costura) */
export function texturaRachada() {
  if (rachado) return rachado;
  const n = 256;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const ctx = c.getContext("2d");
  if (ctx) {
    const r = sorteio(41);
    const sementes = Array.from({ length: 46 }, () => [r() * n, r() * n] as const);
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        let d1 = Infinity;
        let d2 = Infinity;
        for (const [sx, sy] of sementes) {
          // A distância "dando a volta" (a textura repete sem emenda)
          const dx = Math.min(Math.abs(x - sx), n - Math.abs(x - sx));
          const dy = Math.min(Math.abs(y - sy), n - Math.abs(y - sy));
          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
        const borda = Math.sqrt(d2) - Math.sqrt(d1);
        // A greta (escura e fina) e a placa de terra (clara no meio, um tico mais escura perto da greta)
        const v = borda < 1.2 ? 158 : borda < 2.6 ? 214 : 238 + Math.min(17, borda * 0.5);
        const k = (y * n + x) * 4;
        img.data[k] = v;
        img.data[k + 1] = v * 0.97;
        img.data[k + 2] = v * 0.93;
        img.data[k + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }
  rachado = new THREE.CanvasTexture(c);
  rachado.wrapS = THREE.RepeatWrapping;
  rachado.wrapT = THREE.RepeatWrapping;
  // Cada placa de terra com uns 45 cm
  rachado.repeat.set(120, 120);
  rachado.colorSpace = THREE.SRGBColorSpace;
  rachado.anisotropy = 8;
  return rachado;
}

let pedras: THREE.CanvasTexture | null = null;
/** O calçamento de pedra da praça: pedras arredondadas em fileiras desencontradas, com o rejunte */
export function texturaDePedras() {
  if (pedras) return pedras;
  const n = 256;
  const c = document.createElement("canvas");
  c.width = n;
  c.height = n;
  const ctx = c.getContext("2d");
  if (ctx) {
    const r = sorteio(17);
    ctx.fillStyle = "#8F8A80";
    ctx.fillRect(0, 0, n, n);
    const linhas = 8;
    const h = n / linhas;
    for (let l = 0; l < linhas; l++) {
      const desloca = l % 2 ? h * 0.6 : 0;
      for (let k = -1; k < 6; k++) {
        const w = n / 5;
        const x = k * w + desloca;
        const tom = 200 + Math.floor(r() * 40);
        ctx.fillStyle = `rgb(${tom},${tom - 4},${tom - 12})`;
        for (const dx of [-n, 0, n]) {
          ctx.beginPath();
          ctx.roundRect(x + dx + 3, l * h + 3, w - 6, h - 6, 9);
          ctx.fill();
        }
      }
    }
  }
  pedras = new THREE.CanvasTexture(c);
  pedras.wrapS = THREE.RepeatWrapping;
  pedras.wrapT = THREE.RepeatWrapping;
  // Cada pedra com uns 45 cm
  pedras.repeat.set(170, 170);
  pedras.colorSpace = THREE.SRGBColorSpace;
  pedras.anisotropy = 8;
  return pedras;
}

// ---------- Serra: a estrada, a mureta, as placas de curva e o vale ----------

/** Uma fita deitada que acompanha o meio da estrada, de `de` a `ate` metros do meio (positivo: para o lado do vale) */
function fita(pontos: ReturnType<typeof meioDaEstrada>, de: number, ate: number, y: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  pontos.forEach((p, i) => {
    const { nx, nz } = paraOVale(p);
    pos.push(p.x + nx * de, y, p.z + nz * de, p.x + nx * ate, y, p.z + nz * ate);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // A normal sempre para cima (a ordem dos vértices já deixa a face virada para o céu) (a fita é deitada; a ordem dos vértices não importa)
  const normal = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, 0, 1, 0);
  return g;
}

/** O chão da serra: o planalto (até a beira do vale), o paredão de pedra e o fundo do vale lá embaixo */
const ChaoDaSerra: React.FC<{ cor: string; mapa: THREE.Texture }> = ({ cor, mapa }) => {
  const { planalto, paredao } = useMemo(() => {
    const beira = beiraDoVale();
    // O planalto: tudo do lado de cá da beira (a forma em x, -z: o plano deitado vira o z)
    const forma = new THREE.Shape();
    forma.moveTo(beira[0][0], -beira[0][1]);
    for (const [x, z] of beira.slice(1)) forma.lineTo(x, -z);
    for (const [x, z] of [[-200, -200], [-200, 200], [200, 200]]) forma.lineTo(x, -z);
    const planalto = new THREE.ShapeGeometry(forma);
    // O UV pelo lugar no mundo (a textura repete igual à do chão dos outros lugares)
    const uv = planalto.getAttribute("uv") as THREE.BufferAttribute;
    const p = planalto.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 200) / 400, (p.getY(i) + 200) / 400);
    // O paredão: de pé, da beira até o fundo do vale, com a pedra um pouco torta embaixo
    const r = sorteio(5);
    const pos: number[] = [];
    const idx: number[] = [];
    beira.forEach(([x, z], i) => {
      pos.push(x, 0.02, z, x + (r() - 0.5) * 1.2, ESTRADA.fundoDoVale, z + (r() - 0.5) * 1.2);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const paredao = new THREE.BufferGeometry();
    paredao.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    paredao.setIndex(idx);
    paredao.computeVertexNormals();
    return { planalto, paredao };
  }, []);
  return (
    <>
      <mesh geometry={planalto} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <Fosco color={cor} map={mapa} roughness={0.95} />
      </mesh>
      <mesh geometry={paredao}>
        <Fosco color="#8C7A60" flatShading roughness={1} />
      </mesh>
      {/* O fundo do vale, com as copas das árvores lá embaixo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ESTRADA.fundoDoVale, 0]}>
        <planeGeometry args={[500, 500]} />
        <Fosco color="#4F8A3C" roughness={1} />
      </mesh>
    </>
  );
};

/** As árvores do vale (copas redondas e pinheiros), lá embaixo: numa malha só cada tipo */
const ArvoresDoVale: React.FC<{ semente: number }> = ({ semente }) => {
  const copas = useMemo(() => {
    const r = sorteio(61 + semente);
    const lista: Array<{ x: number; z: number; s: number; cor: THREE.Color }> = [];
    for (let i = 0; i < 400 && lista.length < 140; i++) {
      const x = (r() - 0.5) * 140;
      const z = 30 - r() * 110;
      if (noPlanalto(x, z)) continue;
      lista.push({ x, z, s: 1.6 + r() * 1.8, cor: new THREE.Color().setHSL(0.27 + r() * 0.06, 0.5, 0.26 + r() * 0.12) });
    }
    return lista;
  }, [semente]);
  const ref = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    copas.forEach((c, i) => {
      o.position.set(c.x, ESTRADA.fundoDoVale + c.s * 1.2, c.z);
      o.scale.setScalar(c.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.cor);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [copas]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, copas.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <Fosco roughness={1} flatShading />
    </instancedMesh>
  );
};

/** A placa de curva (amarela, a seta preta para o lado da curva), num poste */
const PlacaDeCurva: React.FC<{ x: number; z: number; giro: number }> = ({ x, z, giro }) => (
  <group position={[x, 0, z]} rotation={[0, giro, 0]}>
    <mesh position={[0, 0.7, 0]}>
      <boxGeometry args={[0.08, 1.4, 0.08]} />
      <Fosco color="#9AA0A6" roughness={0.7} />
    </mesh>
    <mesh position={[0, 1.55, 0.05]}>
      <boxGeometry args={[0.62, 0.78, 0.04]} />
      <Fosco color="#F2C230" roughness={0.8} />
    </mesh>
    {/* A seta ">" em duas barras pretas */}
    {[1, -1].map((s) => (
      <mesh key={s} position={[0.02, 1.55 + s * 0.13, 0.075]} rotation={[0, 0, s * -0.85]}>
        <boxGeometry args={[0.36, 0.09, 0.01]} />
        <meshBasicMaterial color="#1B1B1B" />
      </mesh>
    ))}
  </group>
);

/** A mureta de metal (a lâmina sanfonada nos postes), do lado de fora da estrada */
const Mureta: React.FC<{ pontos: ReturnType<typeof meioDaEstrada> }> = ({ pontos }) => {
  const afastar = ESTRADA.largura / 2 + ESTRADA.folgaDaMureta;
  const pecas = useMemo(() => {
    const lista: Array<{ x: number; z: number; angulo: number; comprimento: number }> = [];
    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1];
      const b = pontos[i];
      const na = paraOVale(a);
      const nb = paraOVale(b);
      const ax = a.x + na.nx * afastar;
      const az = a.z + na.nz * afastar;
      const bx = b.x + nb.nx * afastar;
      const bz = b.z + nb.nz * afastar;
      lista.push({ x: (ax + bx) / 2, z: (az + bz) / 2, angulo: Math.atan2(-(bz - az), bx - ax), comprimento: Math.hypot(bx - ax, bz - az) + 0.04 });
    }
    return lista;
  }, [pontos, afastar]);
  return (
    <>
      {pecas.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.angulo, 0]}>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[p.comprimento, 0.3, 0.06]} />
            <Fosco color="#C9CED3" roughness={0.45} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.62, 0.035]}>
            <boxGeometry args={[p.comprimento, 0.07, 0.02]} />
            <Fosco color="#E3E7EA" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[-p.comprimento / 2, 0.38, -0.06]}>
            <boxGeometry args={[0.1, 0.76, 0.1]} />
            <Fosco color="#7D848B" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
};

/** O carro que desce a serra de vez em quando (uma vez a cada 11 s), na faixa da direita */
const CarroDaSerra: React.FC<{ semente: number }> = ({ semente }) => {
  const quadro = useCurrentFrame();
  const t = quadro / FPS + (semente % 9);
  const periodo = 11;
  const velocidade = 10.5;
  const andou = (t % periodo) * velocidade;
  const p = pontoNaEstrada(andou + 45, 1.6);
  const cor = ["#2F6FD6", "#D9D4C7", "#C2453A", "#3E8E5A"][semente % 4];
  const roda = -andou / 0.32;
  if (p.z < -70) return null;
  return (
    <group position={[p.x, 0, p.z]} rotation={[0, Math.atan2(-p.dz, p.dx), 0]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[3.7, 0.62, 1.65]} />
        <meshStandardMaterial color={cor} roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[-0.25, 1.08, 0]} castShadow>
        <boxGeometry args={[2, 0.5, 1.5]} />
        <meshStandardMaterial color={cor} roughness={0.35} metalness={0.35} />
      </mesh>
      <mesh position={[-0.25, 1.08, 0]}>
        <boxGeometry args={[2.02, 0.36, 1.52]} />
        <meshStandardMaterial color="#9CC7E0" roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Os faróis */}
      {[-0.55, 0.55].map((zz) => (
        <mesh key={zz} position={[1.86, 0.62, zz]}>
          <boxGeometry args={[0.04, 0.16, 0.3]} />
          <meshBasicMaterial color="#FFF6D0" />
        </mesh>
      ))}
      {[-1.2, 1.2].flatMap((x) =>
        [-0.82, 0.82].map((zz) => (
          <mesh key={`${x}${zz}`} position={[x, 0.32, zz]} rotation={[Math.PI / 2, roda, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.22, 12]} />
            <meshStandardMaterial color="#222" roughness={0.8} />
          </mesh>
        )),
      )}
    </group>
  );
};

/** A estrada de serra inteira: o chão, o asfalto com as faixas, a mureta, as placas de curva, o vale e o carro */
export const Serra: React.FC<{ chao: string; mapa: THREE.Texture; semente: number; carro: boolean }> = ({ chao, mapa, semente, carro }) => {
  const pontos = useMemo(() => meioDaEstrada(1.5, 60, -90), []);
  const geos = useMemo(() => {
    const meia = ESTRADA.largura / 2;
    return {
      asfalto: fita(pontos, -meia, meia, 0.02),
      acostamento: fita(pontos, -meia - 0.9, meia + 0.9, 0.012),
      faixas: [-0.2, 0.06].map((d) => fita(pontos, d, d + 0.14, 0.03)),
      bordas: [-meia + 0.2, meia - 0.35].map((d) => fita(pontos, d, d + 0.15, 0.03)),
    };
  }, [pontos]);
  // A mureta só do lado de fora (o do vale), do trecho reto até depois da curva
  const daMureta = useMemo(() => pontos.filter((p) => p.x < 36 && p.z > -45), [pontos]);
  // As placas de curva: na beira de fora da curva, de frente para quem vem
  const placas = useMemo(() => {
    const C = ESTRADA.curva;
    // Do lado de fora da curva (o do morro), viradas para o meio dela
    const r = C.raio + ESTRADA.largura / 2 + 0.9;
    return [105, 122, 139, 156, 173].map((graus) => {
      const a = (graus * Math.PI) / 180;
      return { x: C.x + r * Math.cos(a), z: C.z + r * Math.sin(a), giro: Math.atan2(C.x - (C.x + r * Math.cos(a)), C.z - (C.z + r * Math.sin(a))) };
    });
  }, []);
  return (
    <group>
      <ChaoDaSerra cor={chao} mapa={mapa} />
      <mesh geometry={geos.acostamento} receiveShadow>
        <Fosco color="#9A9282" roughness={1} {...deitado} />
      </mesh>
      <mesh geometry={geos.asfalto} receiveShadow>
        <Fosco color="#4B4E55" roughness={0.95} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} />
      </mesh>
      {geos.faixas.map((g, i) => (
        <mesh key={`f${i}`} geometry={g}>
          <Fosco color="#F2C230" roughness={0.9} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      {geos.bordas.map((g, i) => (
        <mesh key={`b${i}`} geometry={g}>
          <Fosco color="#F4F4F0" roughness={0.9} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
        </mesh>
      ))}
      <Mureta pontos={daMureta} />
      {placas.map((p, i) => (
        <PlacaDeCurva key={i} {...p} />
      ))}
      <ArvoresDoVale semente={semente} />
      {/* O morro do lado de fora da curva (a estrada contorna a encosta) */}
      {[
        [-26, -22, 11, 9],
        [-36, -46, 15, 14],
        [-24, -60, 12, 11],
        [-44, -14, 13, 8],
      ].map(([x, z, raio, altura], i) => (
        <mesh key={i} position={[x, altura / 2 - 0.3, z]} rotation={[0, i * 0.7, 0]}>
          <coneGeometry args={[raio, altura, 7]} />
          <Fosco color={["#5E9E44", "#548F3D", "#67A84B", "#4F8A3A"][i]} flatShading roughness={1} />
        </mesh>
      ))}
      {carro && <CarroDaSerra semente={semente} />}
    </group>
  );
};

/** Onde a serra deixa pôr planta, pedra e grama: no planalto e fora do asfalto */
export const livreNaSerra = (x: number, z: number) => noPlanalto(x, z) && !naEstrada(x, z, 1.4);

// ---------- Sertão: mandacaru, galho seco ----------

/** O mandacaru: o tronco em gomos e os braços que sobem */
const Mandacaru: React.FC<{ x: number; z: number; escala: number; tom: number; bracos: number }> = ({ x, z, escala, tom, bracos }) => {
  const verde = new THREE.Color().setHSL(0.3 + tom * 0.04, 0.38, 0.3 + tom * 0.08).getStyle();
  const lados = [1, -1, 1].slice(0, bracos);
  return (
    <group position={[x, 0, z]} scale={escala} rotation={[0, tom * 6, 0]}>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.17, 0.2, 2.6, 8]} />
        <Fosco color={verde} flatShading />
      </mesh>
      <mesh position={[0, 2.62, 0]}>
        <sphereGeometry args={[0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Fosco color={verde} flatShading />
      </mesh>
      {lados.map((lado, i) => {
        const altura = 1.1 + i * 0.45;
        const sobe = 0.7 + ((tom * 7 + i) % 1) * 0.5;
        return (
          <group key={i} position={[0, altura, 0]} rotation={[0, i * 1.9, 0]}>
            <mesh position={[lado * 0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.11, 0.12, 0.45, 7]} />
              <Fosco color={verde} flatShading />
            </mesh>
            <mesh position={[lado * 0.5, sobe / 2, 0]}>
              <cylinderGeometry args={[0.11, 0.12, sobe + 0.1, 7]} />
              <Fosco color={verde} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

/** O galho seco da caatinga: varetas cinza-marrom saindo do chão, abertas em leque */
const GalhoSeco: React.FC<{ x: number; z: number; escala: number; tom: number }> = ({ x, z, escala, tom }) => (
  <group position={[x, 0, z]} scale={escala} rotation={[0, tom * 6, 0]}>
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const abre = 0.35 + ((i * 0.37 + tom) % 1) * 0.35;
      const h = 0.9 + ((i * 0.53 + tom) % 1) * 0.7;
      return (
        <mesh key={i} position={[Math.sin(a) * Math.sin(abre) * h * 0.5, (h / 2) * Math.cos(abre), Math.cos(a) * Math.sin(abre) * h * 0.5]} rotation={[Math.cos(a) * abre, 0, -Math.sin(a) * abre]}>
          <cylinderGeometry args={[0.015, 0.035, h, 4]} />
          <Fosco color={i % 2 ? "#8A7560" : "#9C8670"} flatShading />
        </mesh>
      );
    })}
  </group>
);

/** As plantas do sertão: mandacarus e galhos secos, longe do caminho da câmera */
export const Caatinga: React.FC<{ livre: (x: number, z: number) => boolean; semente: number }> = ({ livre, semente }) => {
  const lista = useMemo(() => {
    const r = sorteio(19 + semente);
    const plantas: Array<{ x: number; z: number; escala: number; tom: number; mandacaru: boolean; bracos: number }> = [];
    for (let i = 0; i < 120 && plantas.length < 46; i++) {
      const longe = i < 70;
      const x = (r() - 0.5) * (longe ? 80 : 40);
      const z = longe ? -10 - r() * 40 : -4 + r() * 12;
      const escala = 0.8 + r() * 0.7;
      const tom = r();
      const mandacaru = r() < 0.55;
      const bracos = 1 + Math.floor(r() * 3);
      if (Math.abs(x) < (longe ? 2.5 : 5.5)) continue;
      if (!livre(x, z)) continue;
      plantas.push({ x, z, escala, tom, mandacaru, bracos });
    }
    return plantas;
  }, [livre, semente]);
  return (
    <>
      {lista.map((p, i) =>
        p.mandacaru ? <Mandacaru key={i} x={p.x} z={p.z} escala={p.escala} tom={p.tom} bracos={p.bracos} /> : <GalhoSeco key={i} x={p.x} z={p.z} escala={p.escala} tom={p.tom} />,
      )}
    </>
  );
};

// ---------- Cidade europeia antiga: sobrados, torre com relógio, chafariz e postes ----------

/** A rua que sai da praça pelos dois lados (o fundo dos figurantes: z -3,4 a -4,4) */
const RUA_DA_PRACA = -3.9;
const ESTUQUES = ["#E3C79A", "#D49A6A", "#EADFC6", "#C9B9A0", "#D7B370", "#B98C6E"];
const VENEZIANAS = ["#4E6B4A", "#7A4B32", "#3F5F7A", "#5C6E55"];

/** Um sobrado de pedra e estuque: 2 ou 3 andares, janelas de veneziana, porta em arco e telhado */
const Sobrado: React.FC<{ largura: number; andares: number; tom: number; janela: string }> = ({ largura, andares, tom, janela }) => {
  const parede = ESTUQUES[Math.floor(tom * ESTUQUES.length) % ESTUQUES.length];
  const altura = andares * 2.9 + 0.4;
  const fundura = 5;
  const colunas = Math.max(2, Math.floor(largura / 1.7));
  const passo = largura / colunas;
  return (
    <group>
      <mesh position={[0, altura / 2, 0]}>
        <boxGeometry args={[largura, altura, fundura]} />
        <Fosco color={parede} flatShading roughness={1} />
      </mesh>
      {/* O rodapé de pedra e a cornija */}
      <mesh position={[0, 0.45, fundura / 2 + 0.03]}>
        <boxGeometry args={[largura, 0.9, 0.06]} />
        <Fosco color="#A89D8B" flatShading />
      </mesh>
      <mesh position={[0, altura - 0.1, 0]}>
        <boxGeometry args={[largura + 0.2, 0.22, fundura + 0.3]} />
        <Fosco color="#F1E8D6" flatShading />
      </mesh>
      {/* O telhado de duas águas (a cumeeira de lado a lado) */}
      {/* (o prisma de três lados deitado: a ponta para cima, a base na largura do sobrado e um tico de beiral) */}
      <mesh position={[0, altura + 0.65, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1.3, 1, (fundura / 2 + 0.3) / 0.866]}>
        <cylinderGeometry args={[1, 1, largura + 0.15, 3, 1, false, Math.PI / 6]} />
        <Fosco color="#8E4A33" flatShading />
      </mesh>
      {/* As janelas com as venezianas abertas, andar por andar (o de baixo tem a porta em arco no meio) */}
      {Array.from({ length: andares }, (_, a) =>
        Array.from({ length: colunas }, (_, k) => {
          const x = -largura / 2 + passo * (k + 0.5);
          const y = a * 2.9 + 1.55;
          if (a === 0 && k === Math.floor(colunas / 2)) {
            return (
              <group key={`${a}-${k}`} position={[x, 0, fundura / 2 + 0.03]}>
                <mesh position={[0, 1.05, 0]}>
                  <boxGeometry args={[1.0, 2.1, 0.05]} />
                  <Fosco color="#4A3022" />
                </mesh>
                <mesh position={[0, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.5, 0.5, 0.05, 12, 1, false, -Math.PI / 2, Math.PI]} />
                  <Fosco color="#4A3022" />
                </mesh>
              </group>
            );
          }
          return (
            <group key={`${a}-${k}`} position={[x, y, fundura / 2 + 0.03]}>
              <mesh>
                <boxGeometry args={[0.62, 1.05, 0.05]} />
                <Fosco color="#2E2A2A" />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.5, 0, 0.02]}>
                  <boxGeometry args={[0.32, 1.1, 0.04]} />
                  <Fosco color={janela} />
                </mesh>
              ))}
              {a > 0 && (
                <mesh position={[0, -0.6, 0.12]}>
                  <boxGeometry args={[0.85, 0.08, 0.28]} />
                  <Fosco color="#C9BBA2" />
                </mesh>
              )}
            </group>
          );
        }),
      )}
    </group>
  );
};

/** A torre da igreja com o relógio (os ponteiros parados nas 4 e 10: o relógio "de cidade") e o telhado em ponta */
const TorreComRelogio: React.FC = () => (
  <group>
    <mesh position={[0, 7, 0]}>
      <boxGeometry args={[3.2, 14, 3.2]} />
      <Fosco color="#D9CBB0" flatShading roughness={1} />
    </mesh>
    {[4.5, 9.2].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <boxGeometry args={[3.4, 0.22, 3.4]} />
        <Fosco color="#B9AA8E" flatShading />
      </mesh>
    ))}
    {/* O vão do sino */}
    <mesh position={[0, 12.2, 1.61]}>
      <boxGeometry args={[1.1, 1.9, 0.05]} />
      <Fosco color="#2F2A26" />
    </mesh>
    <group position={[0, 10.3, 1.62]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.06, 24]} />
        <Fosco color="#F7F2E6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.86, 0.06, 6, 24]} />
        <Fosco color="#3A332C" />
      </mesh>
      <mesh position={[0.16, 0.18, 0.05]} rotation={[0, 0, -0.72]}>
        <boxGeometry args={[0.07, 0.52, 0.02]} />
        <meshBasicMaterial color="#1E1A16" />
      </mesh>
      <mesh position={[-0.22, 0.08, 0.05]} rotation={[0, 0, 1.2]}>
        <boxGeometry args={[0.07, 0.38, 0.02]} />
        <meshBasicMaterial color="#1E1A16" />
      </mesh>
    </group>
    <mesh position={[0, 15.8, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[2.45, 3.6, 4]} />
      <Fosco color="#6E5A4C" flatShading />
    </mesh>
    <mesh position={[0, 18.1, 0]}>
      <boxGeometry args={[0.08, 1.0, 0.08]} />
      <Fosco color="#3A332C" />
    </mesh>
    <mesh position={[0, 18.25, 0]}>
      <boxGeometry args={[0.45, 0.08, 0.08]} />
      <Fosco color="#3A332C" />
    </mesh>
  </group>
);

/** O chafariz no meio da praça: a bacia de pedra de oito lados, a água e a coluna com a taça */
const Chafariz: React.FC = () => {
  const quadro = useCurrentFrame();
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[1.5, 1.6, 0.6, 8]} />
        <Fosco color="#C9BFAE" flatShading />
      </mesh>
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[1.32, 1.32, 0.04, 8]} />
        <Fosco color="#5FA8D3" roughness={0.15} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 1.2, 8]} />
        <Fosco color="#C9BFAE" flatShading />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <cylinderGeometry args={[0.55, 0.2, 0.25, 8]} />
        <Fosco color="#C9BFAE" flatShading />
      </mesh>
      {/* O fio de água que cai da taça (pulsa de leve) */}
      <mesh position={[0, 2.05, 0]} scale={[1, 1 + Math.sin(quadro / 5) * 0.08, 1]}>
        <coneGeometry args={[0.12, 0.5, 6]} />
        <Fosco color="#BFE6F7" roughness={0.2} emissive="#BFE6F7" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

/** O poste de ferro com a lanterna */
const Poste: React.FC = () => (
  <group>
    <mesh position={[0, 1.6, 0]}>
      <cylinderGeometry args={[0.06, 0.09, 3.2, 6]} />
      <Fosco color="#2B2B2E" roughness={0.6} />
    </mesh>
    <mesh position={[0, 3.35, 0]}>
      <boxGeometry args={[0.32, 0.42, 0.32]} />
      <Fosco color="#F6E7B0" roughness={0.5} emissive="#F6D98A" emissiveIntensity={0.35} />
    </mesh>
    <mesh position={[0, 3.62, 0]}>
      <coneGeometry args={[0.28, 0.2, 4]} />
      <Fosco color="#2B2B2E" />
    </mesh>
  </group>
);

/** A praça da cidade antiga: a fileira de sobrados no fundo e dos lados, a torre, o chafariz, postes e duas árvores */
export const Praca: React.FC<{ livre: (x: number, z: number) => boolean; semente: number }> = ({ livre, semente }) => {
  const predios = useMemo(() => {
    const r = sorteio(29 + semente);
    const lista: Array<{ x: number; z: number; giro: number; largura: number; andares: number; tom: number; janela: string }> = [];
    // Uma fileira de casas coladas: no fundo (z -11), de frente; e dos lados (x -12 e 12), de frente para a praça
    const fileira = (de: number, ate: number, poe: (meio: number, largura: number) => { x: number; z: number; giro: number }) => {
      let a = de;
      while (a < ate) {
        const largura = 4.4 + r() * 2.4;
        const meio = a + largura / 2;
        const lugar = poe(meio, largura);
        const p = { ...lugar, largura, andares: r() < 0.45 ? 3 : 2, tom: r(), janela: VENEZIANAS[Math.floor(r() * VENEZIANAS.length)] };
        // Nada no caminho da câmera (confere os cantos do prédio)
        const meia = largura / 2;
        const cantos = p.giro === 0 ? [[-meia, 0], [meia, 0], [0, -2.5], [0, 2.5]] : [[0, -meia], [0, meia], [-2.5, 0], [2.5, 0]];
        // Dos lados, a rua que sai da praça fica aberta (por ela passam a gente e a carroça da rua viva)
        const naRua = p.giro !== 0 && Math.abs(p.z - RUA_DA_PRACA) < meia + 1.3;
        if (!naRua && cantos.every(([dx, dz]) => livre(p.x + dx, p.z + dz))) lista.push(p);
        a += largura;
      }
    };
    fileira(-30, 30, (meio) => ({ x: meio, z: -13.5, giro: 0 }));
    fileira(-9, 9, (meio) => ({ x: -14, z: meio - 2, giro: Math.PI / 2 }));
    fileira(-9, 9, (meio) => ({ x: 14, z: meio - 2, giro: -Math.PI / 2 }));
    return lista;
  }, [livre, semente]);
  const postes = useMemo(() => [[-5.5, -6.5], [5.5, -6.5], [-8.2, 1.5], [8.2, 1.5]].filter(([x, z]) => livre(x, z)), [livre]);
  const arvores = useMemo(() => [[-8.5, -8.5], [9, -8.8]].filter(([x, z]) => livre(x, z)), [livre]);
  return (
    <group>
      {predios.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.giro, 0]}>
          <Sobrado largura={p.largura} andares={p.andares} tom={p.tom} janela={p.janela} />
        </group>
      ))}
      <group position={[7.5, 0, -19]}>
        <TorreComRelogio />
      </group>
      {livre(-4.2, -5.2) && (
        <group position={[-4.2, 0, -5.2]}>
          <Chafariz />
        </group>
      )}
      {postes.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Poste />
        </group>
      ))}
      {arvores.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.13, 0.18, 1.8, 6]} />
            <Fosco color="#6E5034" flatShading />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <icosahedronGeometry args={[1.25, 0]} />
            <Fosco color="#5E8F45" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
};
