import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { z } from "zod";
import { SONS, Som, type TipoSom } from "../componentes/audio/Som";
import { CartaoDeChamada } from "../componentes/cenas/ChamadaAnimada";
import type { FormaDaBoca, Momento, Palavra, Visual } from "../componentes/personagens/Boneco";
import { Palito } from "../componentes/personagens/Palito";
import { fontes } from "../nucleo/marca";
import { ACESSORIOS, AMBIENTES, FIGURINOS, PALETAS, trajeDoAmbiente, trajeDoChapeu, visualDeFigurante, type Traje } from "./mundo3d/ambientes";
import { aplicar, distancia, PLANOS, poseDoPlano, poseNoTempo, projetar, type Plano, type Ponto } from "./mundo3d/camera";
import { BonecoDePecas } from "./mundo3d/BonecoDePecas";
import { Mundo, PONTE, sorteio } from "./mundo3d/Mundo";
import { duracaoDoMolde, estimarPalavras, FPS, MUNDO3D, quadrosDaCenaDoMundo3D } from "./tempos";

// PROTÓTIPO (18/11/2026, branch prototipo-mundo3d): personagens de palito
// dentro de um mundo 3D low-poly, com planos de câmera de cinema, multidão e
// legenda curta com destaque. A voz vem do npm run narrar (o narrador e quem
// fala, cada um com a sua); os passos, o rangido e o estalo, do npm run sons:mundo.

const POSES = ["normal", "cintura", "celular", "cabeca", "explicando", "comemorando", "pensando", "sentado", "apontando", "caido"] as const;
const EXPRESSOES = ["neutra", "feliz", "radiante", "preocupada", "surpresa", "brava", "sem-graca", "medo", "aliviada"] as const;
const CHAPEUS = ["coroa", "capacete", "faixa"] as const;
const estadoSchema = z.object({
  pose: z.enum(POSES).describe('"apontando": o braço esticado para a frente; "caido": tomba e fica deitado no chão'),
  expressao: z.enum(EXPRESSOES),
  ate: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe("Andar: [x, z] para onde a pessoa caminha durante a cena (as cenas seguintes continuam de lá)"),
});
const SONS_DO_MUNDO = ["passos", "rangido", "estalo", "impacto", "transicao"] as const satisfies readonly TipoSom[];

const narracaoSchema = z
  .object({
    audio: z.string(),
    duracaoSeg: z.number(),
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number() })),
    boca: z.array(z.object({ inicio: z.number(), forma: z.string() })).optional(),
    chave: z.string().optional(),
  })
  .passthrough()
  .describe("Preenchido pelo npm run narrar (não editar à mão)");

const personagemSchema = z.object({
  id: z.string(),
  roupa: z.string().default("#2B2340").describe("A cor do traço (braços e pernas)"),
  veste: z.string().optional().describe("A cor da túnica"),
  chapeu: z.enum(CHAPEUS).optional(),
  onde: z.tuple([z.number(), z.number()]).describe("[x, z] no chão do mundo"),
  naPonte: z.boolean().default(false),
  espelhar: z.boolean().default(false),
  // Com visual (e o desenho próprio do elenco, se houver): o personagem do canal, com rosto, no lugar do palito
  visual: z.record(z.string(), z.unknown()).optional().describe("O visual do elenco do canal (com ele, sai o boneco com rosto)"),
  desenho: z.unknown().optional().describe("O desenho próprio do elenco (vem do npm run canal)"),
  detalhes3d: z
    .object({
      barba: z.boolean().optional(),
      figurino: z.enum(FIGURINOS).optional().describe("Sem isso, a roupa que o lugar pede"),
      acessorio: z.enum(ACESSORIOS).optional().describe("Sem isso, o que o lugar pede (véu, turbante...)"),
      pano: z.string().optional().describe("Cor do véu, do turbante ou da capa"),
    })
    .optional()
    .describe("Barba e, se quiser mudar, a roupa e o que vai na cabeça"),
});

export const mundo3dSchema = z.object({
  titulo: z.string().describe("Título grande no começo (maiúsculas)"),
  destaqueDoTitulo: z.string().optional(),
  personagens: z.array(personagemSchema).max(4),
  bonecos: z
    .enum(["palito", "pecas"])
    .default("palito")
    .describe('"palito" (estilo Mundo 3D, desenho de traço por cima do 3D) ou "pecas" (estilo Bonecos 3D: tudo em 3D, nas cores do elenco)'),
  multidao: z
    .object({
      quantos: z.number().int().min(1).max(30),
      roupa: z.string().default("#4A4F57"),
      veste: z.string().optional(),
      chapeu: z.enum(CHAPEUS).optional(),
      naPonte: z.boolean().default(true),
      marchando: z.boolean().default(true),
    })
    .nullable()
    .optional(),
  cenas: z
    .array(
      z.object({
        fala: z.string().describe("O que o narrador (ou quem fala) diz nesta cena"),
        quem: z.string().optional().describe("Id de quem fala (a boca mexe); sem isso, é o narrador"),
        plano: z.enum(PLANOS),
        foco: z.string().describe('Id de um personagem, "multidao" ou "ponte"'),
        destaque: z.array(z.string()).default([]).describe("Palavras que saem em amarelo na legenda"),
        estados: z.record(z.string(), estadoSchema).optional(),
        multidao: estadoSchema.optional(),
        balanco: z.number().min(0).max(1).default(0).describe("O quanto a ponte balança nesta cena"),
        queda: z.string().optional().describe("A palavra em que a ponte cai (com o estalo), ex.: desabou"),
        sons: z
          .array(
            z.object({
              tipo: z.enum(SONS_DO_MUNDO),
              em: z.number().min(0).default(0).describe("Segundos desde o começo da cena"),
              repetir: z.number().int().min(1).max(12).default(1),
            }),
          )
          .default([]),
        narracao: narracaoSchema.optional(),
      }),
    )
    .min(1),
  voz: z
    .string()
    .default("pm_alex")
    .describe("Id de src/componentes/personagens/vozes.ts (feminina-1..15, masculina-1..15) ou o nome do Kokoro (pf_dora, pm_alex, pm_santa)"),
  vozes: z
    .record(z.string(), z.object({ voz: z.string(), velocidade: z.number().optional() }))
    .optional()
    .describe("A voz de quem fala, pelo id"),
  velocidade: z.number().min(0.7).max(1.4).default(1),
  pronuncia: z.record(z.string(), z.string()).optional(),
  musica: z.string().optional().describe("musica/calma-esperanca.mp3, calma-reflexao.mp3 ou calma-drama.mp3"),
  volumeMusica: z.number().min(0).max(0.5).default(0.12),
  cenario: z
    .object({
      ambiente: z.enum(AMBIENTES).default("campo").describe("O lugar: muda o chão, o céu, as plantas, as casas e a roupa dos bonecos"),
      ponte: z.boolean().optional().describe("A ponte sobre o rio (padrão: só no campo)"),
      rio: z.boolean().optional().describe("O rio (padrão: o do lugar)"),
      tendas: z.boolean().optional().describe("As tendas (padrão: as do lugar)"),
    })
    .default({ ambiente: "campo" })
    .describe("O mundo da história"),
  ctaFinal: z.string().max(80).optional().describe("Frase do cartão do fim (com o logo da marca), sem @ e sem link na bio"),
  botaoFinal: z.string().max(24).optional().describe('O botão do cartão do fim, ex.: "Siga o canal 👆"'),
  semLegenda: z.boolean().default(false).describe("Só para a capa (o renderizar põe): sem a legenda"),
});

export type Mundo3DProps = z.infer<typeof mundo3dSchema>;

const ALTURA_DO_BONECO = 1.75;
/** A queda da ponte: quanto ela desce (metros); os quadros estão em MUNDO3D (tempos.ts) */
const QUADROS_DA_QUEDA = MUNDO3D.queda;
const DESCIDA_DA_QUEDA = 1.1;

type PalavraDita = Palavra & { texto: string };

// Onde começa cada cena e o tempo de cada palavra: o da voz (npm run narrar)
// ou, antes dela, a estimativa
function linhaDoTempo(cenas: Mundo3DProps["cenas"]) {
  let quadro = 0;
  return cenas.map((cena) => {
    const inicio = quadro;
    let palavras: PalavraDita[];
    let fala: number;
    let boca: FormaDaBoca[] | undefined;
    if (cena.narracao) {
      palavras = cena.narracao.legendas.map((l) => ({
        texto: l.texto,
        inicio: inicio + Math.round((l.inicioMs / 1000) * FPS),
        fim: inicio + Math.round((l.fimMs / 1000) * FPS),
      }));
      fala = Math.ceil(cena.narracao.duracaoSeg * FPS);
      boca = cena.narracao.boca?.map((b) => ({
        quadro: inicio + Math.round(b.inicio * FPS),
        forma: b.forma,
      }));
    } else {
      palavras = estimarPalavras(cena.fala).map((p) => ({
        texto: p.texto,
        inicio: inicio + p.inicio,
        fim: inicio + p.fim,
      }));
      fala = palavras.length ? palavras[palavras.length - 1].fim - inicio : 45;
    }
    const limpa = (t: string) => t.toLowerCase().replace(/[^\p{L}]/gu, "");
    const queda = cena.queda ? palavras.find((p) => limpa(p.texto).startsWith(limpa(cena.queda ?? "")))?.inicio : undefined;
    // O mesmo tempo que o tempos.ts calcula (o render, a prévia e a conferência batem)
    void fala;
    const fim = inicio + quadrosDaCenaDoMundo3D(cena);
    quadro = fim;
    return { cena, inicio, fim, palavras, boca, queda };
  });
}

export const duracaoDoMundo3D = (props: Mundo3DProps) => duracaoDoMolde("Mundo3D", props);

// Onde fica cada um da multidão: em fileiras na ponte (ou no chão, na frente dela)
function lugaresDaMultidao(quantos: number, naPonte: boolean): Array<[number, number]> {
  const r = sorteio(41);
  return Array.from({ length: quantos }, (_, i) => {
    const fileira = Math.floor(i / 3);
    const coluna = (i % 3) - 1;
    const z = naPonte ? PONTE.z2 - 0.5 - fileira * 0.75 : -2.5 - fileira * 0.8;
    return [coluna * 0.62 + (r() - 0.5) * 0.12, z + (r() - 0.5) * 0.15];
  });
}

// Palito: o traço na cor da roupa
const visualDe = (roupa: string): Visual => ({
  pele: "#FFFFFF",
  cabelo: "#2B2340",
  roupa,
  calca: roupa,
  sapato: roupa,
  penteado: "curto" as Visual["penteado"],
  roupaEstilo: "blusa",
});

/** Os tufos de grama na frente dos pés do palito: ele fica "dentro" do campo. */
const Tufo: React.FC<{ largura: number }> = ({ largura }) => (
  <svg viewBox="0 0 100 40" width={largura} height={largura * 0.4} style={{ overflow: "visible" }}>
    {[8, 20, 31, 44, 56, 67, 80, 92].map((x, i) => (
      <path
        key={x}
        d={`M${x - 4} 40 Q${x + (i % 2 ? 3 : -3)} ${18 - (i % 3) * 5} ${x + (i % 2 ? 6 : -6)} ${4 + (i % 3) * 4} Q${x + 1} 22 ${x + 4} 40 Z`}
        fill={i % 2 ? "#4E9A2E" : "#5FB33A"}
      />
    ))}
  </svg>
);

const Legenda: React.FC<{ palavras: PalavraDita[]; destaque: string[] }> = ({ palavras, destaque }) => {
  const frame = useCurrentFrame();
  const atual = palavras.findIndex((p) => p.inicio <= frame && frame < p.fim + 6);
  if (atual < 0) return null;
  // Até 3 palavras por vez, como nos vídeos curtos
  const comeco = Math.floor(atual / 3) * 3;
  const grupo = palavras.slice(comeco, comeco + 3);
  const marcar = new Set(destaque.map((d) => d.toLowerCase()));
  return (
    <div
      style={{
        position: "absolute",
        top: 1180,
        left: 60,
        right: 60,
        textAlign: "center",
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: 92,
        lineHeight: 1.05,
        textTransform: "uppercase",
      }}
    >
      {grupo.map((p, i) => {
        const limpa = p.texto.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
        return (
          <React.Fragment key={i}>
            <span
              style={{
                color: marcar.has(limpa) ? "#FFD23F" : "#FFFFFF",
                WebkitTextStroke: "12px #15121C",
                paintOrder: "stroke fill",
              }}
            >
              {p.texto.replace(/[.,!?:]+$/, "")}
            </span>{" "}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const Titulo: React.FC<{ texto: string; destaque?: string }> = ({ texto, destaque }) => {
  const frame = useCurrentFrame();
  if (frame > 84) return null;
  const opacidade = Math.min(1, (84 - frame) / 10);
  const marcar = (destaque ?? "").toLowerCase();
  return (
    <div
      style={{
        position: "absolute",
        top: 190,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: fontes.titulo,
        fontWeight: 800,
        fontSize: 96,
        lineHeight: 1.02,
        textTransform: "uppercase",
        opacity: opacidade,
      }}
    >
      {texto.split(" ").map((p, i) => (
        <React.Fragment key={i}>
          <span
            style={{
              color: p.toLowerCase().replace(/[^\p{L}]/gu, "") === marcar ? "#FFD23F" : "#FFFFFF",
              WebkitTextStroke: "13px #15121C",
              paintOrder: "stroke fill",
            }}
          >
            {p}
          </span>{" "}
        </React.Fragment>
      ))}
    </div>
  );
};

export const Mundo3D: React.FC<Mundo3DProps> = (props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const linha = useMemo(() => linhaDoTempo(props.cenas), [props.cenas]);
  const agora = linha.find((t) => frame < t.fim) ?? linha[linha.length - 1];
  const cena = agora.cena;
  const camera = useMemo(() => new THREE.PerspectiveCamera(40, width / height, 0.1, 400), [width, height]);

  // A ponte balança (cada vez mais) nas cenas com balanço
  const balanco = cena.balanco ? Math.sin(frame / 3.2) * 0.07 * cena.balanco * Math.min(1, (frame - agora.inicio) / 40 + 0.2) : 0;
  // A ponte cai na palavra da queda e fica caída dali em diante (continuidade)
  const caiu = linha.find((t) => t.queda !== undefined)?.queda;
  const q = caiu !== undefined ? Math.min(1, Math.max(0, (frame - caiu) / QUADROS_DA_QUEDA)) : 0;
  const queda = q * q;

  // Quem está no mundo: os personagens e a multidão, cada um com o seu ponto
  const multidao = props.multidao;
  const pessoas = [
    ...props.personagens.map((p) => ({
      ...p,
      multidao: false,
      semente: p.id.length,
    })),
    ...(multidao
      ? lugaresDaMultidao(multidao.quantos, multidao.naPonte).map(([x, zz], i) => ({
          id: `multidao-${i}`,
          roupa: multidao.roupa,
          veste: multidao.veste,
          chapeu: multidao.chapeu,
          onde: [x, zz] as [number, number],
          naPonte: multidao.naPonte,
          espelhar: i % 2 === 1,
          multidao: true,
          semente: i + 3,
        }))
      : []),
  ];
  // Andar: cada personagem começa a cena onde a última caminhada terminou e, se a
  // cena tiver "ate", anda até lá em 85% da cena (devagar no começo e no fim)
  const indiceDaCena = linha.indexOf(agora);
  const caminhada = (id: string, onde: [number, number]) => {
    let de = onde;
    for (let j = 0; j < indiceDaCena; j++) {
      const ate = linha[j].cena.estados?.[id]?.ate;
      if (ate) de = ate;
    }
    const ate = cena.estados?.[id]?.ate;
    if (!ate) return { onde: de, andando: false, rumo: null as number | null };
    const t = Math.min(1, Math.max(0, (frame - agora.inicio) / Math.max(1, (agora.fim - agora.inicio) * 0.85)));
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return {
      onde: [de[0] + (ate[0] - de[0]) * e, de[1] + (ate[1] - de[1]) * e] as [number, number],
      andando: t > 0 && t < 1,
      rumo: Math.atan2(ate[0] - de[0], ate[1] - de[1]),
    };
  };
  const pontoDe = (p: (typeof pessoas)[number]): Ponto => {
    const [x, zz] = p.multidao ? p.onde : caminhada(p.id, p.onde).onde;
    if (!p.naPonte) return [x, 0, zz];
    // Na ponte: em cima das tábuas, girando junto com ela
    const y = PONTE.altura;
    const marcha = p.multidao && multidao?.marchando ? Math.abs(Math.sin(frame / 4)) * 0.05 : 0;
    return [x * Math.cos(balanco) - y * Math.sin(balanco), x * Math.sin(balanco) + y * Math.cos(balanco) + marcha - queda * DESCIDA_DA_QUEDA, zz];
  };

  // O foco do plano: um personagem, o meio da multidão ou o meio da ponte
  const foco: Ponto = (() => {
    if (cena.foco === "ponte") return [0, PONTE.altura, (PONTE.z1 + PONTE.z2) / 2];
    if (cena.foco === "multidao" && multidao) {
      const lugares = lugaresDaMultidao(multidao.quantos, multidao.naPonte);
      const meio = lugares[Math.floor(lugares.length / 2)];
      return [meio[0], multidao.naPonte ? PONTE.altura : 0, meio[1]];
    }
    const p = pessoas.find((q) => q.id === cena.foco) ?? pessoas[0];
    if (!p) return [0, 0, 0];
    const ponto = pontoDe(p);
    // Caído: a câmera mira o corpo deitado no chão, não onde a cabeça estaria de pé
    return cena.estados?.[p.id]?.pose === "caido" ? [ponto[0] + 0.9, ponto[1] - 0.9, ponto[2]] : ponto;
  })();
  // A tropa e a ponte pedem o plano mais aberto (cabe o grupo e o mundo)
  const escala = cena.foco === "multidao" || cena.foco === "ponte" ? 1.9 : 1;
  aplicar(camera, poseNoTempo(poseDoPlano(cena.plano as Plano, foco, escala), (frame - agora.inicio) / Math.max(1, agora.fim - agora.inicio)));

  const pecas = props.bonecos === "pecas";
  // Palito: desenhado por cima do 3D, de trás para a frente (quem está mais longe primeiro)
  const naTela = pecas
    ? []
    : pessoas
        .map((p) => {
          const pes = pontoDe(p);
          const cabeca: Ponto = [pes[0], pes[1] + ALTURA_DO_BONECO, pes[2]];
          const a = projetar(camera, pes, width, height);
          const b = projetar(camera, cabeca, width, height);
          return { p, a, alturaPx: Math.abs(a.y - b.y), dist: distancia(camera, pes) };
        })
        .filter((q) => q.a.naFrente && q.alturaPx > 8 && q.alturaPx < height * 3)
        .sort((m, n) => n.dist - m.dist);

  // O lugar: o que ele tem (rio, ponte, tendas) e a roupa que ele pede
  const ambiente = props.cenario.ambiente;
  const paleta = PALETAS[ambiente];
  const temPonte = props.cenario.ponte ?? ambiente === "campo";
  const temRio = props.cenario.rio ?? (paleta.rio || temPonte);
  const temTendas = props.cenario.tendas ?? paleta.tendas;
  const trajeDe = (p: (typeof pessoas)[number], visual: Visual): Traje => {
    const d = "detalhes3d" in p ? p.detalhes3d : undefined;
    return { ...trajeDoAmbiente(ambiente, visual, p.semente), ...trajeDoChapeu(p.chapeu), ...(d?.figurino && { figurino: d.figurino }), ...(d?.acessorio && { acessorio: d.acessorio }), ...(d?.pano && { pano: d.pano }) };
  };

  const estadoDe = (id: string, ehMultidao: boolean): Momento[] => {
    const estado = ehMultidao ? cena.multidao : cena.estados?.[id];
    return [
      {
        em: 0,
        pose: estado?.pose ?? "normal",
        expressao: estado?.expressao ?? "neutra",
      },
    ];
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#9ED2F6" }}>
      <ThreeCanvas width={width} height={height} camera={camera} gl={{ antialias: true }} style={{ position: "absolute", inset: 0 }}>
        <Mundo balanco={balanco} queda={queda} ponte={temPonte} rio={temRio} tendas={temTendas} ambiente={ambiente} />
        {/* Bonecos de peças: todos em 3D, o elenco com as cores dele; a multidão e os figurantes, variados */}
        {pecas && pessoas.map((p) => {
          const visual = "visual" in p && p.visual ? (p.visual as unknown as Visual) : visualDeFigurante(p.semente, p.veste);
          const [x, , zz] = pontoDe(p);
          return (
            <BonecoDePecas
              key={p.id}
              visual={visual}
              traje={trajeDe(p, visual)}
              detalhes={"detalhes3d" in p ? p.detalhes3d : undefined}
              momentos={estadoDe(p.id, p.multidao)}
              palavras={cena.quem === p.id ? agora.palavras : []}
              boca={cena.quem === p.id ? agora.boca : undefined}
              posicao={pontoDe(p)}
              // Quase de frente para a câmera, um pouco virado para quem está do lado (a multidão olha
              // para a frente); andando, de frente para onde vai
              virar={
                p.multidao
                  ? 0
                  : caminhada(p.id, p.onde).andando
                    ? (caminhada(p.id, p.onde).rumo as number)
                    : Math.atan2(camera.position.x - x, camera.position.z - zz) * 0.75 + (p.espelhar ? -0.18 : 0.18)
              }
              espelhar={p.espelhar}
              semente={p.semente}
              andando={p.multidao ? Boolean(multidao?.marchando) : caminhada(p.id, p.onde).andando}
            />
          );
        })}
      </ThreeCanvas>
      {naTela.map(({ p, a, alturaPx }) => {
        // A figura vai da cabeça (y 136) aos pés (y 958) no desenho de 1000
        const altura = alturaPx / 0.822;
        const largura = altura * 0.6;
        const fala = cena.quem === p.id ? agora.palavras : [];
        const boca = cena.quem === p.id ? agora.boca : undefined;
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: a.x - largura / 2,
              top: a.y - altura * 0.958 - (!p.multidao && caminhada(p.id, p.onde).andando ? Math.abs(Math.sin(frame / 4)) * altura * 0.03 : 0),
              // Caído: o desenho deita de lado, girando nos pés
              ...(cena.estados?.[p.id]?.pose === "caido" && {
                transform: `rotate(${(p.espelhar ? -1 : 1) * 90 * Math.min(1, (frame - agora.inicio) / 12)}deg)`,
                transformOrigin: `${largura / 2}px ${altura * 0.958}px`,
              }),
            }}
          >
            <Palito
              visual={visualDe(p.roupa)}
              momentos={estadoDe(p.id, p.multidao)}
              palavras={fala}
              boca={boca}
              altura={altura}
              espelhar={p.espelhar}
              semente={p.semente}
              veste={p.veste}
              chapeu={p.chapeu}
            />
            {!p.naPonte && (
              <div style={{ position: "absolute", left: largura * 0.05, top: altura * 0.958 - largura * 0.3 }}>
                <Tufo largura={largura * 0.9} />
              </div>
            )}
          </div>
        );
      })}
      {!props.semLegenda && <Legenda palavras={agora.palavras} destaque={cena.destaque} />}
      {/* A voz de cada cena, a música baixinho e os sons do mundo */}
      {linha.map((t, i) => (
        <Sequence key={i} from={t.inicio} durationInFrames={t.fim - t.inicio} layout="none" name={`Cena ${i + 1}`}>
          {t.cena.narracao && <Audio src={staticFile(t.cena.narracao.audio)} />}
          {t.cena.sons.flatMap((som, k) =>
            Array.from({ length: som.repetir }, (_, n) => <Som key={`${k}-${n}`} tipo={som.tipo} em={Math.round(som.em * FPS) + n * SONS[som.tipo].quadros} />),
          )}
          {t.queda !== undefined && <Som tipo="estalo" em={t.queda - t.inicio - 2} />}
        </Sequence>
      ))}
      {props.musica && <Audio src={staticFile(props.musica)} volume={() => props.volumeMusica} />}
      {/* O cartão do fim, com o logo e a chamada da marca, por cima do último plano */}
      {props.ctaFinal && (
        <Sequence from={linha[linha.length - 1].fim} layout="none" name="CTA final">
          <CartaoDeChamada chamada={props.ctaFinal} botao={props.botaoFinal} />
          <Som tipo="sucesso" em={2} />
        </Sequence>
      )}
      <Titulo texto={props.titulo} destaque={props.destaqueDoTitulo} />
    </AbsoluteFill>
  );
};

export const mundo3dExemplo: Mundo3DProps = {
  titulo: "Por que soldados param de marchar na ponte?",
  destaqueDoTitulo: "marchar",
  personagens: [
    {
      id: "capitao",
      roupa: "#2B2340",
      veste: "#B23A3A",
      chapeu: "capacete",
      onde: [-1.4, 2.6],
      naPonte: false,
      espelhar: false,
    },
  ],
  multidao: {
    quantos: 15,
    roupa: "#3A3F47",
    veste: "#C0392B",
    chapeu: "capacete",
    naPonte: true,
    marchando: true,
  },
  cenas: [
    {
      fala: "Em 1831, na Inglaterra, uma tropa inteira atravessou esta ponte marchando.",
      plano: "aberto",
      foco: "ponte",
      destaque: ["1831", "marchando"],
      balanco: 0,
      sons: [{ tipo: "passos", em: 0, repetir: 3 }],
    },
    {
      fala: "Todos pisavam juntos, no mesmo ritmo.",
      plano: "medio",
      foco: "multidao",
      destaque: ["juntos", "ritmo"],
      multidao: { pose: "normal", expressao: "neutra" },
      balanco: 0.25,
      sons: [{ tipo: "passos", em: 0, repetir: 2 }],
    },
    {
      fala: "A ponte começou a balançar cada vez mais... e desabou.",
      plano: "de-baixo",
      foco: "multidao",
      destaque: ["balançar", "desabou"],
      multidao: { pose: "cabeca", expressao: "medo" },
      balanco: 1,
      queda: "desabou",
      sons: [{ tipo: "rangido", em: 0.2, repetir: 2 }],
    },
    {
      fala: "Desde então a ordem é: na ponte, cada um no seu passo!",
      quem: "capitao",
      plano: "close",
      foco: "capitao",
      destaque: ["passo"],
      estados: { capitao: { pose: "explicando", expressao: "brava" } },
      balanco: 0,
      sons: [],
    },
  ],
  voz: "pm_alex",
  vozes: { capitao: { voz: "pm_santa" } },
  velocidade: 1,
  musica: "musica/calma-drama.mp3",
  volumeMusica: 0.12,
  bonecos: "palito",
  cenario: { ambiente: "campo", ponte: true, tendas: true },
  ctaFinal: "Siga para mais histórias que mudaram o mundo",
  botaoFinal: "Siga o canal 👆",
  semLegenda: false,
};

export const QUADROS_POR_SEGUNDO = FPS;
