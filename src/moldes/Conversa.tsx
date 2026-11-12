import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EfeitosContexto, Som, SONS, type TipoSom } from "../componentes/audio/Som";
import { CENARIOS, type NomeDoCenario } from "../componentes/cenarios/Cenarios";
import { Boneco, TRACO, type FormaDaBoca, type Momento, type Palavra } from "../componentes/personagens/Boneco";
import { ELENCO } from "../componentes/personagens/elenco";
import { PENTEADOS, type Visual } from "../componentes/personagens/Boneco";
import { Legendas, type Legenda } from "../componentes/texto/Legendas";
import { Texto } from "../componentes/texto/Texto";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { cores, fontes } from "../nucleo/marca";
import { CONVERSA, estimarPalavras, FPS, quadrosDaFalaConversa } from "./tempos";

// Cena de conversa entre personagens fixos do elenco, em desenho 2D: cada
// cena é a fala de um personagem, com a pose e a expressão de cada um naquele
// momento. A voz (uma por personagem), a legenda e a boca vêm do
// `npm run narrar`; sem ela, a prévia sai muda, com o tempo estimado.

const POSES = ["normal", "cintura", "celular", "cabeca", "explicando", "comemorando", "pensando"] as const;
const EXPRESSOES = ["neutra", "feliz", "radiante", "preocupada", "surpresa", "brava", "sem-graca"] as const;
const nomesDosSons = Object.keys(SONS) as [TipoSom, ...TipoSom[]];

const estadoSchema = z.object({ pose: z.enum(POSES), expressao: z.enum(EXPRESSOES) });
type Estado = z.infer<typeof estadoSchema>;

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "cor em #RRGGBB");
export const personagemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,20}$/).describe('Quem fala, nas cenas ("quem")'),
  nome: z.string().max(30),
  voz: z.string().optional().describe("Voz do kit (src/componentes/personagens/vozes.ts)"),
  visual: z.object({
    pele: cor,
    cabelo: cor,
    roupa: cor,
    calca: cor,
    sapato: cor,
    penteado: z.enum(PENTEADOS),
    roupaEstilo: z.enum(["blusa", "blazer", "faixa-noiva"]),
    mangaLonga: z.boolean().optional(),
    oculos: z.boolean().optional(),
    tiara: z.boolean().optional(),
    faixa: z.string().max(12).optional(),
  }),
  desenho: z
    .object({
      atras: z.string().optional(),
      corpo: z.string(),
      cabeca: z.string(),
      olhos: z.object({ abertos: z.string(), fechados: z.string() }),
      bocas: z.object({ fechada: z.string(), aberta: z.string(), sorriso: z.string(), triste: z.string().optional() }),
      sobrancelhas: z.boolean().optional(),
    })
    .optional()
    .describe("Desenho próprio (designer-de-personagens); sem ele, as peças do kit pelo visual"),
});
type PersonagemDaCena = z.infer<typeof personagemSchema>;

// Sem "elenco" no roteiro, a cena usa a Bia e a Lu (os episódios antigos)
const ELENCO_PADRAO: PersonagemDaCena[] = [
  { id: "noiva", nome: ELENCO.noiva.nome, visual: ELENCO.noiva.visual as Visual },
  { id: "organizadora", nome: ELENCO.organizadora.nome, visual: ELENCO.organizadora.visual as Visual },
];
const elencoDa = (props: { elenco?: PersonagemDaCena[] }) => (props.elenco?.length === 2 ? props.elenco : ELENCO_PADRAO);

const narracaoSchema = z
  .object({
    audio: z.string(),
    duracaoSeg: z.number(),
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number() })),
    boca: z.array(z.object({ inicio: z.number(), forma: z.string() })).optional(),
    chave: z.string().optional(),
  })
  .describe("Preenchido pelo npm run narrar (não editar à mão)");

export const conversaSchema = z.object({
  elenco: z.array(personagemSchema).length(2).optional().describe("As 2 personagens do episódio, do elenco do canal (sem isso: a Bia e a Lu)"),
  titulo: z.string().describe('Cartão do topo, ex.: "POV: ..."'),
  parte: z.string().optional().describe('Selo embaixo do título, ex.: "PARTE 1"'),
  cenario: z.enum(Object.keys(CENARIOS) as [NomeDoCenario, ...NomeDoCenario[]]).default("atelie").describe("atelie, escritorio ou cafe"),
  cenas: z
    .array(
      z.object({
        quem: z.string().describe("O id de quem fala (do elenco)"),
        fala: z.string().describe("O que o personagem diz: 1 frase curta"),
        estados: z
          .record(z.string(), estadoSchema)
          .optional()
          .describe('Pose e expressão de cada personagem nesta fala, pelo id: {"bia": {...}}. Quem não aparece fica como estava'),
        noiva: estadoSchema.optional().describe("Jeito antigo (só a Bia e a Lu): prefira estados"),
        organizadora: estadoSchema.optional(),
        som: z.enum(nomesDosSons).optional().describe("Efeito sonoro no começo da fala"),
        narracao: narracaoSchema.optional(),
      }),
    )
    .min(1)
    .max(20),
  cartao: z
    .object({
      titulo: z.string(),
      numero: z.number().optional().describe("Contador que sobe de 0 até ele"),
      rotulo: z.string().optional(),
      itens: z.array(z.string()).max(4).default([]),
      entra: z.number().int().describe("Índice da cena em que aparece (0 = primeira)"),
      sai: z.number().int().describe("Índice da cena em que some"),
      contaNa: z.number().int().optional().describe("Índice da cena em que o contador sobe"),
    })
    .optional(),
  zoom: z
    .object({ em: z.string(), de: z.number().int(), ate: z.number().int() })
    .optional()
    .describe("A câmera aproxima de um personagem da cena `de` até a `ate`"),
  convidados: z
    .array(z.object({ id: z.string(), nome: z.string(), descricao: z.string() }))
    .optional()
    .describe("Personagens que só este episódio precisa: a designer desenha em canais/<canal>/convidados/<id>.json"),
  ctaInicial: z.string().max(60).optional().describe('Frase curta logo abaixo do título nos primeiros segundos, ex.: "Assista até o fim 👀"'),
  ctaFinal: z.string().max(80).optional().describe('Chamada no cartão do fim do vídeo, ex.: "Organize o seu no Laços: link na bio"'),
  legendas: z.boolean().default(true),
  efeitos: z.boolean().default(true),
  vozes: z.record(z.string(), z.object({ voz: z.string(), velocidade: z.number().optional() })).optional(),
});

export type ConversaProps = z.infer<typeof conversaSchema>;
type Cena = ConversaProps["cenas"][number];

export const conversaExemplo: ConversaProps = {
  titulo: "POV: faltam 3 dias pro casamento e a lista sumiu",
  cenario: "atelie",
  cenas: [
    { quem: "noiva", fala: "Faltam três dias pro casamento e eu perdi a lista de convidados!", noiva: { pose: "cabeca", expressao: "preocupada" } },
    { quem: "organizadora", fala: "Calma, noiva! Tá tudo aqui no Laços.", noiva: { pose: "normal", expressao: "surpresa" }, organizadora: { pose: "celular", expressao: "feliz" } },
  ],
  legendas: true,
  efeitos: true,
};

// Linha do tempo: onde começa cada fala e o tempo de cada palavra
function linhaDoTempo(cenas: Cena[]) {
  let quadro = CONVERSA.inicio;
  return cenas.map((cena) => {
    const inicio = quadro;
    let palavras: Palavra[];
    let legendas: Legenda[];
    let boca: FormaDaBoca[] | undefined;
    if (cena.narracao) {
      legendas = cena.narracao.legendas.map((l) => ({ ...l, inicioMs: l.inicioMs + (inicio / FPS) * 1000, fimMs: l.fimMs + (inicio / FPS) * 1000 }));
      palavras = cena.narracao.legendas.map((l) => ({ inicio: inicio + Math.round((l.inicioMs / 1000) * FPS), fim: inicio + Math.round((l.fimMs / 1000) * FPS) }));
      boca = cena.narracao.boca?.map((b) => ({ quadro: inicio + Math.round(b.inicio * FPS), forma: b.forma }));
    } else {
      const estimadas = estimarPalavras(cena.fala);
      palavras = estimadas.map((p) => ({ inicio: inicio + p.inicio, fim: inicio + p.fim - 1 }));
      legendas = estimadas.map((p) => ({ texto: p.texto, inicioMs: ((inicio + p.inicio) / FPS) * 1000, fimMs: ((inicio + p.fim) / FPS) * 1000 }));
    }
    quadro += quadrosDaFalaConversa(cena) + CONVERSA.entreFalas;
    return { cena, inicio, palavras, legendas, boca };
  });
}

type Linha = ReturnType<typeof linhaDoTempo>;

// Pose e expressão de alguém numa cena: pelo id em "estados" ou, nos
// episódios antigos, nos campos "noiva" e "organizadora".
function estadoNaCena(cena: Cena, id: string): Estado | undefined {
  return cena.estados?.[id] ?? (id === "noiva" || id === "organizadora" ? cena[id] : undefined);
}

function momentosDe(quem: string, linha: Linha): Momento[] {
  const momentos: Momento[] = [{ em: 0, pose: "normal", expressao: "neutra" }];
  for (const { cena, inicio } of linha) {
    const estado = estadoNaCena(cena, quem);
    if (estado) momentos.push({ em: Math.max(1, inicio - 6), ...estado });
  }
  return momentos;
}

// CTA inicial: aparece embaixo do título no começo e sai antes da primeira virada
const CtaInicial: React.FC<{ texto: string; topo: number }> = ({ texto, topo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dentro = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const fora = spring({ frame: frame - 110, fps, config: { damping: 20 } });
  const p = dentro * (1 - fora);
  if (p <= 0.01) return null;
  return (
    <div style={{ position: "absolute", top: topo, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: p, scale: String(0.85 + 0.15 * p) }}>
      <div style={{ background: TRACO, color: "#FFFFFF", fontFamily: fontes.titulo, fontWeight: 800, fontSize: 40, padding: "10px 28px", borderRadius: 40 }}>{texto}</div>
    </div>
  );
};

const TituloPov: React.FC<{ titulo: string; parte?: string }> = ({ titulo, parte }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, scale: String(0.8 + 0.2 * p), opacity: p }}>
      <div
        style={{
          width: 900,
          background: "#FFFFFF",
          border: `6px solid ${TRACO}`,
          borderRadius: 34,
          padding: "22px 36px",
          fontFamily: fontes.titulo,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: 1.15,
          color: TRACO,
          textAlign: "center",
        }}
      >
        {titulo}
      </div>
      {parte && (
        <div style={{ background: cores.destaque, color: cores.textoNoDestaque, fontFamily: fontes.titulo, fontWeight: 800, fontSize: 34, padding: "6px 26px", borderRadius: 40, border: `5px solid ${TRACO}` }}>
          {parte}
        </div>
      )}
    </div>
  );
};

const Cartao: React.FC<{ cartao: NonNullable<ConversaProps["cartao"]>; entra: number; sai: number; contaDe: number }> = ({ cartao, entra, sai, contaDe }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dentro = spring({ frame: frame - entra, fps, config: { damping: 12, stiffness: 150 } });
  const fora = spring({ frame: frame - sai, fps, config: { damping: 20 } });
  const escala = dentro * (1 - fora);
  if (escala <= 0.01) return null;
  const numero = cartao.numero ?? 0;
  const contado = Math.round(interpolate(frame, [contaDe, contaDe + 40], [0, numero], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div
      style={{
        position: "absolute",
        left: 590,
        top: 425,
        width: 410,
        scale: String(escala),
        rotate: `${(1 - dentro) * 8}deg`,
        background: "#FFFFFF",
        border: `7px solid ${TRACO}`,
        borderRadius: 52,
        boxShadow: "0 24px 0 rgba(43,35,64,0.15)",
        padding: "24px 28px",
        fontFamily: fontes.titulo,
        color: TRACO,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: "#F59E8B", border: `4px solid ${TRACO}` }} />
        {cartao.titulo}
      </div>
      {cartao.numero !== undefined && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, background: "#E7F7F1", borderRadius: 24, padding: "10px 20px", border: `4px solid ${TRACO}` }}>
          <span style={{ fontSize: 68, fontWeight: 900, color: "#1F8F6A" }}>{contado}</span>
          {cartao.rotulo && <span style={{ fontSize: 30, fontWeight: 700 }}>{cartao.rotulo}</span>}
        </div>
      )}
      {cartao.itens.map((item, i) => {
        const p = spring({ frame: frame - entra - 8 - i * 5, fps, config: { damping: 14 } });
        return (
          <div key={item} style={{ display: "flex", justifyContent: "space-between", fontSize: 30, fontWeight: 700, opacity: p, translate: `${(1 - p) * 40}px 0px` }}>
            <span>{item}</span>
            <span style={{ color: "#1F8F6A" }}>✓</span>
          </div>
        );
      })}
    </div>
  );
};

// A primeira do elenco fica à esquerda; a segunda, à direita, virada para ela
const LUGAR = [
  { left: 50, espelhar: false, origem: "320px 1150px", semente: 0 },
  { left: 490, espelhar: true, origem: "760px 1150px", semente: 3 },
] as const;

export const Conversa: React.FC<ConversaProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const linha = linhaDoTempo(props.cenas);
  const elenco = elencoDa(props);
  const naCena = (i: number) => linha[Math.min(Math.max(i, 0), linha.length - 1)].inicio;
  const fimDaCena = (i: number) => (i >= linha.length ? linha[linha.length - 1].inicio + 60 : naCena(i));

  // Câmera: aproxima de um personagem durante algumas falas
  let zoom = 1;
  let origem = "540px 1150px";
  if (props.zoom) {
    const aproxima = spring({ frame: frame - naCena(props.zoom.de) + 8, fps, config: { damping: 18 } });
    const afasta = spring({ frame: frame - fimDaCena(props.zoom.ate + 1) + 8, fps, config: { damping: 18 } });
    zoom = 1 + 0.14 * (aproxima - afasta);
    const indice = Math.max(0, elenco.findIndex((p) => p.id === props.zoom?.em));
    origem = LUGAR[indice].origem;
  }

  const legendas = linha.flatMap((l) => l.legendas);
  // Onde termina a conversa (e começa o cartão do CTA final)
  const ultima = linha[linha.length - 1];
  const fimDasFalas = ultima.inicio + quadrosDaFalaConversa(ultima.cena) + CONVERSA.entreFalas + CONVERSA.fim;
  const Cenario = CENARIOS[props.cenario];
  return (
    <AbsoluteFill style={{ background: "#FBE7DA" }}>
      <EfeitosContexto.Provider value={props.efeitos}>
        <AbsoluteFill style={{ scale: String(zoom), transformOrigin: origem }}>
          <Cenario />
          {elenco.map(({ id: quem, visual, desenho }, indice) => {
            const minhas = linha.filter((l) => l.cena.quem === quem);
            const lugar = LUGAR[indice];
            return (
              <Boneco
                key={quem}
                visual={visual}
                desenho={desenho}
                momentos={momentosDe(quem, linha)}
                palavras={minhas.flatMap((l) => l.palavras)}
                boca={minhas.some((l) => l.boca) ? minhas.flatMap((l) => l.boca ?? []) : undefined}
                altura={900}
                espelhar={lugar.espelhar}
                semente={lugar.semente}
                style={{ position: "absolute", left: lugar.left, top: 790 }}
              />
            );
          })}
        </AbsoluteFill>
        <TituloPov titulo={props.titulo} parte={props.parte} />
        {props.ctaInicial && <CtaInicial texto={props.ctaInicial} topo={props.parte ? 450 : 395} />}
        {props.cartao && (
          <Cartao
            cartao={props.cartao}
            entra={naCena(props.cartao.entra) + 18}
            sai={fimDaCena(props.cartao.sai)}
            contaDe={naCena(props.cartao.contaNa ?? props.cartao.entra)}
          />
        )}
        {props.legendas && <Legendas legendas={legendas} tamanho={68} style={{ top: 1730, padding: "0 70px" }} />}
        {linha.map(({ cena, inicio }, i) => (
          <React.Fragment key={i}>
            {cena.narracao && (
              <Sequence from={inicio} layout="none" name={`Fala ${i + 1}`}>
                <Audio src={staticFile(cena.narracao.audio)} />
              </Sequence>
            )}
            {cena.som && <Som tipo={cena.som} em={Math.max(0, inicio - 4)} />}
          </React.Fragment>
        ))}
        {props.ctaFinal && (
          <Sequence from={fimDasFalas} layout="none" name="CTA final">
            <AbsoluteFill>
              <ChamadaFinal chamada={props.ctaFinal} />
            </AbsoluteFill>
            <Som tipo="sucesso" em={2} />
          </Sequence>
        )}
      </EfeitosContexto.Provider>
    </AbsoluteFill>
  );
};

// Capa do vídeo animado: a cena do episódio com as duas personagens e o título
// grande. O que importa fica entre y 240 e 1680, a faixa que a grade do perfil
// (3:4) não corta. A pose e a expressão de cada uma vêm de "capa" ou, sem isso,
// da primeira fala em que cada uma aparece.
type CapaDaConversa = Partial<ConversaProps> & {
  capa?: { titulo?: string; destaque?: string } & Record<string, Estado | string | undefined>;
};

export const CapaConversa: React.FC<CapaDaConversa> = (props) => {
  const Cenario = CENARIOS[props.cenario ?? "atelie"];
  const titulo = props.capa?.titulo ?? props.titulo ?? "";
  const elenco = elencoDa(props);
  const estadoDe = (quem: string): Estado => {
    const daCapa = props.capa?.[quem];
    if (daCapa && typeof daCapa === "object") return daCapa;
    for (const cena of props.cenas ?? []) {
      const estado = estadoNaCena(cena, quem);
      if (estado) return estado;
    }
    return { pose: "normal", expressao: "feliz" };
  };
  return (
    <AbsoluteFill style={{ background: "#FBE7DA" }}>
      <Cenario />
      {elenco.map(({ id, visual, desenho }, indice) => (
        <Boneco
          key={id}
          visual={visual}
          desenho={desenho}
          momentos={[{ em: 0, ...estadoDe(id) }]}
          palavras={[]}
          altura={960}
          espelhar={LUGAR[indice].espelhar}
          semente={LUGAR[indice].semente}
          style={{ position: "absolute", left: LUGAR[indice].left - 20, top: 700 }}
        />
      ))}
      <div style={{ position: "absolute", top: 270, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ background: "#FFFFFF", border: `7px solid ${TRACO}`, borderRadius: 44, padding: "30px 40px", boxShadow: "0 18px 0 rgba(43,35,64,0.15)" }}>
          <Texto texto={titulo} destaque={props.capa?.destaque} tamanho={88} cor={TRACO} />
        </div>
        {props.parte && (
          <div style={{ background: cores.destaque, color: cores.textoNoDestaque, fontFamily: fontes.titulo, fontWeight: 800, fontSize: 44, padding: "8px 32px", borderRadius: 50, border: `6px solid ${TRACO}` }}>
            {props.parte}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Ficha do personagem: 4 jeitos lado a lado, para a designer-de-personagens
// conferir o desenho (npx remotion still FichaDoPersonagem ... --props=...).
const SITUACOES_DA_FICHA: Array<{ nome: string; pose: (typeof POSES)[number]; expressao: (typeof EXPRESSOES)[number]; falando?: boolean }> = [
  { nome: "normal", pose: "normal", expressao: "neutra" },
  { nome: "falando", pose: "explicando", expressao: "feliz", falando: true },
  { nome: "comemorando", pose: "comemorando", expressao: "radiante" },
  { nome: "preocupado", pose: "cabeca", expressao: "preocupada" },
];

export const FichaDoPersonagem: React.FC<{ personagem?: PersonagemDaCena }> = ({ personagem }) => {
  const p = personagem ?? ELENCO_PADRAO[0];
  return (
    <AbsoluteFill style={{ background: "#FBE7DA", flexDirection: "row", flexWrap: "wrap" }}>
      {SITUACOES_DA_FICHA.map((s) => (
        <div key={s.nome} style={{ width: 540, height: 960, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 30 }}>
          <Boneco
            visual={p.visual}
            desenho={p.desenho}
            momentos={[{ em: 0, pose: s.pose, expressao: s.expressao }]}
            palavras={s.falando ? [{ inicio: 0, fim: 999 }] : []}
            altura={820}
          />
          <div style={{ fontFamily: fontes.titulo, fontSize: 36, fontWeight: 800, color: TRACO }}>{s.nome}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
