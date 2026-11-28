import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { z } from "zod";
import { SONS, Som, type TipoSom } from "../componentes/audio/Som";
import { BalaoDeChamada, CartaoDeChamada, medidaDoCartao } from "../componentes/cenas/ChamadaAnimada";
import { FraseNaLuz } from "../componentes/cenas/FraseNaLuz";
import type { FormaDaBoca, Momento, Palavra, Pose, Visual } from "../componentes/personagens/Boneco";
import { Palito } from "../componentes/personagens/Palito";
import { paginar } from "../componentes/texto/paginar";
import { fontes } from "../nucleo/marca";
import {
  ACESSORIOS,
  AMBIENTES,
  FIGURINOS,
  HORAS,
  PALETAS,
  sementeDoTexto,
  trajeDoAmbiente,
  trajeDoChapeu,
  variacaoDoFigurino,
  visualDeFigurante,
  type Ambiente,
  type Traje,
} from "./mundo3d/ambientes";
import { aplicar, distancia, MOVIMENTOS, PLANOS, planejarTomadas, projetar, type Plano, type Ponto } from "./mundo3d/camera";
import { BonecoDePecas } from "./mundo3d/BonecoDePecas";
import { COM_RUA, Figurantes } from "./mundo3d/figurantes";
import { caminhoLivre, lugaresDaMultidao, poseDaTomadaPronta, prepararTomadas, rostoDaTomada, type Palco } from "./mundo3d/filmagem";
import { ACOES, batidaDaFala, giroCurto, GRAUS, meioDaCabeca, passo, posicaoNoQuadro, posturaDaAcao, posturaNoQuadro, poseDoPalito, viver } from "./mundo3d/animacao";
import { anguloSuave, donoNoQuadro, montarAtuacao, numeroSuave, rumoBase } from "./mundo3d/atuacao";
import { ObjetoDeCena, OBJETOS } from "./mundo3d/objetos";
import { ehObjetoDeMao, ObjetoNaMao3D } from "./mundo3d/objetos";
import { TestaContexto, testaAgora, TIPOS_DE_TESTA } from "../componentes/personagens/MarcaNaTesta";
import { ObjetoNaMaoContexto, type TipoDeApoio } from "../componentes/objetos/ObjetosDeApoio";

/** Os objetos de festa que o palito (2D) sabe desenhar na mão */
const APOIO_2D: Partial<Record<string, TipoDeApoio>> = { "caixinha-de-alianca": "caixinha-de-alianca", buque: "buque", bolo: "bolo", presente: "presente", "terno-no-cabide": "terno" };
import { PainelDoQr, textoDoQr } from "../componentes/midia/QrCode";
import { Mundo, PONTE } from "./mundo3d/Mundo";
import { CamadaDaFala, ilustraSchema } from "../componentes/ilustracao";
import { duracaoDoMolde, estimarPalavras, FPS, MUNDO3D, quadrosDaCenaDoMundo3D } from "./tempos";

// PROTÓTIPO (18/11/2026, branch prototipo-mundo3d): personagens de palito
// dentro de um mundo 3D low-poly, com planos de câmera de cinema, multidão e
// legenda curta com destaque. A voz vem do npm run narrar (o narrador e quem
// fala, cada um com a sua); os passos, o rangido e o estalo, do npm run sons:mundo.

const POSES = ["normal", "cintura", "celular", "celular-baixo", "cabeca", "explicando", "comemorando", "pensando", "sentado", "apontando", "caido", "abraco"] as const;
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
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number(), fimDeFrase: z.boolean().optional() })),
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
  cenas: z
    .array(z.number().int().min(1))
    .optional()
    .describe("Só nestas cenas (1 = a primeira); sem isso, em todas. Entra e sai sempre num corte"),
  figurino: z
    .number()
    .int()
    .min(1)
    .max(5)
    .optional()
    .describe("Bonecos 3D: a variação da roupa (1 a 5, a mesma pessoa): 1 a do elenco, 2 barra e cinto de pano, 3 colete e manga comprida, 4 faixa no peito, 5 capa curta. Sem isso, muda sozinha a cada episódio"),
});

const acaoSchema = z.object({
  quem: z.string().describe('Id do personagem (ou "multidao")'),
  em: z.union([z.string(), z.number().min(0)]).describe("A palavra da fala em que a ação acontece (ex.: \"ajoelhou\") ou os segundos desde o começo da cena"),
  acao: z.enum(ACOES),
  ate: z.tuple([z.number(), z.number()]).optional().describe("andar/correr: [x, z] para onde vai"),
  para: z.string().optional().describe('Id de quem recebe (entregar), de quem abraça (abracar), para onde olha ou vira ("costas", "frente", "cima", "baixo" ou um id)'),
  expressao: z.enum(EXPRESSOES).optional(),
  objeto: z.enum(OBJETOS).optional().describe("entregar: o objeto que passa de mão (sem isso, o que está na mão)"),
});

export const mundo3dSchema = z.object({
  titulo: z.string().describe("Título grande no começo (maiúsculas)"),
  ctaInicial: z
    .string()
    .max(60)
    .optional()
    .describe('Balão curto (até 28 caracteres) embaixo do título nos primeiros segundos, como no Conversa'),
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
        mudancas: z
          .array(
            z.object({
              em: z.number().min(0).describe("Segundos desde o começo da cena"),
              quem: z.string().describe('Id do personagem ou "multidao"'),
              pose: z.enum(POSES),
              expressao: z.enum(EXPRESSOES),
            }),
          )
          .optional()
          .describe("Troca a pose e a expressão no meio da cena (nada fica parado mais de 4 s)"),
        acoes: z
          .array(acaoSchema)
          .optional()
          .describe("Bonecos 3D: o que cada um faz na palavra exata da fala (andar, ajoelhar, apontar, entregar, abraçar, chorar...), com transição suave"),
        lugar: z.enum(AMBIENTES).optional().describe("Muda o lugar a partir desta cena (com um escurecer rápido); fica até outra cena mudar"),
        camera: z
          .object({
            movimento: z.enum(MOVIMENTOS).default("auto").describe("aproximar, afastar, lado (desliza), girar (pouco), subir, parada; auto escolhe pelo plano"),
            cortar: z.boolean().default(true).describe("Fala comprida (mais de 5 s) ganha um segundo plano numa pausa da frase"),
          })
          .optional(),
        luz: z.boolean().optional().describe("A luz do céu sobre quem está no foco (ex.: Deus falando): um feixe dourado nesta cena"),
        testa: z
          .record(z.string(), z.enum(TIPOS_DE_TESTA))
          .optional()
          .describe('Marca na testa, pelo id: "marca" (sinal escuro), "brilho" (luz dourada), "marca-brilho" ou "nenhuma". Fica até outra cena mudar (ex.: o sinal de Caim)'),
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
        // Ilustração da fala (27/11/2026): o que é dito aparece na tela, na palavra exata
        ilustra: ilustraSchema,
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
      hora: z.enum(HORAS).default("dia").describe("dia, tarde (o sol baixo e dourado) ou noite (luar azul)"),
      semente: z.number().int().min(0).optional().describe("Muda o lugar das árvores, casas e pedras (sem isso, sai do título: cada episódio tem o seu)"),
      figurantes: z
        .boolean()
        .optional()
        .describe("Gente passando no fundo, o veículo (carro ou carroça) e o gato (padrão: ligado na cidade, no moderno, na aldeia e no mar)"),
    })
    .default({ ambiente: "campo", hora: "dia" })
    .describe("O mundo da história"),
  ctaFinal: z.string().max(80).optional().describe("Frase do cartão do fim (com o logo da marca), sem @ e sem link na bio"),
  botaoFinal: z.string().max(24).optional().describe('O botão do cartão do fim, ex.: "Siga o canal 👆"'),
  objetos: z
    .array(
      z.object({
        tipo: z.enum(OBJETOS),
        onde: z.tuple([z.number(), z.number()]).optional().describe("[x, z] no chão do mundo"),
        perto: z.string().optional().describe("Id do personagem: o objeto fica ao lado dele (segue quando ele anda)"),
        lado: z.enum(["esquerda", "direita"]).default("direita"),
        escala: z.number().min(0.3).max(3).default(1),
        cenas: z.array(z.number().int().min(1)).optional().describe("Só nestas cenas (1 = a primeira); sem isso, em todas"),
        naMao: z
          .boolean()
          .optional()
          .describe("Com perto: na mão de quem está perto (caixinha-de-alianca, buque, bolo, presente, terno-no-cabide, cajado, jarro, cesto-de-frutos, feixe-de-trigo)"),
      }),
    )
    .optional()
    .describe(
      "Objetos e animais da história: ovelha, cordeiro, altar, altar-com-fogo, fogueira, cesto-de-frutos, feixe-de-trigo, cajado, serpente, jarro, arvore-com-frutos, pedra-grande, caixinha-de-alianca, buque, bolo, presente, terno-no-cabide",
    ),
  qr: z
    .object({
      texto: z.string().max(300).optional().describe("O endereço (sem ele: o site da marca, do marca.json)"),
      legenda: z.string().max(28).optional().describe('Linha curta embaixo do QR, ex.: "Aponte a câmera"'),
    })
    .optional()
    .describe("QR Code de verdade (escaneável) no cartão do fim, acima da chamada"),
  final: z
    .object({
      frase: z.string().max(180).describe("A frase grande (versículo, citação, lição)"),
      linha: z.string().max(60).optional().describe("A linha menor embaixo: a referência, o autor"),
      botao: z.string().max(30).optional(),
    })
    .optional()
    .describe("Frase na luz: cena final escura com feixe de luz e a frase (versículo com a referência), antes do cartão do fim"),
  capa: z
    .object({
      titulo: z.string().optional().describe("O título da capa (sem isso, o do vídeo)"),
      destaque: z.string().optional().describe("A palavra do título em amarelo"),
      cena: z.number().int().min(1).optional().describe("De qual cena sai a imagem da capa (1 = a primeira)"),
      estados: z.record(z.string(), estadoSchema).optional().describe("A pose e a expressão de cada um na capa"),
    })
    .optional(),
  semLegenda: z.boolean().default(false).describe("Só para a capa (o renderizar põe): sem a legenda"),
});

export type Mundo3DProps = z.infer<typeof mundo3dSchema>;

const ALTURA_DO_BONECO = 1.75;
/** A queda da ponte: quanto ela desce (metros); os quadros estão em MUNDO3D (tempos.ts) */
const QUADROS_DA_QUEDA = MUNDO3D.queda;
const DESCIDA_DA_QUEDA = 1.1;

type PalavraDita = Palavra & { texto: string; fimDeFrase?: boolean };

// Onde começa cada cena e o tempo de cada palavra: o da voz (npm run narrar)
// ou, antes dela, a estimativa
// Ilustração da fala (27/11/2026): a faixa do alto para acima das cabeças, que sobem
// na tela quanto mais perto é o plano (no close o "Oração" caía no cabelo). Fixa por
// plano, para os itens não piscarem enquanto a câmera anda
const FIM_DA_FAIXA_DE_CIMA: Record<string, number> = { close: 470, detalhe: 470, ombro: 520, medio: 560, "medio-aberto": 700 };
const faixasDaIlustracao = (plano?: string) => ({
  topo: { y0: 210, y1: FIM_DA_FAIXA_DE_CIMA[plano ?? ""] ?? 880 },
  ...(plano === "close" ? { baixo: { y0: 1240, y1: 1400 } } : {}),
});

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
        ...(l.fimDeFrase ? { fimDeFrase: true } : {}),
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

// No close, o rosto ocupa o meio da tela: a legenda desce para não cobrir a boca e a barba
// As páginas vêm do paginar, como na Conversa e no Documentario (24/11/2026): antes
// eram grupos fixos de 3 palavras, que emendavam o fim de uma frase com o começo
// da outra ("CALMA, LIA VOU OLHAR"), separavam "dali a" e piscavam entre palavras.
// Uma página cabe em 2 linhas desta letra (uns 15 caracteres por linha); no close,
// que começa em 1420, uma linha só (2 passariam de 1540, embaixo dos botões do app).
const LETRAS_DA_LEGENDA = 24;
const LETRAS_NO_CLOSE = 15;
/** Até quanto tempo de silêncio entre a última palavra de uma cena e a primeira da outra a legenda fica na tela */
const EMENDAR_MS = 1500;
type PaginaDaLegenda = ReturnType<typeof paginar>[number] & { close: boolean };
/** As páginas da legenda de cada cena (no close, linhas mais curtas), na ordem do vídeo */
const paginasDasCenas = (linha: Array<{ cena: { plano: string }; palavras: PalavraDita[] }>): PaginaDaLegenda[] =>
  linha.flatMap(({ cena, palavras }) => {
    const close = cena.plano === "close";
    return paginar(
      palavras.map((p, n) => ({
        texto: p.texto,
        inicioMs: (p.inicio / FPS) * 1000,
        fimMs: (p.fim / FPS) * 1000,
        nova: n === 0,
        ...(p.fimDeFrase ? { fimDeFrase: true } : {}),
      })),
      close ? LETRAS_NO_CLOSE : LETRAS_DA_LEGENDA,
    ).map((pagina) => ({ ...pagina, close }));
  });
const Legenda: React.FC<{ paginas: PaginaDaLegenda[]; destaque: string[]; close?: boolean }> = ({ paginas, destaque, close = false }) => {
  const frame = useCurrentFrame();
  const agoraMs = (frame / FPS) * 1000;
  // A página fica até a próxima começar; depois da última palavra, some em 0,7 s. Na troca de
  // cena, se a fala continua (a próxima palavra vem em até 1,5 s), fica até ela: antes a legenda
  // sumia uns 0,5 s entre as cenas (anotação da crítica, 26/11/2026). Só no mesmo tipo de plano
  // (no close a legenda fica mais embaixo e mais curta)
  let indice = -1;
  paginas.forEach((p, i) => {
    if (p.startMs <= agoraMs) indice = i;
  });
  const pagina = paginas[indice];
  if (!pagina || pagina.close !== close) return null;
  const fimDaPagina = pagina.tokens[pagina.tokens.length - 1].toMs;
  const proxima = paginas[indice + 1];
  const emenda = proxima !== undefined && proxima.startMs - fimDaPagina <= EMENDAR_MS;
  if (agoraMs > fimDaPagina + 700 && !emenda) return null;
  const grupo = pagina.tokens.map((t) => ({ texto: t.text }));
  const marcar = new Set(destaque.map((d) => d.toLowerCase()));
  return (
    <div
      style={{
        position: "absolute",
        // No close, abaixo da boca, mas ainda na área segura (abaixo de ~1530 o app cobre)
        top: close ? 1420 : 1180,
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

/** O feixe de luz do céu sobre quem está no foco (Deus falando, um milagre) */
const LuzDoCeu: React.FC<{ x: number; y: number; desde: number }> = ({ x, y, desde }) => {
  const entra = Math.min(1, Math.max(0, desde / 14));
  const brilho = 0.85 + Math.sin(desde / 9) * 0.15;
  const chao = Math.min(1920, Math.max(700, y + 120));
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: entra * brilho, mixBlendMode: "screen" }}>
      <defs>
        <linearGradient id="luz-do-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6CF" stopOpacity={0.85} />
          <stop offset="1" stopColor="#FFE58A" stopOpacity={0.12} />
        </linearGradient>
        <radialGradient id="luz-no-chao">
          <stop offset="0" stopColor="#FFF3B0" stopOpacity={0.7} />
          <stop offset="1" stopColor="#FFF3B0" stopOpacity={0} />
        </radialGradient>
      </defs>
      <polygon points={`${x - 90},0 ${x + 90},0 ${x + 300},${chao} ${x - 300},${chao}`} fill="url(#luz-do-ceu)" />
      <ellipse cx={x} cy={chao - 40} rx={320} ry={110} fill="url(#luz-no-chao)" />
    </svg>
  );
};

/**
 * O título do começo e, embaixo dele na mesma coluna, o balão do CTA inicial: o balão
 * fica sempre logo depois da última linha (26/11/2026: a altura era estimada pelas
 * letras, e a 3ª linha de um título comprido caía embaixo do balão).
 */
const Titulo: React.FC<{ texto: string; destaque?: string; fixo?: boolean; balao?: React.ReactNode }> = ({ texto, destaque, fixo = false, balao }) => {
  const frame = useCurrentFrame();
  // O balão sai depois do título: o título some (transparente) e guarda o lugar
  if (frame > 84 && !fixo && !balao) return null;
  const opacidade = fixo ? 1 : Math.max(0, Math.min(1, (84 - frame) / 10));
  const marcar = (destaque ?? "").toLowerCase();
  return (
    <div style={{ position: "absolute", top: 190, left: 70, right: 70, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
    <div
      style={{
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
      {balao}
    </div>
  );
};

const POSES_COM_AS_DUAS_MAOS = new Set(["cabeca", "chorar", "orar", "ajoelhar-orando", "abraco", "cruzar-bracos", "comemorando", "comemorar", "levantar-bracos"]);

export const Mundo3D: React.FC<Mundo3DProps> = (props) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const linha = useMemo(() => linhaDoTempo(props.cenas), [props.cenas]);
  const paginas = useMemo(() => paginasDasCenas(linha), [linha]);
  const agora = linha.find((t) => frame < t.fim) ?? linha[linha.length - 1];
  const fimDasCenas = linha[linha.length - 1].fim;
  const cena = agora.cena;
  const indiceDaCena = linha.indexOf(agora);
  // near 0,3 (antes 0,1): o fundo de longe não "treme" (camadas do chão brigando)
  const camera = useMemo(() => new THREE.PerspectiveCamera(40, width / height, 0.3, 450), [width, height]);

  // A ponte balança (cada vez mais) nas cenas com balanço
  const balanco = cena.balanco ? Math.sin(frame / 3.2) * 0.07 * cena.balanco * Math.min(1, (frame - agora.inicio) / 40 + 0.2) : 0;
  // A ponte cai na palavra da queda e fica caída dali em diante (continuidade)
  const caiu = linha.find((t) => t.queda !== undefined)?.queda;
  const q = caiu !== undefined ? Math.min(1, Math.max(0, (frame - caiu) / QUADROS_DA_QUEDA)) : 0;
  const queda = q * q;

  const multidao = props.multidao;
  const pecas = props.bonecos === "pecas";
  const naCapa = props.semLegenda;
  const ids = useMemo(() => props.personagens.map((p) => p.id), [props.personagens]);
  // O lugar de cada cena: o da cena (cena.lugar) ou o da história
  const lugarDaCena = (n: number): Ambiente => {
    let l = props.cenario.ambiente;
    for (let k = 0; k <= n; k++) l = linha[k]?.cena.lugar ?? l;
    return l;
  };
  /** Quem está na cena n (sem "cenas", todos) */
  const presentes = (n: number) => props.personagens.filter((p) => !p.cenas?.length || p.cenas.includes(n + 1)).map((p) => p.id);
  const aqui = new Set(presentes(indiceDaCena));
  const semente = props.cenario.semente ?? sementeDoTexto(props.titulo);
  const lugares = useMemo(() => (multidao ? lugaresDaMultidao(multidao.quantos, multidao.naPonte, props.personagens.map((p) => p.onde), semente) : []), [multidao, props.personagens, semente]);

  // A atuação: as poses, as ações na palavra, os passos, os giros e quem segura o quê
  const atuacao = useMemo(
    () =>
      montarAtuacao(
        props.personagens.map((p) => ({ id: p.id, onde: p.onde })),
        linha.map((t) => ({
          inicio: t.inicio,
          fim: t.fim,
          palavras: t.palavras,
          estados: t.cena.estados,
          multidao: t.cena.multidao,
          mudancas: t.cena.mudancas,
          acoes: t.cena.acoes,
          quem: t.cena.quem,
        })),
        props.objetos ?? [],
      ),
    [props.personagens, props.objetos, linha],
  );
  const { trilhas } = atuacao;
  const ondeNoChao = (id: string, quadro: number) => posicaoNoQuadro(trilhas[id], quadro).onde;
  const presentesNoQuadro = (q: number) => presentes(Math.max(0, linha.findIndex((l) => q < l.fim) === -1 ? linha.length - 1 : linha.findIndex((l) => q < l.fim)));
  const rumoDe = (id: string, quadro: number) => anguloSuave((k) => rumoBase(id, k, trilhas, presentesNoQuadro), quadro, 10);
  /** O meio do rosto no mundo (sem a vida, só a postura da chave): para a câmera mirar */
  const rostoDe = (id: string, quadro: number, estatico = false): Ponto => {
    const pes = pontoNoChao(id, quadro, estatico);
    const r = meioDaCabeca(posturaNoQuadro(trilhas[id].chaves, quadro).postura);
    const giro = rumoDe(id, quadro);
    return [pes[0] + r[0] * Math.cos(giro) + r[2] * Math.sin(giro), pes[1] + r[1], pes[2] - r[0] * Math.sin(giro) + r[2] * Math.cos(giro)];
  };
  /** Os pés no mundo (na ponte, em cima das tábuas e girando com ela) */
  const pontoNoChao = (id: string, quadro: number, estatico = false): Ponto => {
    const p = props.personagens.find((x) => x.id === id);
    const [x, zz] = ondeNoChao(id, quadro);
    if (!p?.naPonte) return [x, 0, zz];
    const y = PONTE.altura;
    // Nas contas feitas uma vez (as tomadas), sem o balanço deste quadro: todas as abas do render calculam igual
    if (estatico) return [x, y, zz];
    return [x * Math.cos(balanco) - y * Math.sin(balanco), x * Math.sin(balanco) + y * Math.cos(balanco) - queda * DESCIDA_DA_QUEDA, zz];
  };
  const pontoDaMultidao = (i: number): Ponto => {
    const [x, zz] = lugares[i];
    if (!multidao?.naPonte) return [x, 0, zz];
    const y = PONTE.altura;
    const marcha = multidao.marchando ? Math.abs(Math.sin(frame / 4 + i)) * 0.05 : 0;
    return [x * Math.cos(balanco) - y * Math.sin(balanco), x * Math.sin(balanco) + y * Math.cos(balanco) + marcha - queda * DESCIDA_DA_QUEDA, zz];
  };
  const parceiroDe = (id: string, quadro: number) => {
    const aqui = ondeNoChao(id, quadro);
    return (
      presentesNoQuadro(quadro)
        .filter((o) => o !== id)
        .map((o) => ({ o, d: Math.hypot(ondeNoChao(o, quadro)[0] - aqui[0], ondeNoChao(o, quadro)[1] - aqui[1]) }))
        .sort((a, b) => a.d - b.d)[0]?.o ?? null
    );
  };

  // O meio do grupo (multidão) ou da ponte
  const meioDoGrupo = (foco: string): Ponto | null => {
    if (foco === "ponte") return [0, PONTE.altura + 1.3, (PONTE.z1 + PONTE.z2) / 2];
    if (foco === "multidao" && lugares.length) {
      const meio = lugares[Math.floor(lugares.length / 2)];
      return [meio[0], (multidao?.naPonte ? PONTE.altura : 0) + 1.3, meio[1]];
    }
    return null;
  };
  const focoValido = (foco: string) => (ids.includes(foco) || meioDoGrupo(foco) ? foco : (ids[0] ?? "ponte"));
  const sozinho = props.personagens.length === 1 && !multidao;

  // As tomadas: uma ou duas por cena; o lado de cada uma, o grupo do plano aberto e quem da multidão sai do plano
  const palco = useMemo<Palco>(
    () => ({
      ids,
      presentesNa: presentes,
      rostoDe: (id, quadro) => rostoDe(id, quadro, true),
      pesDe: (id, quadro) => pontoNoChao(id, quadro, true),
      meioDoGrupo,
      multidao: lugares,
      alturaDaMultidao: multidao?.naPonte ? PONTE.altura : 0,
      sozinho,
      largura: width,
      altura: height,
    }),
    // As funções só leem a trilha e os lugares (sem o quadro de agora)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, trilhas, lugares, multidao, sozinho, width, height],
  );
  const tomadas = useMemo(
    () =>
      prepararTomadas(
        planejarTomadas(
          linha.map((t, n) => ({
            inicio: t.inicio,
            fim: t.fim,
            plano: t.cena.plano as Plano,
            foco: focoValido(t.cena.foco),
            quem: t.cena.quem,
            movimento: t.cena.camera?.movimento,
            cortar: t.cena.camera?.cortar,
            palavras: t.palavras,
            // Mudou quem está ou o lugar: corta (ninguém aparece ou some no meio de um plano)
            comIlustracao: Boolean(t.cena.ilustra?.length),
            corteAntes: n > 0 && (presentes(n).join() !== presentes(n - 1).join() || lugarDaCena(n) !== lugarDaCena(n - 1)),
          })),
          ids,
        ),
        palco,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linha, palco],
  );
  const tomada = tomadas.find((t) => frame < t.fim) ?? tomadas[tomadas.length - 1];
  const progresso = (frame - tomada.inicio) / Math.max(1, tomada.fim - tomada.inicio);
  const escondidos = new Set(tomada.escondidos);
  // O caminho da câmera de todas as tomadas: nada de árvore, casa ou pedra ali
  const { livre, semGrama } = useMemo(() => caminhoLivre(tomadas, palco), [tomadas, palco]);

  // A câmera agora: segue o rosto do foco (macio e sem a vida, para não tremer)
  const grupoAgora = meioDoGrupo(tomada.foco);
  const suave = (f: (q: number) => Ponto): Ponto => {
    const n = 8;
    const soma: Ponto = [0, 0, 0];
    let peso = 0;
    for (let k = 0; k < n; k++) {
      const r = f(Math.max(tomada.inicio, frame - k));
      const w = 1 - k / n;
      soma[0] += r[0] * w;
      soma[1] += r[1] * w;
      soma[2] += r[2] * w;
      peso += w;
    }
    return [soma[0] / peso, soma[1] / peso, soma[2] / peso];
  };
  const rostoDoFoco = suave((q) => rostoDaTomada(tomada, q, { rostoDe: (id, k) => rostoDe(id, k), meioDoGrupo }));
  camera.clearViewOffset();
  aplicar(camera, poseDaTomadaPronta(tomada, progresso, rostoDoFoco, tomada.parceiro ? suave((q) => rostoDe(tomada.parceiro as string, q)) : null, { sozinho, ids }));

  // No cartão do fim, a imagem sobe para o rosto de quem está em cena ficar acima do selo do
  // logo (26/11/2026: o logo cobria o rosto do Caim). Desloca a "janela" da câmera (o 3D e os
  // palitos usam a mesma conta), sem mexer no cenário: embaixo aparece mais chão
  const inicioDoCta = fimDasCenas + (props.final ? MUNDO3D.final : 0);
  if (props.ctaFinal && frame >= inicioDoCta && !props.semLegenda) {
    const limite = medidaDoCartao(props.ctaFinal).topo - 110 - 40;
    let subir = 0;
    let folgaEmCima = Infinity;
    for (const p of props.personagens) {
      const r = rostoDe(p.id, frame);
      const queixo = projetar(camera, [r[0], r[1] - 0.3, r[2]], width, height);
      const alto = projetar(camera, [r[0], r[1] + 0.33, r[2]], width, height);
      if (!queixo.naFrente || queixo.x < -100 || queixo.x > width + 100 || alto.y > height) continue;
      subir = Math.max(subir, queixo.y - limite);
      folgaEmCima = Math.min(folgaEmCima, alto.y - 140);
    }
    // Sem cortar o alto da cabeça (no close, o rosto grande pode não caber inteiro)
    subir = Math.min(Math.max(0, subir), Math.max(0, folgaEmCima), 700);
    if (subir > 0) {
      const p = spring({ frame: frame - inicioDoCta, fps, config: { damping: 16, stiffness: 110 } });
      camera.setViewOffset(width, height, 0, subir * p, width, height);
    }
  }

  // A troca de lugar passa por um escurecer rápido
  const ambiente = lugarDaCena(indiceDaCena);
  const principal = props.cenario.ambiente === ambiente;
  const paleta = PALETAS[ambiente];
  const temPonte = principal ? (props.cenario.ponte ?? ambiente === "campo") : ambiente === "campo";
  const temRio = principal ? (props.cenario.rio ?? (paleta.rio || temPonte)) : paleta.rio || temPonte;
  const temTendas = principal ? (props.cenario.tendas ?? paleta.tendas) : paleta.tendas;
  const escuro = linha.reduce((max, t, n) => {
    if (n === 0 || lugarDaCena(n) === lugarDaCena(n - 1)) return max;
    return Math.max(max, 1 - Math.abs(frame - t.inicio + 0.5) / 9);
  }, 0);

  // A roupa (a do lugar da história, a da equipe e a variação do episódio)
  const trajeDe = (p: { semente: number; chapeu?: (typeof CHAPEUS)[number]; detalhes3d?: Mundo3DProps["personagens"][number]["detalhes3d"] }, visual: Visual): Traje => {
    const d = p.detalhes3d;
    return {
      ...trajeDoAmbiente(props.cenario.ambiente, visual, p.semente),
      ...trajeDoChapeu(p.chapeu),
      ...(d?.figurino && { figurino: d.figurino }),
      ...(d?.acessorio && { acessorio: d.acessorio }),
      ...(d?.pano && { pano: d.pano }),
    };
  };

  // Os objetos: no chão (num lugar fixo ou ao lado de alguém) ou na mão (e passam de mão)
  const objetos = props.objetos ?? [];
  const visivelDe = (o: (typeof objetos)[number]) => {
    // Sem buraco: aparece da primeira à última cena da lista (o objeto não some e volta)
    if (!o.cenas?.length) return { de: 0, ate: Infinity };
    const primeira = Math.min(...o.cenas) - 1;
    const ultima = Math.max(...o.cenas) - 1;
    return { de: linha[primeira]?.inicio ?? 0, ate: linha[ultima]?.fim ?? Infinity };
  };
  // No palito, só os objetos de festa (que ele sabe desenhar) vão na mão; os outros ficam ao lado
  const vaiNaMao = (o: (typeof objetos)[number]) => Boolean(o.naMao && o.perto && ehObjetoDeMao(o.tipo) && ids.includes(o.perto) && (pecas || APOIO_2D[o.tipo]));
  const objetosDaCena = objetos
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !vaiNaMao(o) && frame >= visivelDe(o).de && frame < visivelDe(o).ate)
    .flatMap(({ o, i }) => {
      const base: Ponto | null = o.perto && ids.includes(o.perto) ? pontoNoChao(o.perto, frame) : o.onde ? [o.onde[0], 0, o.onde[1]] : null;
      if (!base) return [];
      const lado = o.lado === "esquerda" ? -1 : 1;
      const posicao: [number, number, number] = o.perto ? [base[0] + lado * 0.75, base[1], base[2] + 0.25] : base;
      return [{ ...o, posicao, chave: `${o.tipo}-${i}` }];
    });
  /** O objeto que está na mão de "id" agora e a escala (entra e sai em 8 quadros) */
  const objetoNaMao = (id: string) => {
    for (let i = 0; i < objetos.length; i++) {
      const o = objetos[i];
      if (!vaiNaMao(o)) continue;
      const dono = donoNoQuadro(atuacao.posses, i, frame);
      if (dono?.dono !== id) continue;
      const { de, ate } = visivelDe(o);
      if (frame < de || frame >= ate) continue;
      const entra = de <= 0 ? 1 : Math.min(1, (frame - de) / 8);
      const sai = ate === Infinity ? 1 : Math.min(1, (ate - frame) / 8);
      return { tipo: o.tipo, escala: Math.max(0, Math.min(entra, sai)) };
    }
    return null;
  };

  // O estado de cada personagem neste quadro: postura (com a vida), expressão, celular e objeto
  const estadoDoAtor = (id: string, sementeDoAtor: number) => {
    const t = trilhas[id];
    const daCapa = naCapa ? props.capa?.estados?.[id] : undefined;
    const chave = posturaNoQuadro(t.chaves, frame);
    const base = daCapa ? (posturaDaAcao(daCapa.pose) ?? chave.postura) : chave.postura;
    const pos = posicaoNoQuadro(t, frame);
    const corpo = rumoDe(id, frame);
    // A cabeça vira para quem fala, para quem a ação pede ou para quem está junto
    const olharPara = (quadro: number) => {
      const c = (linha.find((l) => quadro < l.fim) ?? linha[linha.length - 1]).cena;
      const olhar = [...t.olhares].reverse().find((o) => o.quadro <= quadro && quadro < o.fim);
      const alvo =
        olhar?.alvo && typeof olhar.alvo === "object"
          ? olhar.alvo.id
          : c.quem && c.quem !== id && ids.includes(c.quem)
            ? c.quem
            : (linha.findIndex((l) => quadro < l.fim) + sementeDoAtor) % 3 !== 0
              ? parceiroDe(id, quadro)
              : null;
      const aqui = ondeNoChao(id, quadro);
      const mundo = alvo && trilhas[alvo] ? Math.atan2(ondeNoChao(alvo, quadro)[0] - aqui[0], ondeNoChao(alvo, quadro)[1] - aqui[1]) : 0;
      const rel = giroCurto(0, mundo - rumoDe(id, quadro), 1) / GRAUS;
      const cima = olhar?.alvo === "cima" ? -30 : olhar?.alvo === "baixo" ? 28 : 0;
      return { rel, cima };
    };
    const olhar = naCapa ? { rel: 0, cima: 0 } : { rel: numeroSuave((k) => olharPara(k).rel, frame, 8), cima: numeroSuave((k) => olharPara(k).cima, frame, 8) };
    const fala = cena.quem === id && !naCapa;
    const marcar = new Set(cena.destaque.map((d) => d.toLowerCase()));
    const batida = fala ? batidaDaFala(agora.palavras.map((p) => ({ ...p, forte: marcar.has(p.texto.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()) })), frame) : 0;
    let postura = passo(base, pos.distancia, pos.andando, pos.correndo);
    postura = viver(postura, {
      quadro: frame,
      semente: sementeDoAtor,
      batida,
      ouvindo: cena.quem && cena.quem !== id ? 1 : 0,
      olharLado: olhar.rel,
      nome: chave.nome,
      desde: chave.desde,
    });
    postura = { ...postura, cabeca: [postura.cabeca[0] + olhar.cima, postura.cabeca[1], postura.cabeca[2]] };
    // O celular: sai do bolso quando a pose pede e volta depois que a mão desce
    const modo = (nome: string | null): "tela" | "costas" | null => (nome === "celular" ? "tela" : nome === "celular-baixo" ? "costas" : null);
    const agoraCel = modo(daCapa?.pose ?? chave.nome);
    const antesCel = modo(chave.anterior);
    const celular = agoraCel
      ? { modo: agoraCel, escala: antesCel || daCapa ? 1 : Math.min(1, chave.desde / 8) }
      : antesCel && chave.desde < chave.transicao + 6
        ? { modo: antesCel, escala: Math.max(0, 1 - Math.max(0, chave.desde - chave.transicao * 0.5) / 6) }
        : null;
    // O objeto na mão: na direita (na esquerda se a direita está com o celular); nas poses
    // que usam as duas mãos ele é guardado devagar (o conferir avisa a equipe)
    const obj = objetoNaMao(id);
    const ocupado = POSES_COM_AS_DUAS_MAOS.has(daCapa?.pose ?? chave.nome) ? Math.min(1, chave.desde / 8) : POSES_COM_AS_DUAS_MAOS.has(chave.anterior ?? "") ? Math.max(0, 1 - chave.desde / 8) : 0;
    const naMao =
      obj && ehObjetoDeMao(obj.tipo)
        ? { objeto: <ObjetoNaMao3D tipo={obj.tipo} />, escala: obj.escala * (1 - ocupado), lado: (celular ? -1 : 1) as 1 | -1 }
        : null;
    const pulo = !naCapa && chave.trocouExpressao && chave.desde < 10 ? Math.sin((chave.desde / 10) * Math.PI) * 0.035 : 0;
    return {
      estado: {
        postura,
        expressao: daCapa?.expressao ?? chave.expressao,
        // As lágrimas chegam junto com as mãos no rosto (não antes)
        lagrimas: daCapa ? false : chave.lagrimas && chave.desde >= chave.transicao * 0.7,
        pulo,
        celular,
        naMao,
        vento: pos.andando * (pos.correndo ? 1.6 : 1),
      },
      corpo,
      pos,
      chave,
    };
  };

  // A multidão: todos na mesma pose, cada um com um atraso e um jeito
  const estadoDaMultidao = (i: number) => {
    const t = trilhas.multidao;
    const chave = posturaNoQuadro(t.chaves, frame - (i % 5) * 2);
    const marchando = Boolean(multidao?.marchando);
    let postura = marchando ? passo(chave.postura, frame * 0.028, 1, false) : chave.postura;
    postura = viver(postura, { quadro: frame, semente: i * 7 + 3, batida: 0, ouvindo: 0, olharLado: 0, pouca: true, nome: chave.nome, desde: chave.desde });
    return { postura, expressao: chave.expressao, lagrimas: false, pulo: 0, celular: null, naMao: null, vento: marchando ? 1 : 0 };
  };

  // Palito: desenhado por cima do 3D, de trás para a frente (quem está mais longe primeiro)
  const pessoas = [
    ...props.personagens.filter((p) => aqui.has(p.id)).map((p) => ({ p, id: p.id, multidao: false, semente: p.id.length, indice: -1 })),
    ...lugares.map((_, i) => ({ p: null, id: `multidao-${i}`, multidao: true, semente: i + 3, indice: i })),
  ];
  const pesDe = (x: (typeof pessoas)[number]): Ponto => (x.multidao ? pontoDaMultidao(x.indice) : pontoNoChao(x.id, frame));
  const naTela = pecas
    ? []
    : pessoas
        .filter((x) => !x.multidao || !escondidos.has(x.indice))
        .map((x) => {
          const pes = pesDe(x);
          const cabeca: Ponto = [pes[0], pes[1] + ALTURA_DO_BONECO, pes[2]];
          const a = projetar(camera, pes, width, height);
          const b = projetar(camera, cabeca, width, height);
          return { x, a, alturaPx: Math.abs(a.y - b.y), dist: distancia(camera, pes) };
        })
        .filter((q2) => q2.a.naFrente && q2.alturaPx > 8 && q2.alturaPx < height * 3)
        .sort((m, n) => n.dist - m.dist);
  /** As poses do palito (as de sempre): a ação 3D vira a pose 2D mais parecida */
  const momentosDoPalito = (id: string): Momento[] => {
    const daCapa = naCapa ? props.capa?.estados?.[id] : undefined;
    if (daCapa) return [{ em: 0, pose: (poseDoPalito(daCapa.pose) ?? "normal") as Pose, expressao: daCapa.expressao }];
    const chaves = trilhas[id]?.chaves ?? [];
    const lista = chaves.map((c) => ({ em: c.quadro, pose: (poseDoPalito(c.nome) ?? "normal") as Pose, expressao: c.expressao }));
    return lista.length ? lista : [{ em: 0, pose: "normal", expressao: "neutra" }];
  };

  // A luz do céu: um feixe dourado que desce sobre o foco
  const focoNaTela = cena.luz ? projetar(camera, grupoAgora ? [grupoAgora[0], grupoAgora[1] - 1.3, grupoAgora[2]] : pontoNoChao(tomada.foco, frame), width, height) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: "#9ED2F6" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={camera}
        shadows
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          // Cores vivas e o branco sem estourar (o "filme" neutro do three)
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Mundo
          balanco={balanco}
          queda={queda}
          ponte={temPonte}
          rio={temRio}
          tendas={temTendas}
          ambiente={ambiente}
          semente={semente % 1000}
          hora={props.cenario.hora}
          centro={tomada.centro}
          livre={livre}
          semGrama={semGrama}
        />
        {/* A vida da rua: gente passando no fundo, o veículo e o gato (bonecos de peças) */}
        {pecas && (props.cenario.figurantes ?? COM_RUA.includes(ambiente)) && <Figurantes ambiente={ambiente} semente={semente % 1000} rio={temRio} livre={livre} comMultidao={lugares.length > 0} />}
        {objetosDaCena.map((o) => (
          <ObjetoDeCena key={o.chave} tipo={o.tipo} posicao={o.posicao} escala={o.escala} giro={o.lado === "esquerda" ? Math.PI : 0} />
        ))}
        {/* Bonecos de peças: todos em 3D, o elenco com as cores dele; a multidão e os figurantes, variados */}
        {pecas &&
          props.personagens.map((p, n) => {
            if (!aqui.has(p.id)) return null;
            const visual = p.visual ? (p.visual as unknown as Visual) : visualDeFigurante(p.id.length, p.veste);
            const { estado, corpo } = estadoDoAtor(p.id, p.id.length + n * 13);
            const traje = trajeDe({ semente: p.id.length, chapeu: p.chapeu, detalhes3d: p.detalhes3d }, visual);
            const numero = typeof p.figurino === "number" ? p.figurino : ((semente + n * 3) % 5) + 1;
            return (
              <BonecoDePecas
                key={p.id}
                visual={visual}
                traje={traje}
                variacao={variacaoDoFigurino(numero, visual, traje)}
                detalhes={p.detalhes3d}
                estado={estado}
                palavras={cena.quem === p.id ? agora.palavras : []}
                boca={cena.quem === p.id ? agora.boca : undefined}
                posicao={pontoNoChao(p.id, frame)}
                virar={corpo}
                espelhar={p.espelhar}
                semente={p.id.length + n * 13}
                testa={testaAgora(linha, p.id, frame)}
              />
            );
          })}
        {pecas &&
          multidao &&
          lugares.map((_, i) => {
            if (escondidos.has(i)) return null;
            const visual = visualDeFigurante(i + 3, multidao.veste);
            const traje = trajeDe({ semente: i + 3, chapeu: multidao.chapeu }, visual);
            return (
              <BonecoDePecas
                key={`multidao-${i}`}
                visual={visual}
                traje={traje}
                variacao={variacaoDoFigurino(((i * 7 + semente) % 5) + 1, visual, traje)}
                estado={estadoDaMultidao(i)}
                palavras={[]}
                posicao={pontoDaMultidao(i)}
                virar={((i * 37) % 9 - 4) * 0.05}
                espelhar={i % 2 === 1}
                semente={i + 3}
              />
            );
          })}
      </ThreeCanvas>
      {naTela.map(({ x, a, alturaPx }) => {
        // A figura vai da cabeça (y 136) aos pés (y 958) no desenho de 1000
        const altura = alturaPx / 0.822;
        const largura = altura * 0.6;
        const p = x.p;
        const fala = p && cena.quem === p.id ? agora.palavras : [];
        const boca = p && cena.quem === p.id ? agora.boca : undefined;
        const andando = p ? posicaoNoQuadro(trilhas[p.id], frame).andando : 0;
        const deitado = p ? posturaNoQuadro(trilhas[p.id].chaves, frame).postura.deitado : 0;
        const momentos = p ? momentosDoPalito(p.id) : momentosDoPalito("multidao");
        const naMaoAgora = p ? objetoNaMao(p.id) : null;
        return (
          <div
            key={x.id}
            style={{
              position: "absolute",
              left: a.x - largura / 2,
              top: a.y - altura * 0.958 - (andando > 0 ? Math.abs(Math.sin(frame / 4)) * altura * 0.03 * andando : 0),
              // Caído: o desenho deita de lado, girando nos pés (acompanha a transição)
              ...(deitado > 0 && {
                transform: `rotate(${((p?.espelhar ?? false) ? -1 : 1) * 90 * deitado}deg)`,
                transformOrigin: `${largura / 2}px ${altura * 0.958}px`,
              }),
            }}
          >
            <TestaContexto.Provider value={p ? testaAgora(linha, p.id, frame) : null}>
              <ObjetoNaMaoContexto.Provider value={(naMaoAgora && naMaoAgora.escala > 0.5 && APOIO_2D[naMaoAgora.tipo]) || null}>
                <Palito
                  visual={visualDe(p ? p.roupa : (multidao?.roupa ?? "#4A4F57"))}
                  momentos={momentos}
                  palavras={fala}
                  boca={boca}
                  altura={altura}
                  espelhar={p ? p.espelhar : x.indice % 2 === 1}
                  semente={x.semente}
                  veste={p ? p.veste : multidao?.veste}
                  chapeu={p ? p.chapeu : multidao?.chapeu}
                />
              </ObjetoNaMaoContexto.Provider>
            </TestaContexto.Provider>
            {!(p ? p.naPonte : multidao?.naPonte) && (
              <div style={{ position: "absolute", left: largura * 0.05, top: altura * 0.958 - largura * 0.3 }}>
                <Tufo largura={largura * 0.9} />
              </div>
            )}
          </div>
        );
      })}
      {/* A troca de lugar passa por um escurecer rápido (nunca um corte seco de mundo) */}
      {escuro > 0 && <AbsoluteFill style={{ backgroundColor: "#0B0910", opacity: Math.min(1, escuro * 1.15) }} />}
      {focoNaTela && <LuzDoCeu x={focoNaTela.x} y={focoNaTela.y} desde={frame - agora.inicio} />}
      {/* Ilustração da fala (27/11/2026): número, conta, gráfico, ícone etc. na palavra dita, por cima do mundo */}
      {!props.semLegenda &&
        frame < fimDasCenas &&
        linha.map((t, n) =>
          t.cena.ilustra?.length ? (
            <CamadaDaFala
              key={`ilustra-${n}`}
              molde="mundo3d"
              ilustra={t.cena.ilustra}
              palavras={t.palavras}
              inicio={t.inicio}
              fim={t.fim}
              estilo={{ modelo: pecas ? "3d" : "palito", fundo: props.cenario.hora === "noite" ? "noite" : "claro" }}
              // A cena do começo divide o alto com o título e o balão da chamada (28/11/2026: o "10" cobria o balão)
              topo={t.inicio < 125 ? (props.ctaInicial ? 540 : 420) : undefined}
              faixas={faixasDaIlustracao(tomada.plano)}
            />
          ) : null,
        )}
      {!props.semLegenda && frame < fimDasCenas && <Legenda paginas={paginas} destaque={cena.destaque} close={cena.plano === "close"} />}
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
      {/* O versículo (ou a lição) na luz, antes do cartão do fim */}
      {props.final && (
        <Sequence from={fimDasCenas} durationInFrames={MUNDO3D.final} name="Frase na luz">
          <FraseNaLuz frase={props.final.frase} linha={props.final.linha} botao={props.final.botao ?? props.botaoFinal} />
        </Sequence>
      )}
      {props.ctaFinal && (
        <Sequence from={fimDasCenas + (props.final ? MUNDO3D.final : 0)} layout="none" name="CTA final">
          <CartaoDeChamada chamada={props.ctaFinal} botao={props.botaoFinal} />
          {/* O QR Code no cartão do fim, entre o alto e o selo do cartão (26/11/2026) */}
          {props.qr && textoDoQr(props.qr.texto) && (
            <PainelDoQr
              texto={textoDoQr(props.qr.texto)}
              legenda={props.qr.legenda}
              tamanho={Math.max(240, Math.min(400, Math.floor((medidaDoCartao(props.ctaFinal).topo - 110 - 300) / (1.1 + (props.qr.legenda ? 0.17 : 0)))))}
              em={14}
              style={{ top: 280, left: 0, right: 0, marginLeft: "auto", marginRight: "auto", width: "fit-content" }}
            />
          )}
          <Som tipo="sucesso" em={2} />
        </Sequence>
      )}
      <Titulo
        texto={(naCapa && props.capa?.titulo) || props.titulo}
        destaque={(naCapa && props.capa?.destaque) || props.destaqueDoTitulo}
        fixo={naCapa}
        // A chamada inicial embaixo do título, na coluna dele (antes só o Conversa desenhava)
        balao={props.ctaInicial && !naCapa ? <BalaoDeChamada texto={props.ctaInicial} jaNaTela noFluxo /> : undefined}
      />
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
  cenario: { ambiente: "campo", ponte: true, tendas: true, hora: "dia" },
  ctaFinal: "Siga para mais histórias que mudaram o mundo",
  botaoFinal: "Siga o canal 👆",
  semLegenda: false,
};

export const QUADROS_POR_SEGUNDO = FPS;
