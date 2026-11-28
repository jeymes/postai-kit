import { Audio } from "@remotion/media";
import { textosDoIdioma } from "../nucleo/textosFixos";
import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { EfeitosContexto, Som, SONS, type TipoSom } from "../componentes/audio/Som";
import { resolverCenario, type CenarioProprio } from "../componentes/cenarios/Cenarios";
import { HoraEmDestaque, Notificacao } from "../componentes/cenas/Notificacao";
import { TRACO, type FormaDaBoca, type Momento, type Palavra } from "../componentes/personagens/Boneco";
import { ELENCO } from "../componentes/personagens/elenco";
import { PENTEADOS, type Desenho, type Visual } from "../componentes/personagens/Boneco";
import { Legendas, type Legenda } from "../componentes/texto/Legendas";
import { Texto } from "../componentes/texto/Texto";
import { BalaoDeChamada, CartaoDeChamada, medidaDoCartao } from "../componentes/cenas/ChamadaAnimada";
import { cores, fontes } from "../nucleo/marca";
import { estiloDe, estiloSchema, type EstiloDaPeca } from "../estilos/registro";
import { FiltrosDosEstilos } from "../estilos/filtros";
import { OBJETOS_DA_SOMBRA, Sombra } from "../componentes/personagens/Sombra";
import { CelularAceso } from "../componentes/personagens/Boneco";
import { LuzDoAviso } from "../componentes/efeitos/LuzDoAviso";
import { FraseNaLuz } from "../componentes/cenas/FraseNaLuz";
import { CONVERSA, estimarPalavras, falaDoNarrador, FPS, quadrosDaFalaConversa, quadrosDoVideoDoApp } from "./tempos";
import { useConferirTexto } from "../componentes/conferir";
import { PoltronaNaFrente, TODOS_ATRAS_DA_FRENTE } from "../componentes/cenarios/Cenarios";
import { TestaContexto } from "../componentes/personagens/MarcaNaTesta";
import { ObjetoNaMaoContexto } from "../componentes/objetos/ObjetosDeApoio";
import { textoDoQr } from "../componentes/midia/QrCode";
import {
  afastarParaOQr,
  baixoDoTitulo,
  camposExtrasDaCena,
  objetoAgora,
  ObjetoAoLado,
  QrNaCena,
  QrNoFim,
  qrDoRoteiroSchema,
  testaAgora,
} from "./conversa/extras";
import {
  cameraAgora,
  camposDeDirecao,
  camposDeDirecaoDoTopo,
  enquadrar,
  eventosDasAcoes,
  EXPRESSOES_DO_ROTEIRO,
  momentoAgora,
  montarMomentos,
  naPoseAgora,
  objetoNaMaoAgora,
  pegadasDe,
  planosDasFalas,
  POSES_DO_ROTEIRO,
  quandoOutroFala,
  semCortarNinguem,
  transformDaCamera,
  trocaAgora,
  trocasDeCenario,
} from "./conversa/direcao";
import { TrocaDeCena } from "./conversa/TrocaDeCena";
import { andarAgora, ehSentado, MaoDoObjetoContexto, type Momento2D } from "../componentes/personagens/movimento";
import { POSES as POSES_DO_KIT } from "../componentes/personagens/Boneco";
import { figurinoDe, numeroDoTexto, QUANTOS_FIGURINOS } from "../componentes/personagens/figurino";
import { CamadaDaFala, ilustraSchema, palavrasDaNarracao, palavrasEstimadas } from "../componentes/ilustracao";

// Cena de conversa entre personagens fixos do elenco, em desenho 2D: cada
// cena é a fala de um personagem, com a pose e a expressão de cada um naquele
// momento. A voz (uma por personagem), a legenda e a boca vêm do
// `npm run narrar`; sem ela, a prévia sai muda, com o tempo estimado.

// As poses: as de sempre e, desde 27/11/2026, apontando, ombros, bracos-cruzados, acenando, maos-juntas e queixo
const POSES = POSES_DO_ROTEIRO;
const EXPRESSOES = EXPRESSOES_DO_ROTEIRO;
const nomesDosSons = Object.keys(SONS) as [TipoSom, ...TipoSom[]];

const estadoSchema = z.object({ pose: z.enum(POSES), expressao: z.enum(EXPRESSOES) });
type Estado = z.infer<typeof estadoSchema>;

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "cor em #RRGGBB");
export const personagemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,20}$/).describe('Quem fala, nas cenas ("quem")'),
  nome: z.string().max(30),
  voz: z.string().optional().describe("Voz do kit (src/componentes/personagens/vozes.ts)"),
  vozGoogle: z.string().optional().describe("Voz do Google (src/componentes/personagens/vozesGoogle.ts), quando o canal narra pelo Gemini ou Chirp; o npm run elenco copia"),
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
      figurinos: z.array(z.string()).max(4).optional().describe("Outros figurinos: corpos alternativos (sem braços), para variar a roupa por episódio"),
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
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number(), fimDeFrase: z.boolean().optional() })),
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
      "Onde começa: atelie, escritorio, cafe, quarto, sala, cozinha, banheiro, garagem, carro (no quarto e na sala, pose sentado à esquerda; no carro, os dois) ou o id de um cenário criado pela equipe (cenariosProprios)",
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
        quem: z
          .string()
          .optional()
          .describe(
            'O id de quem fala (do elenco). Sem "quem" (ou com "narrador"), fala o NARRADOR, que não aparece: a voz dele ("voz" no topo) toca, a legenda sai maior e os personagens fazem a cena pelos "estados" (pose e expressão), sem mexer a boca',
          ),
        fala: z.string().describe("O que o personagem (ou o narrador) diz: 1 frase curta"),
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
        noite: z
          .boolean()
          .optional()
          .describe("Vira noite (true) ou volta ao dia (false) a partir desta fala, no mesmo vídeo (ex.: a cena da madrugada no quarto); vale até outra fala mudar"),
        notificacao: z
          .object({
            titulo: z.string().max(30).optional().describe("Sem ele: o nome da marca (com o logo). Com o nome de uma pessoa (mensagem dela): ícone neutro de mensagem"),
            texto: z.string().max(60),
          })
          .optional()
          .describe("Cartão de notificação (título e texto que o roteiro define), junto com a luz ou sozinho"),
        narracao: narracaoSchema.optional(),
        // Objetos de apoio, marca na testa e QR (26/11/2026): ver conversa/extras.tsx
        ...camposExtrasDaCena,
        // Ações na palavra, plano da câmera e foco (27/11/2026): ver conversa/direcao.ts
        ...camposDeDirecao,
        // Ilustração da fala (27/11/2026): número, conta, gráfico, ícone, texto, seta, círculo, pensamento ou objeto na palavra dita
        ilustra: ilustraSchema,
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
    .object({
      em: z.string(),
      de: z.number().int(),
      ate: z.number().int(),
      forca: z.number().min(0.05).max(0.6).optional().describe("Quanto aproxima: 0.15 leve, 0.25 (padrão) bem visível no celular, 0.4 a 0.6 susto ou surpresa"),
    })
    .optional()
    .describe("A câmera aproxima de um personagem da cena `de` até a `ate`"),
  convidados: z
    .array(z.object({ id: z.string(), nome: z.string(), descricao: z.string() }))
    .optional()
    .describe("Personagens que só este episódio precisa: a designer desenha em canais/<canal>/convidados/<id>.json"),
  ctaInicial: z.string().max(60).optional().describe('Balão curto (até 36 caracteres, uma linha; acima de 28 a letra diminui) embaixo do título nos primeiros segundos, ex.: "Marca quem é assim 😂". Sem ele, não há balão'),
  idioma: z.enum(["pt", "en", "es"]).optional().describe("O idioma do vídeo (o narrar grava): o botão do fim sai nele"),
  musica: z
    .string()
    .optional()
    .describe("Trilha de fundo, baixinha por baixo das falas: musica/calma-esperanca.mp3, calma-reflexao.mp3 ou calma-drama.mp3 (só se o canal pedir)"),
  volumeMusica: z.number().min(0).max(0.3).optional().describe("Volume da trilha (padrão 0.08, baixinho)"),
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
  qr: qrDoRoteiroSchema,
  legendas: z.boolean().default(true),
  efeitos: z.boolean().default(true),
  vozes: z.record(z.string(), z.object({ voz: z.string(), velocidade: z.number().optional(), vozGoogle: z.string().optional() })).optional(),
  voz: z
    .string()
    .optional()
    .describe('A voz do NARRADOR (as falas sem "quem"): um id do catálogo, ex.: "masculina-12"'),
  // Câmera viva, figurino e número do episódio (27/11/2026): ver conversa/direcao.ts
  ...camposDeDirecaoDoTopo,
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
  camera: "viva",
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

/** Onde a pessoa está (para as ações de andar): a posição dela no elenco e o lugar na tela */
type OndeEsta = { indice: number; pessoas: number; left: number };

function momentosDe(
  quem: string,
  linha: Linha,
  cartaoFinalEm?: number,
  cartaoFinal?: { pose?: Momento2D["pose"]; expressao?: Momento["expressao"] },
  onde: OndeEsta = { indice: 0, pessoas: 2, left: 50 },
  /** Quando o lugar muda: quem andou ou virou volta ao lugar, de frente (atrás da cortina) */
  trocasDeLugar: number[] = [],
): Momento2D[] {
  const eventos: Array<Partial<Momento2D> & { em: number }> = [{ em: 0, pose: "normal", expressao: "neutra" }];
  for (const em of trocasDeLugar) eventos.push({ em, x: 0, salto: true, virado: false, costas: false });
  for (const trecho of linha) {
    const { cena, inicio, palavras } = trecho;
    const estado = estadoNaCena(cena, quem);
    if (estado) eventos.push({ em: Math.max(1, inicio - 6), ...estado });
    // A virada no meio da fala: no começo da palavra do meio
    const meio = cena.meio?.[quem];
    const palavraDoMeio = palavras[Math.floor(palavras.length / 2)];
    if (meio && palavraDoMeio) eventos.push({ em: Math.max(inicio + 1, palavraDoMeio.inicio - 4), ...meio });
    // As ações na palavra exata (27/11/2026)
    eventos.push(...eventosDasAcoes(trecho, quem, onde.indice, onde.pessoas, onde.left));
  }
  const momentos = montarMomentos(eventos);
  // No cartão final: o que o roteiro pedir; sem isso, comemoram (com o pulinho
  // da reação) só se a história acaba bem; depois de medo ou tristeza, ficam como estavam
  if (cartaoFinalEm !== undefined) {
    const ultimo = momentos[momentos.length - 1];
    // Quem acaba mal é a HISTÓRIA, pela última cena (24/11/2026): antes valia a última
    // expressão de cada um, e a Lia, preocupada lá no começo e fora das cenas seguintes,
    // ficava de cara fechada no cartão de um fim feliz. Sem expressão na última cena, a dela.
    const cenaFinal = linha[linha.length - 1]?.cena;
    const doFim = cenaFinal
      ? [
          ...Object.values(cenaFinal.estados ?? {}),
          ...Object.values(cenaFinal.meio ?? {}),
          ...(cenaFinal.acoes ?? []),
          cenaFinal.noiva,
          cenaFinal.organizadora,
        ]
          .map((e) => e?.expressao)
          .filter((e): e is Momento["expressao"] => Boolean(e))
      : [];
    const acabaMal = doFim.length ? doFim.some((e) => FIM_RUIM.has(e)) : FIM_RUIM.has(ultimo.expressao);
    // No cartão, todos de frente, no lugar e de pé (quem andou ou virou volta)
    momentos.push({
      em: cartaoFinalEm,
      pose: cartaoFinal?.pose ?? (acabaMal ? ultimo.pose : "comemorando"),
      expressao: cartaoFinal?.expressao ?? (acabaMal ? ultimo.expressao : "radiante"),
      x: momentos.some((m) => typeof m.x === "number") ? 0 : undefined,
      virado: momentos.some((m) => m.virado) ? false : undefined,
      costas: momentos.some((m) => m.costas) ? false : undefined,
    });
  }
  return momentos;
}

// `abaixo`: o que entra embaixo do título, na mesma coluna (a hora, a notificação e o balão
// do CTA inicial): nada se sobrepõe, com o título em 1, 2 ou 3 linhas
const TituloPov: React.FC<{ titulo: string; parte?: string; abaixo?: React.ReactNode; balao?: React.ReactNode }> = ({ titulo, parte, abaixo, balao }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Já na tela no quadro 0: é o que aparece na prévia do feed. Só cresce um pouco.
  const p = spring({ frame, fps, config: { damping: 14 } });
  const medida = useConferirTexto<HTMLDivElement>("titulo");
  return (
    <div ref={medida} style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, scale: String(0.94 + 0.06 * p) }}>
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
      {balao}
    </div>
  );
};

const Cartao: React.FC<{ cartao: NonNullable<ConversaProps["cartao"]>; entra: number; sai: number; contaDe: number }> = ({ cartao, entra, sai, contaDe }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dentro = spring({ frame: frame - entra, fps, config: { damping: 12, stiffness: 150 } });
  // A saída é só um fade de 8 quadros, no tamanho cheio: encolhendo, sobrava um retângulo
  // branco minúsculo perto do topo por alguns quadros (anotações da crítica de 23 e 25/11/2026)
  const sumindo = interpolate(frame, [sai, sai + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const escala = dentro;
  if (escala <= 0.01 || sumindo <= 0.02) return null;
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
        opacity: sumindo,
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
// A mão com o celular, medida no quadro (23/11/2026: era 211 e 329, e a luz nascia uns
// 45 px ao lado do celular; com zoom ficava pior, porque a luz estava fora dele)
const maoDe = (lugar: Lugar, sentado: boolean) => ({ x: lugar.left + (lugar.espelhar ? 284 : 255), y: sentado ? 1289 : 1190 });
const rostoDe = (lugar: Lugar, sentado: boolean) => ({ x: lugar.left + 270, y: sentado ? 1098 : 999 });
/** O alto da cabeça de quem está de pé (no cenário, sem câmera) */
const TOPO_DA_CABECA = 905;
/**
 * O colo e as pernas de quem está sentado no sofá da sala (o corpo é cortado no
 * quadril). Na cama o cobertor cobre; no sofá a pessoa parecia sem pernas.
 */
const PernasNoSofa: React.FC<{ x: number; y: number; calca?: string; sapato?: string; cor?: string; palito: boolean; liso: boolean }> = ({ x, y, calca, sapato, cor, palito, liso }) => {
  const traco = liso ? { stroke: "none" } : { stroke: TRACO, strokeWidth: 6 };
  return (
    // Na frente do assento (o sofá da sala e a poltrona, que fica na frente da pessoa)
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}>
      <g transform={`translate(0 ${y})`}>
        {palito ? (
          <path
            d={`M${x - 14} 1415 L${x - 40} 1590 L${x - 70} 1590 M${x + 14} 1415 L${x + 40} 1590 L${x + 70} 1590`}
            stroke={cor ?? TRACO}
            strokeWidth={23}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <>
            {[-40, 40].map((d) => (
              <rect key={d} x={x + d - 26} y={1430} width={52} height={150} rx={20} fill={calca ?? "#3E4A6B"} {...traco} />
            ))}
            <rect x={x - 82} y={1396} width={164} height={64} rx={26} fill={calca ?? "#3E4A6B"} {...traco} />
            {[-40, 40].map((d) => (
              <ellipse key={`s${d}`} cx={x + d + (d < 0 ? -8 : 8)} cy={1588} rx={38} ry={20} fill={sapato ?? TRACO} {...traco} />
            ))}
          </>
        )}
      </g>
    </svg>
  );
};

/**
 * A roupa do episódio de alguém (figurino.tsx): a do roteiro (número ou por id), senão a do
 * número do episódio (ou do título). Desenho próprio: um dos `desenho.figurinos` (corpos que a
 * designer desenhou); sem eles, o corpo de sempre.
 */
function vestido(props: Partial<Pick<ConversaProps, "figurino" | "episodio" | "titulo">>, p: PersonagemDaCena, indice: number): { visual: Visual; desenho?: Desenho } {
  const pedido = typeof props.figurino === "number" ? props.figurino : props.figurino?.[p.id];
  const n = pedido ?? ((props.episodio ?? numeroDoTexto(props.titulo ?? "")) + indice * 2) % QUANTOS_FIGURINOS;
  const visual = (p.tipo === "criatura" ? p.visual : { ...p.visual, figurino: figurinoDe(p.visual, n) }) as Visual;
  const desenho = p.desenho && n > 0 && p.desenho.figurinos?.length ? { ...p.desenho, corpo: p.desenho.figurinos[(n - 1) % p.desenho.figurinos.length] } : p.desenho;
  return { visual, desenho };
}

const comCelular = (pose?: string) => pose === "celular" || pose === "sentado";
/** A Sombra (criatura) só conhece as poses do kit: as novas viram a normal */
const poseDaSombra = (pose: string): Momento["pose"] => (pose in POSES_DO_KIT ? (pose as Momento["pose"]) : "normal");

// A primeira do elenco fica à esquerda; a segunda, à direita, virada para ela
const LUGAR: Lugar[] = [
  { left: 50, espelhar: false, origem: "320px 1150px", semente: 0 },
  { left: 490, espelhar: true, origem: "760px 1150px", semente: 3 },
];
// Um personagem sozinho fica no meio da tela, de frente
const SOZINHO: Lugar[] = [{ left: 270, espelhar: false, origem: "540px 1150px", semente: 0 }];
const lugaresDo = (elenco: PersonagemDaCena[]) => (elenco.length === 1 ? SOZINHO : LUGAR);

/** O móvel do cenário cobre as pernas de quem senta? (a cama/o sofá: o da esquerda numa conversa de dois; o carro: todos) */
export function cobertoPeloMovel(temFrente: boolean, cenario: string, pessoas: number, indice: number) {
  return temFrente && ((pessoas === 2 && indice === 0) || TODOS_ATRAS_DA_FRENTE.includes(cenario));
}

export const Conversa: React.FC<ConversaProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Quem senta sem móvel não vira mais de pé (26/11/2026): ganha a poltrona (ver cobertoPeloMovel)
  const linha = linhaDoTempo(props.cenas);
  const elenco = elencoDa(props);
  const lugares = lugaresDo(elenco);
  const naCena = (i: number) => linha[Math.min(Math.max(i, 0), linha.length - 1)].inicio;
  const fimDaCena = (i: number) => (i >= linha.length ? linha[linha.length - 1].inicio + 60 : naCena(i));

  // Onde termina a conversa (e começa o cartão do CTA final)
  const ultima = linha[linha.length - 1];
  const fimDasFalas = ultima.inicio + quadrosDaFalaConversa(ultima.cena) + CONVERSA.entreFalas + CONVERSA.fim;
  // A cena do versículo (se tiver) vem antes do CTA final
  const inicioDoApp = fimDasFalas + (props.final ? CONVERSA.final : 0);
  const quadrosDoApp = props.videoDoApp ? quadrosDoVideoDoApp(props.videoDoApp) : 0;
  const inicioDoCta = inicioDoApp + quadrosDoApp;
  // Trocas de lugar (e de dia e noite) com tempo mínimo e cortina (direcao.ts, TrocaDeCena.tsx)
  const trocas = React.useMemo(
    () => trocasDeCenario(linha, props.cenario ?? "atelie"),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as props do vídeo não mudam entre os quadros
    [props],
  );
  const ids = elenco.map((p) => p.id);
  // Cada pessoa: os momentos (pose, expressão, ações), a roupa do episódio e o que segura.
  // Calculado uma vez por vídeo (não muda de um quadro para outro)
  const pessoas = React.useMemo(
    () =>
      elenco.map((p, indice) => {
        const onde = { indice, pessoas: elenco.length, left: lugares[indice].left };
        const trocasDeLugar = trocas.filter((t) => t.mudouLugar).map((t) => t.em);
        const momentos = momentosDe(p.id, linha, undefined, undefined, onde, trocasDeLugar);
        const comCartao = momentosDe(p.id, linha, props.ctaFinal ? inicioDoCta : undefined, { ...props.cartaoFinal, ...props.cartaoFinal?.estados?.[p.id] }, onde, trocasDeLugar);
        return {
          ...p,
          ...vestido(props, p, indice),
          momentos,
          comCartao,
          pegadas: pegadasDe(linha, p.id),
          olhar: quandoOutroFala(linha, p.id, ids),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as props do vídeo não mudam entre os quadros
    [props],
  );
  const momentosDaPessoa = (quem: string) => pessoas.find((p) => p.id === quem)?.momentos ?? momentosDe(quem, linha);
  const poseAgora = (quem: string) => momentoAgora(momentosDaPessoa(quem), frame)?.pose;
  // Quanto cada um andou (ações de andar) e o abraço (quem está na pose chega perto do outro)
  const andou = (indice: number) => andarAgora(pessoas[indice]?.comCartao ?? [], frame).x;
  /** Quanto alguém tinha andado num quadro (para planejar a câmera de cada fala) */
  const andouEm = (indice: number, quadro: number) => andarAgora(pessoas[indice]?.comCartao ?? [], quadro).x;
  /** Em cada fala: alguém está andando em algum momento dela (do respiro antes dela até a próxima)? Uma vez por vídeo */
  const andandoPorFala = React.useMemo(
    () =>
      linha.map((l, k) => {
        const ate = linha[k + 1]?.inicio ?? l.inicio + quadrosDaFalaConversa(l.cena);
        for (let q = l.inicio - 6; q < ate; q += 4) if (pessoas.some((p) => p.tipo !== "criatura" && andarAgora(p.comCartao, q).andando > 0.05)) return true;
        return false;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- as props do vídeo não mudam entre os quadros
    [props],
  );
  /** O lugar de alguém agora (com o que andou) */
  const aqui = (indice: number): Lugar => ({ ...lugares[indice], left: lugares[indice].left + andou(indice) });
  const trocaDeAgora = trocaAgora(trocas, frame);

  // Câmera viva (27/11/2026): um plano por fala (aberto, medio ou close no rosto de quem fala),
  // troca suave e um respiro; o zoom do roteiro vira close. Abre no cartão do fim.
  const alvosDaCamera = (() => {
    const cartao = props.cartao;
    const planos = planosDasFalas({
      falas: linha.map(({ cena }, k) => ({
        quem: cena.quem,
        camera: cena.camera,
        foco: cena.foco,
        expressoes: Object.fromEntries(ids.map((id) => [id, (cena.meio?.[id] ?? estadoNaCena(cena, id))?.expressao])),
        poses: ids.flatMap((id) => [estadoNaCena(cena, id)?.pose, cena.meio?.[id]?.pose, ...(cena.acoes ?? []).filter((a) => a.quem === id).map((a) => a.pose)]).filter(
          (x): x is NonNullable<typeof x> => Boolean(x),
        ),
        // Cartão, QR, notificação ou abraço: a cena precisa do quadro inteiro
        cheia:
          Boolean(cena.qr || cena.notificacao || cena.luz) ||
          Boolean(cartao && k >= cartao.entra && k <= cartao.sai) ||
          ids.some((id) => estadoNaCena(cena, id)?.pose === "abraco"),
        // Alguém andando (a ação da fala ou a caminhada da fala anterior que ainda não acabou):
        // aberto sempre, até contra o close do roteiro (28/11/2026)
        andando: (cena.acoes ?? []).some((a) => a.acao?.startsWith("andar") || a.acao === "voltar") || andandoPorFala[k],
      })),
      ids,
      viva: props.camera !== "fixa",
      zoom: props.zoom,
    });
    const alvos = linha.map(({ inicio }, k) => {
      const { plano, foco } = planos[k];
      const quemFoco = elenco[foco];
      if (!quemFoco || plano === "aberto") return { em: Math.max(0, inicio - 6), camera: enquadrar("aberto", null) };
      const sentado = ehSentado(momentoAgora(momentosDaPessoa(quemFoco.id), inicio + 10)?.pose);
      const r = rostoDe(lugares[foco], sentado);
      const forca = props.zoom && k >= props.zoom.de && k <= props.zoom.ate ? props.zoom.forca ?? 0.25 : undefined;
      const rosto = { x: r.x + andou(foco), y: r.y };
      const camera = enquadrar(plano, rosto, forca);
      if (plano !== "close") return { em: Math.max(0, inicio - 6), camera };
      // No close, o outro entra inteiro ou sai inteiro do quadro (28/11/2026: ficava meio corpo na borda)
      const outros = elenco.flatMap((p, i) => (i === foco ? [] : [lugares[i].left + 270 + andouEm(i, inicio + 10)]));
      return { em: Math.max(0, inicio - 6), camera: semCortarNinguem(camera, rosto, outros) };
    });
    if (props.ctaFinal) alvos.push({ em: inicioDoCta - 8, camera: enquadrar("aberto", null) });
    return alvos;
  })();
  const camera = cameraAgora(alvosDaCamera, frame);
  // Onde a ilustração do alto tem que parar em cada fala: acima da cabeça, pelo plano da fala
  // (28/11/2026: no medio/close a cabeça sobe e o gráfico cobria o rosto da Bia na aula)
  const fimDoTopoNaFala = (k: number) => {
    const c = alvosDaCamera[k]?.camera ?? enquadrar("aberto", null);
    const cabeca = 960 + c.z * 1.03 * (TOPO_DA_CABECA - c.y);
    return Math.min(850, Math.round(cabeca - 30));
  };
  let falaAgora = 0;
  linha.forEach((l, i) => {
    if (l.inicio <= frame) falaAgora = i;
  });
  // A legenda do NARRADOR (fala sem "quem") sai maior e um pouco mais alta (26/11/2026: o dono
  // pediu o narrador no chapado, "com legenda grande"). A legenda só emenda entre falas do
  // mesmo tipo: a página de uma fala de personagem nunca aparece no tamanho do narrador (e o
  // contrário). Sem narrador no roteiro é um trecho só, com todas as falas: igual a antes.
  const doNarrador = linha.map((l) => falaDoNarrador(l.cena.quem, elenco.map((p) => p.id)));
  const narradorAgora = doNarrador[falaAgora];
  let trechoDe = falaAgora;
  let trechoAte = falaAgora;
  while (trechoDe > 0 && doNarrador[trechoDe - 1] === narradorAgora) trechoDe--;
  while (trechoAte < linha.length - 1 && doNarrador[trechoAte + 1] === narradorAgora) trechoAte++;
  const legendas = linha.slice(trechoDe, trechoAte + 1).flatMap((l) => l.legendas);
  // O lugar e o dia/noite de agora: pelas trocas (no respiro entre as falas, com a cortina);
  // antes trocava seco no começo da fala, e uma fala curta fazia o cenário piscar
  const lugarAgora = resolverCenario(trocaDeAgora.cenario, props.cenariosProprios as CenarioProprio[] | undefined);
  const { Cenario, Frente } = lugarAgora;
  const mudouANoite = trocaDeAgora.noite;
  const { fundo, def: estilo, escuro } = estiloDe(
    mudouANoite === undefined ? props.estilo : { ...props.estilo, fundo: mudouANoite ? "noite" : "claro" },
  );
  const CamadaDaFrente = estilo.Frente ?? estilo.Camada;
  const noite = fundo === "noite";
  // A primeira fala com a luz do aviso: a Sombra é empurrada e some ali, e o
  // celular de quem está com ele na mão acende dourado
  const naLuz = linha.find((l) => l.cena.luz);
  const luzEm = naLuz?.inicio;
  const quemAcende = naLuz
    ? elenco.findIndex((p) => p.tipo !== "criatura" && comCelular(estadoNaCena(naLuz.cena, p.id)?.pose))
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
  // Quando o cartão final entra, os personagens sobem (23/11/2026): o cartão começa na
  // altura 1150 e o logo dele chega a 1040, onde ficavam a boca e o queixo deles. Os pés
  // ficam atrás do cartão; o cenário fica no lugar
  // Chamada longa: o cartão começa mais alto (medidaDoCartao) e eles sobem o mesmo tanto a mais
  const subirNoCartao = props.ctaFinal
    ? (290 + (1020 - medidaDoCartao(props.ctaFinal).topo)) * spring({ frame: frame - inicioDoCta, fps, config: { damping: 16, stiffness: 110 } })
    : 0;
  // QR no cartão do fim (26/11/2026): as pessoas abrem espaço para ele no meio
  const qrDoFim = props.ctaFinal && props.qr && props.qr.noFim !== false ? textoDoQr(props.qr.texto) : "";
  const afastarNoQr = qrDoFim ? spring({ frame: frame - inicioDoCta - 6, fps, config: { damping: 16, stiffness: 110 } }) : 0;
  return (
    <AbsoluteFill style={{ background: noite ? "#0A0F26" : "#FBE7DA" }}>
      <EfeitosContexto.Provider value={props.efeitos}>
        <AbsoluteFill style={{ transform: transformDaCamera(camera), transformOrigin: "0 0" }}>
          <estilo.Fundo fundo={fundo} Cenario={Cenario} cenario={lugarAgora.nome} />
          {pessoas.map(({ id: quem, visual, desenho, tipo, objeto, momentos, comCartao, pegadas, olhar }, indice) => {
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
                  : resolverCenario(trocaAgora(trocas, primeira?.inicio ?? 0).cenario, props.cenariosProprios as CenarioProprio[] | undefined).origem;
              const xNoDesenho = pontoNaTela ? (pontoNaTela.x - lugar.left) / 0.9 - 100 : 0;
              const de = pontoNaTela
                ? { x: lugar.espelhar ? 400 - xNoDesenho : xNoDesenho, y: (pontoNaTela.y - 790) / 0.9 }
                : undefined;
              return (
                <Sombra
                  key={quem}
                  // A Sombra só conhece as poses do kit (as novas viram a normal)
                  momentos={momentos.map((m) => ({ ...m, pose: poseDaSombra(m.pose) }))}
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
                  style={{ position: "absolute", left: lugar.left, top: 790 - subirNoCartao }}
                />
              );
            }
            // Abraço: quem está na pose chega perto do outro (os dois andam até o meio) e volta
            // devagar (antes voltava num salto quando saía do abraço)
            const agora = momentoAgora(comCartao, frame);
            const chegarPerto = elenco.length === 2 ? naPoseAgora(comCartao, "abraco", frame) * (indice === 0 ? 125 : -125) : 0;
            // O objeto na mão: sempre na mesma mão (a livre), entrando e saindo devagar
            const naMao = objetoNaMaoAgora(pegadas, momentos, frame, fps);
            return (
              <CelularAceso.Provider key={quem} value={luzEm !== undefined && frame >= luzEm && indice === quemAcende}>
              <TestaContexto.Provider value={testaAgora(linha, quem, frame)}>
              <ObjetoNaMaoContexto.Provider value={naMao?.tipo ?? null}>
              <MaoDoObjetoContexto.Provider value={naMao ? { mao: naMao.mao, escala: naMao.escala } : { mao: "dir", escala: 0 }}>
              <estilo.Personagem
                noite={noite}
                visual={visual}
                desenho={desenho}
                momentos={comCartao}
                palavras={minhas.flatMap((l) => l.palavras)}
                boca={minhas.some((l) => l.boca) ? minhas.flatMap((l) => l.boca ?? []) : undefined}
                altura={900}
                espelhar={lugar.espelhar}
                semente={lugar.semente}
                vida
                olhar={olhar}
                // De pé, na frente do móvel (cama, sofá): atrás dele os pés apareciam por baixo,
                // como se flutuasse; sentado, fica atrás (o móvel cobre as pernas)
                style={{
                  position: "absolute",
                  left: lugar.left + chegarPerto + andou(indice) + afastarNoQr * afastarParaOQr(elenco.length, indice),
                  top: 790 - subirNoCartao,
                  // No carro, todos ficam atrás do painel (ele cobre o colo). Só fica atrás do móvel
                  // quem o móvel cobre (cobertoPeloMovel): de pé, ou sentado sem ser o da cama/sofá
                  // (sozinho no meio, o da direita), fica na frente dele, e a poltrona na frente de
                  // todos (28/11/2026: sozinho na cama, a cama cortava o corpo e as pernas sumiam)
                  zIndex:
                    TODOS_ATRAS_DA_FRENTE.includes(lugarAgora.nome) ||
                    (ehSentado(agora?.pose) && cobertoPeloMovel(Boolean(Frente), lugarAgora.nome, elenco.length, indice))
                      ? 0
                      : 2,
                }}
              />
              </MaoDoObjetoContexto.Provider>
              </ObjetoNaMaoContexto.Provider>
              </TestaContexto.Provider>
              </CelularAceso.Provider>
            );
          })}
          {Frente && (
            <AbsoluteFill style={{ zIndex: 1 }}>
              <CamadaDaFrente fundo={fundo}>
                <Frente />
              </CamadaDaFrente>
            </AbsoluteFill>
          )}
          {/* Poltrona de quem está sentado sem a cama, o sofá ou o painel cobrindo as pernas */}
          {elenco.map(({ id: quem, tipo }, indice) => {
            if (tipo === "criatura") return null;
            if (!ehSentado(poseAgora(quem))) return null;
            if (cobertoPeloMovel(Boolean(Frente), lugarAgora.nome, elenco.length, indice)) return null;
            return (
              // Na frente da pessoa (que fica na frente do móvel do cenário, se houver)
              <AbsoluteFill key={`poltrona-${quem}`} style={{ zIndex: 3 }}>
                <CamadaDaFrente fundo={fundo}>
                  <PoltronaNaFrente centro={lugares[indice].left + 270 + andou(indice)} subir={subirNoCartao} />
                </CamadaDaFrente>
              </AbsoluteFill>
            );
          })}
          {/* Os objetos de apoio de pé ao lado das pessoas (some quando entra o cartão do fim) */}
          {(!props.ctaFinal || frame < inicioDoCta) &&
            elenco.map(({ id: quem, tipo }, indice) => {
              if (tipo === "criatura") return null;
              const objeto = objetoAgora(linha, quem, "ao-lado", frame);
              if (!objeto) return null;
              const centro = lugares[indice].left + 270 + andou(indice);
              const fora = elenco.length === 2 && indice === 0 ? "esquerda" : "direita";
              return (
                <ObjetoAoLado
                  key={`apoio-${quem}`}
                  tipo={objeto.tipo}
                  desde={objeto.desde}
                  centro={centro}
                  lado={objeto.lado ?? fora}
                  chao={1652}
                  Camada={({ children }) => <estilo.Camada fundo={fundo}>{children}</estilo.Camada>}
                />
              );
            })}
          {/* No sofá e na poltrona não há cobertor: o colo e as pernas de quem está sentado ficam na frente do assento */}
          {elenco.map(({ id: quem, visual, tipo }, indice) => {
              if (tipo === "criatura") return null;
              const agora = momentoAgora(momentosDaPessoa(quem), frame);
              if (!ehSentado(agora?.pose)) return null;
              const naPoltrona = !cobertoPeloMovel(Boolean(Frente), lugarAgora.nome, elenco.length, indice);
              if (lugarAgora.nome !== "sala" && !naPoltrona) return null;
              return (
                <PernasNoSofa
                  key={`pernas-${quem}`}
                  x={lugares[indice].left + 270 + andou(indice)}
                  y={-subirNoCartao}
                  calca={visual?.calca}
                  sapato={visual?.sapato}
                  cor={visual?.roupa}
                  palito={estilo.nome === "Palito"}
                  liso={estilo.nome === "Liso"}
                />
              );
            })}
          {/* No escuro, a tela do celular ilumina o rosto de quem está com ele (um feixe claro e fraco) */}
          {escuro &&
            (() => {
              const k = linha.findIndex((l, n) => frame >= l.inicio && frame < (linha[n + 1]?.inicio ?? fimDasFalas));
              if (k < 0 || (luzEm !== undefined && frame >= luzEm)) return null;
              return elenco.map((p, indice) => {
                // A pose de agora (com a virada no meio da fala): guardou o celular, o feixe apaga
                const pose = poseAgora(p.id);
                if (p.tipo === "criatura" || !comCelular(pose)) return null;
                const sentado = pose === "sentado";
                const m = maoDe(aqui(indice), sentado);
                const r = rostoDe(aqui(indice), sentado);
                return (
                  <svg key={`feixe-${p.id}`} viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
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
        {/* A luz do aviso dentro do zoom: fora dele, com a câmera perto, ela ficava ao lado do celular */}
        {linha.map(({ cena, inicio }, i) => {
          if (!cena.luz) return null;
          // A luz nasce no celular de quem está com ele na mão nesta fala; sem
          // ninguém com o celular, não acende (antes acendia na mão vazia do primeiro)
          const indice = elenco.findIndex((p) => p.tipo !== "criatura" && comCelular(estadoNaCena(cena, p.id)?.pose));
          if (indice < 0) return null;
          const sentado = estadoNaCena(cena, elenco[indice].id)?.pose === "sentado";
          const mao = maoDe(aqui(indice), sentado);
          // Apaga quando a próxima fala começa ou quando ele guarda o celular (a virada no meio da fala)
          const proxima = linha[i + 1]?.inicio ?? fimDasFalas;
          const guardou = momentosDaPessoa(elenco[indice].id).find((m) => m.em > inicio && m.em < proxima && !comCelular(m.pose))?.em;
          return <LuzDoAviso key={`luz-${i}`} em={inicio} ate={guardou ?? proxima} x={mao.x} y={mao.y} />;
        })}
        </AbsoluteFill>
        {/* A cortina da troca de lugar (por cima da cena, embaixo do título e da legenda) */}
        <TrocaDeCena trocas={trocas} escuro={escuro} />
        <TituloPov
          titulo={props.titulo}
          parte={props.parte}
          abaixo={(() => {
            // A hora e a notificação da fala de agora, na coluna do título (uma embaixo da outra)
            const daFala = (tem: (c: Cena) => unknown, antes = 0) =>
              linha.findIndex((l, k) => tem(l.cena) && frame >= l.inicio - antes && frame < (linha[k + 1]?.inicio ?? fimDasFalas));
            const h = daFala((c) => c.hora);
            const n = daFala((c) => c.notificacao, 4);
            const notificacao = n >= 0 ? linha[n].cena.notificacao : undefined;
            if (h < 0 && !notificacao) return null;
            return (
              <>
                {h >= 0 && <HoraEmDestaque hora={linha[h].cena.hora ?? ""} noite={escuro} em={linha[h].inicio} />}
                {notificacao && <Notificacao em={linha[n].inicio - 4} texto={notificacao.texto} app={notificacao.titulo} noite={escuro} noFluxo />}
              </>
            );
          })()}
          // O balão do começo na coluna do título, embaixo da hora e da notificação: antes tinha
          // altura fixa (395) e a 2ª ou 3ª linha de um título comprido caía embaixo dele (26/11/2026)
          balao={props.ctaInicial ? <BalaoDeChamada texto={props.ctaInicial} jaNaTela noFluxo /> : undefined}
        />
        {props.cartao && (
          <Cartao
            cartao={props.cartao}
            entra={naCena(props.cartao.entra) + 18}
            sai={fimDaCena(props.cartao.sai)}
            contaDe={naCena(props.cartao.contaNa ?? props.cartao.entra)}
          />
        )}
        {/* O QR Code de uma fala (na tela de um celular, num convite ou num cartão), embaixo do título */}
        <QrNaCena linha={linha} fim={fimDasFalas} qrDoRoteiro={props.qr} topo={baixoDoTitulo(props.titulo, props.parte) + 40} />
        {/* Ilustração da fala (27/11/2026): o que é dito aparece na tela, na palavra exata; fora do zoom da câmera */}
        {frame < fimDasFalas &&
          linha.map((l, n) =>
            l.cena.ilustra?.length ? (
              <CamadaDaFala
                key={`ilustra-${n}`}
                ilustra={l.cena.ilustra}
                palavras={l.cena.narracao ? palavrasDaNarracao(l.cena.narracao.legendas, l.inicio) : palavrasEstimadas(l.cena.fala, l.inicio)}
                inicio={l.inicio}
                fim={l.inicio + quadrosDaFalaConversa(l.cena) + CONVERSA.entreFalas}
                estilo={{ modelo: props.estilo?.modelo, fundo }}
                faixas={{ topo: { y0: 330, y1: fimDoTopoNaFala(n) } }}
                // O balão do começo (CTA) fica embaixo do título até o quadro ~125: a fala que começa antes desce
                // A coluna do título também leva a hora e a notificação da fala (28/11/2026: o número cobria a notificação)
                topo={
                  baixoDoTitulo(props.titulo, props.parte) +
                  30 +
                  (props.ctaInicial && l.inicio < 125 ? 115 : 0) +
                  (l.cena.hora ? 95 : 0) +
                  (l.cena.notificacao ? 145 : 0)
                }
                personagens={Object.fromEntries(elenco.map((p, i) => [p.id, { x: aqui(i).left + 270, y: 860 - subirNoCartao }]))}
                // A faixa de baixo é o corpo de quem está de pé e encosta na legenda: o "baixo" sobe para o alto
                semBaixo
              />
            ) : null,
          )}
        {props.legendas && (
          <Sequence durationInFrames={props.ctaFinal ? fimDasFalas : undefined} layout="none" name="Legendas">
            {/* Na área segura (23/11/2026): abaixo de ~1530 px a descrição e os botões do TikTok,
                do Reels e do Shorts cobrem a legenda; ela sobe para a altura das pernas, numa caixa
                clara para ler em cima dos personagens */}
            {/* emendarMs: entre uma fala e a outra a legenda não some (sumia ~0,5 s na troca: crítica, 26/11/2026) */}
            {/* A do narrador: 20% maior, numa faixa mais larga e um pouco mais alta (a caixa
                maior termina no mesmo lugar, acima dos botões do app) */}
            {narradorAgora ? (
              <Legendas
                legendas={legendas}
                noite={escuro}
                caixa={!escuro}
                tamanho={Math.round(estilo.legenda * 1.2)}
                largura={980}
                emendarMs={1500}
                style={{ top: 1385 - Math.round(estilo.legenda * 0.35), padding: "0 50px" }}
              />
            ) : (
              <Legendas legendas={legendas} noite={escuro} caixa={!escuro} tamanho={estilo.legenda} largura={940} emendarMs={1500} style={{ top: 1420, padding: "0 70px" }} />
            )}
          </Sequence>
        )}
        {linha.map(({ cena, inicio }, i) => (
          <React.Fragment key={i}>
            {cena.narracao && (
              <Sequence from={inicio} layout="none" name={`Fala ${i + 1}`}>
                {/* Entra e sai suave (2 e 4 quadros): a fala terminava num corte seco e a do
                    outro parecia cortar a anterior */}
                <Audio
                  src={staticFile(cena.narracao.audio)}
                  volume={(f) => {
                    const fim = Math.ceil(cena.narracao!.duracaoSeg * fps);
                    return interpolate(f, [0, 2, fim - 4, fim], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                  }}
                />
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
                const pessoa = pessoas.find((p) => p.tipo !== "criatura");
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
        {/* A trilha de fundo do canal (23/11/2026: o dono pediu uma trilha suave por baixo
            da narração; antes a Conversa só tinha os efeitos de cada cena) */}
        {props.musica && (
          <Audio
            src={staticFile(props.musica)}
            volume={(f) => (props.volumeMusica ?? 0.08) * interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" })}
            name="Trilha"
          />
        )}
        {props.ctaFinal && (
          <Sequence from={inicioDoCta} layout="none" name="CTA final">
            <CartaoDeChamada chamada={props.ctaFinal} botao={props.botaoFinal ?? textosDoIdioma(props.idioma).linkNaBio} />
            {qrDoFim && (
              <QrNoFim
                texto={qrDoFim}
                legenda={props.qr?.legenda}
                topo={baixoDoTitulo(props.titulo, props.parte) + 30}
                limite={medidaDoCartao(props.ctaFinal).topo}
                sozinho={elenco.length === 1}
              />
            )}
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
    const pose = daCapa?.pose ?? daFala.pose;
    // Sentado só com a frente do cenário cobrindo as pernas, no lugar da esquerda
    const podeSentar = Boolean(lugar.Frente) && elenco.length === 2 && elenco[0].id === quem;
    return { pose: pose === "sentado" && !podeSentar ? "celular" : pose, expressao: daCapa?.expressao ?? daFala.expressao };
  };
  return (
    <AbsoluteFill style={{ background: fundo === "noite" ? "#0A0F26" : "#FBE7DA" }}>
      <estilo.Fundo fundo={fundo} Cenario={Cenario} cenario={lugar.nome} />
      {elenco.map((p, indice) => ({ ...p, ...vestido(props, p, indice) })).map(({ id, visual, desenho, tipo, objeto }, indice) =>
        tipo === "criatura" ? (
          <Sombra
            desenho={desenho}
            key={id}
            momentos={[{ em: 0, ...estadoDe(id), pose: poseDaSombra(estadoDe(id).pose) }]}
            palavras={[]}
            altura={960}
            espelhar={lugares[indice].espelhar}
            semente={lugares[indice].semente}
            objeto={objeto}
            style={{ position: "absolute", left: lugares[indice].left - 20, top: 700, zIndex: 2 }}
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
          // Como nas cenas: de pé, na frente do móvel (atrás do sofá a pessoa ficava sem
          // pernas na capa, só os pés aparecendo: anotação de 25/11/2026); sentado, atrás dele
          style={{ position: "absolute", left: lugares[indice].left - 20, top: 700, zIndex: estadoDe(id).pose === "sentado" ? 0 : 2 }}
        />
        ),
      )}
      {Frente && (
        <AbsoluteFill style={{ zIndex: 1 }}>
          <CamadaDaFrente fundo={fundo}>
            <Frente />
          </CamadaDaFrente>
        </AbsoluteFill>
      )}
      {/* A etiqueta da parte fica em cima do título: embaixo, cobria a cena */}
      <div style={{ position: "absolute", top: props.parte ? 180 : 270, left: 60, right: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, zIndex: 3 }}>
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
            <Sombra desenho={p.desenho} momentos={[{ em: 0, pose: poseDaSombra(s.pose), expressao: s.expressao }]} palavras={s.falando ? [{ inicio: 0, fim: 999 }] : []} altura={820} objeto={p.objeto} />
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
