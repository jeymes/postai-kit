import { Audio } from "@remotion/media";
import { textosDoIdioma } from "../nucleo/textosFixos";
import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EfeitosContexto, Som, SONS, type TipoSom } from "../componentes/audio/Som";
import { resolverCenario, type CenarioProprio } from "../componentes/cenarios/Cenarios";
import { HoraNoCanto, Notificacao } from "../componentes/cenas/Notificacao";
import { TRACO, type FormaDaBoca, type Momento, type Palavra } from "../componentes/personagens/Boneco";
import { ELENCO } from "../componentes/personagens/elenco";
import { PENTEADOS, type Visual } from "../componentes/personagens/Boneco";
import { Legendas, type Legenda } from "../componentes/texto/Legendas";
import { Texto } from "../componentes/texto/Texto";
import { BalaoDeChamada, CartaoDeChamada } from "../componentes/cenas/ChamadaAnimada";
import { cores, fontes } from "../nucleo/marca";
import { estiloDe, estiloSchema, type EstiloDaPeca } from "../estilos/registro";
import { FiltrosDosEstilos } from "../estilos/filtros";
import { OBJETOS_DA_SOMBRA, Sombra } from "../componentes/personagens/Sombra";
import { CelularAceso } from "../componentes/personagens/Boneco";
import { LuzDoAviso } from "../componentes/efeitos/LuzDoAviso";
import { FraseNaLuz } from "../componentes/cenas/FraseNaLuz";
import { CONVERSA, estimarPalavras, FPS, quadrosDaFalaConversa, quadrosDoVideoDoApp } from "./tempos";

// Cena de conversa entre personagens fixos do elenco, em desenho 2D: cada
// cena é a fala de um personagem, com a pose e a expressão de cada um naquele
// momento. A voz (uma por personagem), a legenda e a boca vêm do
// `npm run narrar`; sem ela, a prévia sai muda, com o tempo estimado.

const POSES = ["normal", "cintura", "celular", "cabeca", "explicando", "comemorando", "pensando", "sentado"] as const;
const EXPRESSOES = ["neutra", "feliz", "radiante", "preocupada", "surpresa", "brava", "sem-graca", "medo", "aliviada"] as const;
const nomesDosSons = Object.keys(SONS) as [TipoSom, ...TipoSom[]];

const estadoSchema = z.object({ pose: z.enum(POSES), expressao: z.enum(EXPRESSOES) });
type Estado = z.infer<typeof estadoSchema>;

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "cor em #RRGGBB");
export const personagemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,20}$/).describe('Quem fala, nas cenas ("quem")'),
  nome: z.string().max(30),
  voz: z.string().optional().describe("Voz do kit (src/componentes/personagens/vozes.ts)"),
  tipo: z.enum(["pessoa", "criatura"]).optional().describe("criatura: só desenho (a Sombra do kit ou desenho próprio), sem pele nem roupa"),
  criatura: z.enum(["sombra"]).optional().describe("Criatura desenhada pelo kit (quando não tem desenho próprio)"),
  objeto: z.enum(OBJETOS_DA_SOMBRA).optional().describe("De onde a Sombra sai: celular, garrafa ou espelho"),
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
const elencoDa = (props: { elenco?: PersonagemDaCena[] }) =>
  props.elenco?.length === 1 || props.elenco?.length === 2 ? props.elenco : ELENCO_PADRAO;

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
  estilo: estiloSchema.optional(),
  elenco: z
    .array(personagemSchema)
    .min(1)
    .max(2)
    .optional()
    .describe("Os personagens do episódio, do elenco do canal: 2 (conversa) ou 1 (sozinho, no meio da tela). Sem isso: a Bia e a Lu"),
  titulo: z.string().describe('Cartão do topo, ex.: "POV: ..."'),
  parte: z.string().optional().describe('Selo da parte (no vídeo, embaixo do título; na capa, em cima), ex.: "PARTE 1"'),
  cartaoFinal: z
    .object({
      pose: z.enum(POSES).optional(),
      expressao: z.enum(EXPRESSOES).optional(),
      estados: z
        .record(z.string(), z.object({ pose: z.enum(POSES).optional(), expressao: z.enum(EXPRESSOES).optional() }))
        .optional()
        .describe('Por pessoa, pelo id, ex.: o vilão bravo, de mão na cintura, enquanto a heroína comemora: {"vilao": {...}}'),
    })
    .optional()
    .describe(
      "Como as pessoas ficam no cartão final. Sem isso: comemorando, se a história acaba bem; se acaba com medo, tristeza ou briga, ficam como na última cena",
    ),
  cenario: z
    .string()
    .default("atelie")
    .describe(
      "Onde começa: atelie, escritorio, cafe, quarto, sala, cozinha, banheiro (no quarto e na sala, pose sentado à esquerda) ou o id de um cenário criado pela equipe (cenariosProprios)",
    ),
  cenariosProprios: z
    .array(
      z.object({
        id: z.string(),
        nome: z.string(),
        fundo: z.string(),
        frente: z.string().optional(),
        origem: z.object({ objeto: z.string(), x: z.number(), y: z.number() }).optional(),
      }),
    )
    .optional()
    .describe("Os cenários criados pela equipe que o roteiro usa (preenchido pelo npm run cenarios; não escrever à mão)"),
  cenas: z
    .array(
      z.object({
        quem: z.string().describe("O id de quem fala (do elenco)"),
        fala: z.string().describe("O que o personagem diz: 1 frase curta"),
        estados: z
          .record(z.string(), estadoSchema)
          .optional()
          .describe('Pose e expressão de cada personagem nesta fala, pelo id: {"bia": {...}}. Quem não aparece fica como estava'),
        meio: z
          .record(z.string(), estadoSchema)
          .optional()
          .describe("Muda a pose ou a expressão no meio da fala (na metade das palavras), pelo id. Use em falas com mais de 3 s, para ninguém ficar parado"),
        noiva: estadoSchema.optional().describe("Jeito antigo (só a Bia e a Lu): prefira estados"),
        organizadora: estadoSchema.optional(),
        som: z.enum(nomesDosSons).optional().describe("Efeito sonoro no começo da fala"),
        luz: z.boolean().optional().describe("A luz do aviso: o celular de quem está com ele (pose celular ou sentado) acende dourado no começo desta fala, e a Sombra é empurrada e some"),
        sombra: z.enum(["cresce", "encolhe"]).optional().describe("A criatura cresce (a pessoa cedeu) ou encolhe (resistiu) no começo desta fala"),
        hora: z.string().max(8).optional().describe('Hora no canto de cima durante esta fala, ex.: "2:07" (madrugada)'),
        cenario: z.string().optional().describe("Troca de lugar a partir desta fala (um cenário do kit ou criado pela equipe); vale até outra fala trocar"),
        notificacao: z
          .object({ titulo: z.string().max(30).optional().describe("Sem ele: o nome da marca"), texto: z.string().max(60) })
          .optional()
          .describe("Cartão de notificação (título e texto que o roteiro define), junto com a luz ou sozinho"),
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
      marca: z
        .enum(["confirmado", "pendente", "nenhuma"])
        .default("confirmado")
        .describe('O sinal ao lado dos itens: "confirmado" (✓ verde), "pendente" (⏳, ex.: "Ainda sem resposta") ou "nenhuma"'),
      marcados: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Com marca confirmado: quantos itens (os primeiros) ganham o ✓; os outros ficam ⏳. Com numero, cada ✓ aparece junto com o contador"),
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
  ctaInicial: z.string().max(60).optional().describe('Balão curto (até 28 caracteres, uma linha) embaixo do título nos primeiros segundos, ex.: "Marca quem é assim 😂"'),
  idioma: z.enum(["pt", "en", "es"]).optional().describe("O idioma do vídeo (o narrar grava): o botão do fim sai nele"),
  ctaFinal: z.string().max(80).optional().describe('Frase completa no cartão do fim, sem @ e sem "link na bio" (isso vai no botão), ex.: "Organize o seu casamento no Laços"'),
  botaoFinal: z.string().max(24).optional().describe('Texto do botão do cartão do fim, ex.: "Link na bio 👆", "Baixe grátis 👆". Padrão: "Link na bio 👆"'),
  final: z
    .object({
      frase: z.string().max(180).describe("A frase grande (versículo, citação, lição)"),
      linha: z.string().max(60).optional().describe("A linha menor embaixo: autor, referência, fonte"),
      botao: z.string().max(30).optional().describe("Texto do botão (sem ele: o botaoFinal do roteiro)"),
    })
    .optional()
    .describe("Frase na luz: cena final escura com feixe de luz, a frase na cor de destaque do canal, a linha embaixo, a pessoa no feixe e o botão (antes do CTA final)"),
  videoDoApp: z
    .object({
      arquivo: z.string().describe("O vídeo do produto: o material do canal (canais/<canal>/materiais/<id>.mp4) ou um arquivo em public/"),
      de: z.number().min(0).describe("Segundo em que o trecho começa no vídeo do app"),
      ate: z.number().min(0).describe("Segundo em que termina (de 1 a 6 s depois do de; o canal costuma pedir 2 a 4)"),
    })
    .optional()
    .describe("O trecho do vídeo real do app no fim (dentro de um celular), antes do cartão final: mostra o que a história falou"),
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
      legendas = cena.narracao.legendas.map((l, n) => ({ ...l, inicioMs: l.inicioMs + (inicio / FPS) * 1000, fimMs: l.fimMs + (inicio / FPS) * 1000, nova: n === 0 }));
      palavras = cena.narracao.legendas.map((l) => ({ inicio: inicio + Math.round((l.inicioMs / 1000) * FPS), fim: inicio + Math.round((l.fimMs / 1000) * FPS) }));
      boca = cena.narracao.boca?.map((b) => ({ quadro: inicio + Math.round(b.inicio * FPS), forma: b.forma }));
    } else {
      const estimadas = estimarPalavras(cena.fala);
      palavras = estimadas.map((p) => ({ inicio: inicio + p.inicio, fim: inicio + p.fim - 1 }));
      legendas = estimadas.map((p, n) => ({ texto: p.texto, inicioMs: ((inicio + p.inicio) / FPS) * 1000, fimMs: ((inicio + p.fim) / FPS) * 1000, nova: n === 0 }));
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

// Expressões de fim ruim: o cartão final não comemora depois delas
const FIM_RUIM = new Set<string>(["preocupada", "brava", "medo", "sem-graca"]);

function momentosDe(
  quem: string,
  linha: Linha,
  cartaoFinalEm?: number,
  cartaoFinal?: { pose?: Momento["pose"]; expressao?: Momento["expressao"] },
): Momento[] {
  const momentos: Momento[] = [{ em: 0, pose: "normal", expressao: "neutra" }];
  for (const { cena, inicio, palavras } of linha) {
    const estado = estadoNaCena(cena, quem);
    if (estado) momentos.push({ em: Math.max(1, inicio - 6), ...estado });
    // A virada no meio da fala: no começo da palavra do meio
    const meio = cena.meio?.[quem];
    const palavraDoMeio = palavras[Math.floor(palavras.length / 2)];
    if (meio && palavraDoMeio) momentos.push({ em: Math.max(inicio + 1, palavraDoMeio.inicio - 4), ...meio });
  }
  // No cartão final: o que o roteiro pedir; sem isso, comemoram (com o pulinho
  // da reação) só se a história acaba bem; depois de medo ou tristeza, ficam como estavam
  if (cartaoFinalEm !== undefined) {
    const ultimo = momentos[momentos.length - 1];
    const acabaMal = FIM_RUIM.has(ultimo.expressao);
    momentos.push({
      em: cartaoFinalEm,
      pose: cartaoFinal?.pose ?? (acabaMal ? ultimo.pose : "comemorando"),
      expressao: cartaoFinal?.expressao ?? (acabaMal ? ultimo.expressao : "radiante"),
    });
  }
  return momentos;
}

// `abaixo`: o que entra embaixo do título, na mesma coluna (a notificação): nada se sobrepõe
const TituloPov: React.FC<{ titulo: string; parte?: string; abaixo?: React.ReactNode }> = ({ titulo, parte, abaixo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Já na tela no quadro 0: é o que aparece na prévia do feed. Só cresce um pouco.
  const p = spring({ frame, fps, config: { damping: 14 } });
  return (
    <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, scale: String(0.94 + 0.06 * p) }}>
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
      {abaixo}
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
  const itens = cartao.itens;
  const marcados = Math.min(itens.length, cartao.marcados ?? itens.length);
  // Com 3 itens ou mais o cartão fica mais baixo (não cobre a cabeça de quem está à direita)
  const compacto = itens.length >= 3;
  // Rótulo comprido vai embaixo do número (antes quebrava em duas linhas curtas ao lado dele)
  const rotuloEmbaixo = (cartao.rotulo ?? "").length > 12;
  return (
    <div
      style={{
        position: "absolute",
        left: 590,
        top: compacto ? 400 : 425,
        width: 410,
        scale: String(escala),
        rotate: `${(1 - dentro) * 8}deg`,
        background: "#FFFFFF",
        border: `7px solid ${TRACO}`,
        borderRadius: 52,
        boxShadow: "0 24px 0 rgba(43,35,64,0.15)",
        padding: compacto ? "18px 26px" : "24px 28px",
        fontFamily: fontes.titulo,
        color: TRACO,
        display: "flex",
        flexDirection: "column",
        gap: compacto ? 6 : 10,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: 11, background: "#F59E8B", border: `4px solid ${TRACO}` }} />
        {cartao.titulo}
      </div>
      {cartao.numero !== undefined && (
        <div
          style={{
            display: "flex",
            flexDirection: rotuloEmbaixo ? "column" : "row",
            alignItems: rotuloEmbaixo ? "flex-start" : "baseline",
            gap: rotuloEmbaixo ? 0 : 12,
            background: cartao.marca === "pendente" ? "#FFF4DB" : "#E7F7F1",
            borderRadius: 24,
            padding: compacto ? "6px 20px" : "10px 20px",
            border: `4px solid ${TRACO}`,
          }}
        >
          <span style={{ fontSize: compacto ? 58 : 68, fontWeight: 900, lineHeight: 1.05, color: cartao.marca === "pendente" ? "#B7791F" : "#1F8F6A" }}>{contado}</span>
          {cartao.rotulo && <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{cartao.rotulo}</span>}
        </div>
      )}
      {itens.map((item, i) => {
        const p = spring({ frame: frame - entra - 8 - i * 5, fps, config: { damping: 14 } });
        // O ✓ do item i aparece quando o contador passa a parte dele (antes: todos marcados com o contador em 0)
        const confirmado =
          cartao.marca === "confirmado" &&
          i < marcados &&
          (cartao.numero === undefined || contado >= Math.ceil((numero * (i + 1)) / Math.max(1, marcados)));
        const sinal = cartao.marca === "nenhuma" ? null : confirmado ? "✓" : cartao.marca === "pendente" || i >= marcados ? "⏳" : null;
        return (
          <div key={item} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: compacto ? 28 : 30, fontWeight: 700, opacity: p, translate: `${(1 - p) * 40}px 0px` }}>
            <span>{item}</span>
            {sinal && <span style={{ color: confirmado ? "#1F8F6A" : "#B7791F" }}>{sinal}</span>}
          </div>
        );
      })}
    </div>
  );
};

// Onde fica a mão com o celular e o rosto de quem está num lugar (na tela
// 1080x1920), em pé ou sentado: a luz do aviso, o feixe da tela e a criatura
// que sai do celular partem daqui
type Lugar = { left: number; espelhar: boolean; origem: string; semente: number };
const maoDe = (lugar: Lugar, sentado: boolean) => ({ x: lugar.left + (lugar.espelhar ? 329 : 211), y: sentado ? 1289 : 1190 });
const rostoDe = (lugar: Lugar, sentado: boolean) => ({ x: lugar.left + 270, y: sentado ? 1098 : 999 });
const comCelular = (pose?: string) => pose === "celular" || pose === "sentado";

// A primeira do elenco fica à esquerda; a segunda, à direita, virada para ela
const LUGAR: Lugar[] = [
  { left: 50, espelhar: false, origem: "320px 1150px", semente: 0 },
  { left: 490, espelhar: true, origem: "760px 1150px", semente: 3 },
];
// Um personagem sozinho fica no meio da tela, de frente
const SOZINHO: Lugar[] = [{ left: 270, espelhar: false, origem: "540px 1150px", semente: 0 }];
const lugaresDo = (elenco: PersonagemDaCena[]) => (elenco.length === 1 ? SOZINHO : LUGAR);

export const Conversa: React.FC<ConversaProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const linha = linhaDoTempo(props.cenas);
  const elenco = elencoDa(props);
  const lugares = lugaresDo(elenco);
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
    origem = lugares[indice].origem;
  }

  const legendas = linha.flatMap((l) => l.legendas);
  // Onde termina a conversa (e começa o cartão do CTA final)
  const ultima = linha[linha.length - 1];
  const fimDasFalas = ultima.inicio + quadrosDaFalaConversa(ultima.cena) + CONVERSA.entreFalas + CONVERSA.fim;
  // A cena do versículo (se tiver) vem antes do CTA final
  const inicioDoApp = fimDasFalas + (props.final ? CONVERSA.final : 0);
  const quadrosDoApp = props.videoDoApp ? quadrosDoVideoDoApp(props.videoDoApp) : 0;
  const inicioDoCta = inicioDoApp + quadrosDoApp;
  // O lugar agora: o da última fala que trocou de cenário (até aqui), senão o do roteiro
  const cenarioNaFala = (k: number) => {
    for (let i = k; i >= 0; i--) if (linha[i]?.cena.cenario) return linha[i].cena.cenario;
    return props.cenario;
  };
  let falaAgora = 0;
  linha.forEach((l, i) => {
    if (l.inicio <= frame) falaAgora = i;
  });
  const lugarAgora = resolverCenario(cenarioNaFala(falaAgora), props.cenariosProprios as CenarioProprio[] | undefined);
  const { Cenario, Frente } = lugarAgora;
  const { fundo, def: estilo, escuro } = estiloDe(props.estilo);
  const CamadaDaFrente = estilo.Frente ?? estilo.Camada;
  const noite = fundo === "noite";
  // A primeira fala com a luz do aviso: a Sombra é empurrada e some ali, e o
  // celular de quem está com ele na mão acende dourado
  const naLuz = linha.find((l) => l.cena.luz);
  const luzEm = naLuz?.inicio;
  const quemAcende = naLuz
    ? Math.max(0, elenco.findIndex((p) => ["celular", "sentado"].includes(estadoNaCena(naLuz.cena, p.id)?.pose ?? "")))
    : -1;
  // A criatura cresce quando a pessoa cede e encolhe quando resiste (campo "sombra" da cena)
  let tamanhoAntes = 1;
  const mudancasDeTamanho = linha.flatMap((l) => {
    if (!l.cena.sombra) return [];
    const novo = Math.min(1.3, Math.max(0.5, tamanhoAntes + (l.cena.sombra === "cresce" ? 0.3 : -0.3)));
    const delta = novo - tamanhoAntes;
    tamanhoAntes = novo;
    return [{ em: l.inicio, delta }];
  });
  const tamanhoDaCriatura =
    1 + mudancasDeTamanho.reduce((soma, m) => soma + m.delta * spring({ frame: frame - m.em, fps, config: { damping: 14 } }), 0);
  return (
    <AbsoluteFill style={{ background: noite ? "#0A0F26" : "#FBE7DA" }}>
      <EfeitosContexto.Provider value={props.efeitos}>
        <AbsoluteFill style={{ scale: String(zoom), transformOrigin: origem }}>
          <estilo.Fundo fundo={fundo} Cenario={Cenario} cenario={lugarAgora.nome} />
          {elenco.map(({ id: quem, visual, desenho, tipo, objeto }, indice) => {
            const minhas = linha.filter((l) => l.cena.quem === quem);
            const lugar = lugares[indice];
            if (tipo === "criatura") {
              // A Sombra sai do objeto pouco antes da primeira vez que aparece
              const primeira = linha.find((l) => l.cena.quem === quem || estadoNaCena(l.cena, quem));
              const falaAgora = minhas.find((l) => l.palavras.length && l.palavras[0].inicio <= frame && frame <= l.palavras[l.palavras.length - 1].fim);
              // De onde ela sai: do celular na mão de alguém naquela fala; senão, do objeto do cenário (espelho, geladeira); senão, aos pés dela
              const quemSegura = primeira ? elenco.findIndex((p) => p.tipo !== "criatura" && comCelular(estadoNaCena(primeira.cena, p.id)?.pose)) : -1;
              const pontoNaTela =
                quemSegura >= 0
                  ? maoDe(lugares[quemSegura], estadoNaCena(primeira!.cena, elenco[quemSegura].id)?.pose === "sentado")
                  : resolverCenario(cenarioNaFala(primeira ? linha.indexOf(primeira) : 0), props.cenariosProprios as CenarioProprio[] | undefined).origem;
              const xNoDesenho = pontoNaTela ? (pontoNaTela.x - lugar.left) / 0.9 - 100 : 0;
              const de = pontoNaTela
                ? { x: lugar.espelhar ? 400 - xNoDesenho : xNoDesenho, y: (pontoNaTela.y - 790) / 0.9 }
                : undefined;
              return (
                <Sombra
                  key={quem}
                  momentos={momentosDe(quem, linha)}
                  palavras={minhas.flatMap((l) => l.palavras)}
                  boca={minhas.some((l) => l.boca) ? minhas.flatMap((l) => l.boca ?? []) : undefined}
                  altura={900}
                  espelhar={lugar.espelhar}
                  semente={lugar.semente}
                  aparece={primeira ? Math.max(1, primeira.inicio - 20) : 0}
                  some={luzEm}
                  escala={tamanhoDaCriatura}
                  desenho={desenho}
                  objeto={objeto}
                  de={de}
                  sussurro={falaAgora?.cena.fala}
                  style={{ position: "absolute", left: lugar.left, top: 790 }}
                />
              );
            }
            return (
              <CelularAceso.Provider key={quem} value={luzEm !== undefined && frame >= luzEm && indice === quemAcende}>
              <estilo.Personagem
                noite={noite}
                visual={visual}
                desenho={desenho}
                momentos={momentosDe(quem, linha, props.ctaFinal ? inicioDoCta : undefined, { ...props.cartaoFinal, ...props.cartaoFinal?.estados?.[quem] })}
                palavras={minhas.flatMap((l) => l.palavras)}
                boca={minhas.some((l) => l.boca) ? minhas.flatMap((l) => l.boca ?? []) : undefined}
                altura={900}
                espelhar={lugar.espelhar}
                semente={lugar.semente}
                style={{ position: "absolute", left: lugar.left, top: 790 }}
              />
              </CelularAceso.Provider>
            );
          })}
          {Frente && (
            <CamadaDaFrente fundo={fundo}>
              <Frente />
            </CamadaDaFrente>
          )}
          {/* No escuro, a tela do celular ilumina o rosto de quem está com ele (um feixe claro e fraco) */}
          {escuro &&
            (() => {
              const k = linha.findIndex((l, n) => frame >= l.inicio && frame < (linha[n + 1]?.inicio ?? fimDasFalas));
              if (k < 0 || (luzEm !== undefined && frame >= luzEm)) return null;
              return elenco.map((p, indice) => {
                const pose = estadoNaCena(linha[k].cena, p.id)?.pose ?? momentosDe(p.id, linha).filter((m) => m.em <= frame).pop()?.pose;
                if (p.tipo === "criatura" || !comCelular(pose)) return null;
                const sentado = pose === "sentado";
                const m = maoDe(lugares[indice], sentado);
                const r = rostoDe(lugares[indice], sentado);
                return (
                  <svg key={`feixe-${p.id}`} viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    <defs>
                      <linearGradient id={`feixe-${indice}`} x1={m.x} y1={m.y} x2={r.x} y2={r.y} gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#D8E6FF" stopOpacity={0.32} />
                        <stop offset="1" stopColor="#D8E6FF" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <polygon points={`${m.x - 10},${m.y} ${m.x + 10},${m.y} ${r.x + 70},${r.y} ${r.x - 70},${r.y}`} fill={`url(#feixe-${indice})`} />
                  </svg>
                );
              });
            })()}
        </AbsoluteFill>
        {linha.map(({ cena, inicio }, i) => {
          if (!cena.luz) return null;
          // A luz nasce no celular de quem está com ele na mão nesta fala
          const indice = Math.max(
            0,
            elenco.findIndex((p) => ["celular", "sentado"].includes(estadoNaCena(cena, p.id)?.pose ?? "")),
          );
          const sentado = estadoNaCena(cena, elenco[indice].id)?.pose === "sentado";
          const mao = maoDe(lugares[indice], sentado);
          // Apaga quando a próxima fala começa
          return <LuzDoAviso key={`luz-${i}`} em={inicio} ate={linha[i + 1]?.inicio ?? fimDasFalas} x={mao.x} y={mao.y} />;
        })}
        {linha.map(({ cena, inicio }, i) => {
          const fim = linha[i + 1]?.inicio ?? fimDasFalas;
          return (
            <React.Fragment key={`extra-${i}`}>
              {cena.hora && (
                <Sequence from={inicio} durationInFrames={fim - inicio} layout="none" name={`Hora ${i + 1}`}>
                  <HoraNoCanto hora={cena.hora} noite={escuro} />
                </Sequence>
              )}
            </React.Fragment>
          );
        })}
        <TituloPov
          titulo={props.titulo}
          parte={props.parte}
          abaixo={(() => {
            // A notificação da fala de agora, na coluna do título
            const i = linha.findIndex((l, k) => l.cena.notificacao && frame >= l.inicio - 4 && frame < (linha[k + 1]?.inicio ?? fimDasFalas));
            const cena = i >= 0 ? linha[i].cena : null;
            return cena?.notificacao ? (
              <Notificacao em={linha[i].inicio - 4} texto={cena.notificacao.texto} app={cena.notificacao.titulo} noite={escuro} noFluxo />
            ) : null;
          })()}
        />
        {props.ctaInicial && <BalaoDeChamada texto={props.ctaInicial} topo={props.parte ? 450 : 395} jaNaTela />}
        {props.cartao && (
          <Cartao
            cartao={props.cartao}
            entra={naCena(props.cartao.entra) + 18}
            sai={fimDaCena(props.cartao.sai)}
            contaDe={naCena(props.cartao.contaNa ?? props.cartao.entra)}
          />
        )}
        {props.legendas && (
          <Sequence durationInFrames={props.ctaFinal ? fimDasFalas : undefined} layout="none" name="Legendas">
            <Legendas legendas={legendas} noite={escuro} tamanho={estilo.legenda} largura={940} style={{ top: estilo.legenda > 70 ? 1690 : 1730, padding: "0 70px" }} />
          </Sequence>
        )}
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
        {props.final && (
          <Sequence from={fimDasFalas} durationInFrames={CONVERSA.final} name="Frase na luz">
            <FraseNaLuz
              frase={props.final.frase}
              linha={props.final.linha}
              botao={props.final.botao ?? props.botaoFinal ?? textosDoIdioma(props.idioma).linkNaBio}
              figura={(() => {
                // A pessoa do episódio, pequena, de pé embaixo do feixe de luz
                const pessoa = elenco.find((p) => p.tipo !== "criatura");
                return pessoa ? (
                  <estilo.Personagem noite visual={pessoa.visual} desenho={pessoa.desenho} momentos={[{ em: 0, pose: "normal", expressao: "feliz" }]} palavras={[]} altura={380} />
                ) : undefined;
              })()}
            />
          </Sequence>
        )}
        {props.videoDoApp && (
          <Sequence from={inicioDoApp} durationInFrames={quadrosDoApp} name="Vídeo do app">
            <VideoDoApp arquivo={props.videoDoApp.arquivo} de={props.videoDoApp.de} quadros={quadrosDoApp} />
          </Sequence>
        )}
        {props.ctaFinal && (
          <Sequence from={inicioDoCta} layout="none" name="CTA final">
            <CartaoDeChamada chamada={props.ctaFinal} botao={props.botaoFinal ?? textosDoIdioma(props.idioma).linkNaBio} />
            <Som tipo="sucesso" em={2} />
          </Sequence>
        )}
      </EfeitosContexto.Provider>
    </AbsoluteFill>
  );
};

/** O trecho do vídeo real do app num celular, no fundo da cor da marca, antes do cartão final */
const VideoDoApp: React.FC<{ arquivo: string; de: number; quadros: number }> = ({ arquivo, de, quadros }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
  const sai = interpolate(frame, [quadros - 8, quadros], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    // Fundo sólido (a cena da conversa não aparece por trás), com um brilho na cor da marca
    <AbsoluteFill
      style={{
        backgroundColor: "#FFFFFF",
        backgroundImage: `radial-gradient(circle at 50% 40%, ${cores.destaque}55 0%, ${cores.destaque}22 60%, transparent 100%)`,
        alignItems: "center",
        justifyContent: "center",
        opacity: sai,
      }}
    >
      <div
        style={{
          width: 600,
          height: 1240,
          borderRadius: 80,
          border: `16px solid ${TRACO}`,
          overflow: "hidden",
          background: "#000",
          boxShadow: "0 40px 80px rgba(43,35,64,0.35)",
          scale: String(0.85 + 0.15 * entra),
          translate: `0 ${(1 - entra) * 120}px`,
        }}
      >
        <OffthreadVideo src={staticFile(arquivo)} muted trimBefore={Math.round(de * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};

// Capa do vídeo animado: a cena do episódio com as duas personagens e o título
// grande. O que importa fica entre y 240 e 1680, a faixa que a grade do perfil
// (3:4) não corta. A pose e a expressão de cada uma vêm de "capa" ou, sem isso,
// da primeira fala em que cada uma aparece.
type EstadoNaCapa = Partial<Estado>;
type CapaDaConversa = Partial<ConversaProps> & {
  capa?: { titulo?: string; destaque?: string; estados?: Record<string, EstadoNaCapa> } & Record<
    string,
    EstadoNaCapa | Record<string, EstadoNaCapa> | string | undefined
  >;
};

export const CapaConversa: React.FC<CapaDaConversa> = (props) => {
  // A capa mostra o lugar onde o vídeo começa
  const lugar = resolverCenario(props.cenas?.[0]?.cenario ?? props.cenario, props.cenariosProprios as CenarioProprio[] | undefined);
  const { Cenario, Frente } = lugar;
  const { fundo, def: estilo } = estiloDe(props.estilo);
  const CamadaDaFrente = estilo.Frente ?? estilo.Camada;
  const titulo = props.capa?.titulo ?? props.titulo ?? "";
  const elenco = elencoDa(props);
  const lugares = lugaresDo(elenco);
  // A pose da capa: em capa.estados (como nas cenas) ou direto em capa.<id>;
  // o que faltar vem da primeira fala em que a pessoa aparece
  const estadoDe = (quem: string): Estado => {
    const direto = props.capa?.[quem];
    const daCapa = props.capa?.estados?.[quem] ?? (direto && typeof direto === "object" ? (direto as EstadoNaCapa) : undefined);
    let daFala: Estado = { pose: "normal", expressao: "feliz" };
    for (const cena of props.cenas ?? []) {
      const estado = estadoNaCena(cena, quem);
      if (estado) {
        daFala = estado;
        break;
      }
    }
    return { pose: daCapa?.pose ?? daFala.pose, expressao: daCapa?.expressao ?? daFala.expressao };
  };
  return (
    <AbsoluteFill style={{ background: fundo === "noite" ? "#0A0F26" : "#FBE7DA" }}>
      <estilo.Fundo fundo={fundo} Cenario={Cenario} cenario={lugar.nome} />
      {elenco.map(({ id, visual, desenho, tipo, objeto }, indice) =>
        tipo === "criatura" ? (
          <Sombra
            desenho={desenho}
            key={id}
            momentos={[{ em: 0, ...estadoDe(id) }]}
            palavras={[]}
            altura={960}
            espelhar={lugares[indice].espelhar}
            semente={lugares[indice].semente}
            objeto={objeto}
            style={{ position: "absolute", left: lugares[indice].left - 20, top: 700 }}
          />
        ) : (
        <estilo.Personagem
          key={id}
          noite={fundo === "noite"}
          visual={visual}
          desenho={desenho}
          momentos={[{ em: 0, ...estadoDe(id) }]}
          palavras={[]}
          altura={960}
          espelhar={lugares[indice].espelhar}
          semente={lugares[indice].semente}
          style={{ position: "absolute", left: lugares[indice].left - 20, top: 700 }}
        />
        ),
      )}
      {Frente && (
            <CamadaDaFrente fundo={fundo}>
              <Frente />
            </CamadaDaFrente>
          )}
      {/* A etiqueta da parte fica em cima do título: embaixo, cobria a cena */}
      <div style={{ position: "absolute", top: props.parte ? 180 : 270, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        {props.parte && (
          <div style={{ background: cores.destaque, color: cores.textoNoDestaque, fontFamily: fontes.titulo, fontWeight: 800, fontSize: 44, padding: "8px 32px", borderRadius: 50, border: `6px solid ${TRACO}` }}>
            {props.parte}
          </div>
        )}
        <div style={{ background: "#FFFFFF", border: `7px solid ${TRACO}`, borderRadius: 44, padding: "30px 40px", boxShadow: "0 18px 0 rgba(43,35,64,0.15)" }}>
          <Texto texto={titulo} destaque={props.capa?.destaque} tamanho={88} cor={TRACO} />
        </div>
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

export const FichaDoPersonagem: React.FC<{ personagem?: PersonagemDaCena; estilo?: EstiloDaPeca }> = ({ personagem, estilo: doCanal }) => {
  const p = personagem ?? ELENCO_PADRAO[0];
  const { fundo, def: estilo } = estiloDe(doCanal);
  const noite = fundo === "noite";
  return (
    <AbsoluteFill style={{ background: noite ? "#0A0F26" : "#FBE7DA", flexDirection: "row", flexWrap: "wrap" }}>
      <FiltrosDosEstilos />
      {SITUACOES_DA_FICHA.map((s) => (
        <div key={s.nome} style={{ width: 540, height: 960, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 30 }}>
          {p.tipo === "criatura" ? (
            <Sombra desenho={p.desenho} momentos={[{ em: 0, pose: s.pose, expressao: s.expressao }]} palavras={s.falando ? [{ inicio: 0, fim: 999 }] : []} altura={820} objeto={p.objeto} />
          ) : (
            <estilo.Personagem
              noite={noite}
              visual={p.visual}
              desenho={p.desenho}
              momentos={[{ em: 0, pose: s.pose, expressao: s.expressao }]}
              palavras={s.falando ? [{ inicio: 0, fim: 999 }] : []}
              altura={820}
            />
          )}
          <div style={{ fontFamily: fontes.titulo, fontSize: 36, fontWeight: 800, color: noite ? "#F4F6FF" : TRACO }}>{s.nome}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};
