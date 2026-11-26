import { Audio, Video } from "@remotion/media";
import { textosDoIdioma } from "../nucleo/textosFixos";
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Loop, Sequence, Series, staticFile, useCurrentFrame } from "remotion";
import { z } from "zod";
import { arquivo } from "../componentes/base";
import { aparenciaDo, estiloDoNarradoSchema, type Aparencia } from "../estilos/narrado";
import { Legendas } from "../componentes/texto/Legendas";
import { suave } from "../nucleo/animacao";
import { cores, fontes } from "../nucleo/marca";
import { duracaoDoMolde, QUADROS_DO_ENCERRAMENTO, quadrosDaFala, TEMPOS } from "./tempos";
import { CapituloDeColagem, EtiquetaDeColagem, Giz, MapaAnimado, Recorte, type RecorteDeBaixo } from "./documentario/apresentacoes";
import { useConferirTexto } from "../componentes/conferir";
import { QuadroDeEvidencias } from "./documentario/evidencias/Quadro";
import { SILHUETAS } from "./documentario/evidencias/cinemaMudo";
import { loadFont as carregarBebas } from "@remotion/google-fonts/BebasNeue";

// Vídeo longo e deitado (1920×1080) para canal narrado no YouTube: uma voz lê a
// "fala" de cada cena por cima de uma foto em tela cheia que se move devagar
// (zoom e deslize). Uma cena pode abrir um capítulo (cartão com o título) e
// mostrar um texto curto na tela (data, lugar, número). Cada cena dura o tempo
// da fala; a voz vem do `npm run narrar`, as fotos do `npm run buscar-fotos`.

const narracaoSchema = z
  .object({
    audio: z.string(),
    duracaoSeg: z.number(),
    legendas: z.array(z.object({ texto: z.string(), inicioMs: z.number(), fimMs: z.number(), fimDeFrase: z.boolean().optional() })),
    chave: z.string().optional(),
  })
  .passthrough()
  .describe("Preenchido pelo npm run narrar (não editar à mão)");

export const MOVIMENTOS = ["aproximar", "esquerda", "afastar", "direita", "subir", "diagonal", "descer"] as const;
export const FOCOS = ["topo", "base", "esquerda", "direita", "centro"] as const;
type Foco = [number, number] | (typeof FOCOS)[number];

/** O foco da cena em % da imagem ([x, y]); sem foco, o meio */
export function pontoDoFoco(foco?: Foco): [number, number] {
  if (Array.isArray(foco)) return foco;
  switch (foco) {
    case "topo":
      return [50, 25];
    case "base":
      return [50, 75];
    case "esquerda":
      return [25, 50];
    case "direita":
      return [75, 50];
    default:
      return [50, 50];
  }
}

export const documentarioSchema = z.object({
  cenas: z
    .array(
      z.object({
        fala: z.string().describe("O que a voz diz nesta cena: 2 a 4 frases (uns 10 a 20 s)"),
        foto: z.string().optional().describe("Foto deitada em public/ (fotos/<peça>/<nome>.jpg)"),
        video: z
          .string()
          .optional()
          .describe("Vídeo de fundo deitado em public/ (videos/<peça>/<nome>.mp4), mudo e repetido, no lugar da foto: para paisagem, céu, deserto, mar"),
        capitulo: z.string().optional().describe("Abre um capítulo: o título aparece num cartão no começo da cena"),
        texto: z.string().optional().describe("Texto curto na tela (data, lugar, número): até 40 caracteres"),
        movimento: z
          .enum(MOVIMENTOS)
          .optional()
          .describe("Como a foto se move: aproximar, afastar, esquerda, direita, subir, descer ou diagonal (padrão: alterna sozinho)"),
        inteira: z.boolean().optional().describe("Mostra a imagem inteira, sem cortar (retrato em pé, mapa), sobre ela mesma desfocada"),
        foco: z
          .union([z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]), z.enum(FOCOS)])
          .optional()
          .describe(
            'Onde está o que importa na imagem (o rosto, a figura): [x, y] em % da imagem (0,0 = canto de cima à esquerda) ou "topo", "base", "esquerda", "direita", "centro". O corte e o zoom ficam em volta dele (padrão: o meio)',
          ),
        detalhe: z
          .tuple([z.number().min(0).max(100), z.number().min(0).max(100)])
          .optional()
          .describe(
            "Nos modelos Colagem e Quadro de evidências: onde está o detalhe que importa na imagem ([x, y] em %, 0,0 = canto de cima à esquerda). Na Colagem ele sai ampliado num recorte redondo, com o círculo de marca-texto e a seta; no Quadro, ganha um círculo vermelho e a câmera chega perto",
          ),
        palavra: z
          .string()
          .max(24)
          .optional()
          .describe(
            "Nos modelos Colagem e Quadro de evidências: a palavra-chave da cena (até 24 letras). Na Colagem, colada em letras recortadas de jornal; no Quadro, batida à máquina numa tira de papel e sublinhada em vermelho",
          ),
        legendaNoAlto: z
          .boolean()
          .optional()
          .describe("A legenda sobe para o alto nesta cena: quando a imagem tem texto escrito embaixo (legenda de gravura, letreiro, inscrição)"),
        rota: z
          .array(z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]))
          .min(2)
          .max(12)
          .optional()
          .describe(
            "Mapa animado: com a foto de um mapa, a rota se desenha de ponto a ponto na cor de destaque. Cada ponto em % da imagem [x, y] (0,0 = canto de cima à esquerda): olhe o mapa e marque onde fica cada lugar",
          ),
        lugares: z
          .array(z.string().max(30))
          .optional()
          .describe('O nome de cada ponto da rota, na mesma ordem ("" para não mostrar), ex.: ["Lisboa", "", "Rio de Janeiro"]'),
        // ---- Só no modelo Quadro de evidências (nos outros, não muda nada) ----
        ligar: z
          .union([z.number().int().min(1), z.array(z.number().int().min(1)).min(1).max(4)])
          .optional()
          .describe("Quadro de evidências: o número da cena anterior (ou até 4) cuja peça se liga a esta com barbante vermelho, ex.: 5 ou [3, 9]. Só quando há uma ligação de verdade (a mesma pessoa, causa e efeito)"),
        carimbo: z
          .string()
          .max(16)
          .optional()
          .describe('Quadro de evidências: carimbo vermelho batido na foto, ex.: "ULTRASSECRETO", "INVESTIGADO", "CONDENADO", "ARQUIVADO". Raro: 1 a cada 8 ou 10 cenas, só quando a fala diz isso'),
        ano: z.string().max(12).optional().describe('Quadro de evidências: o ano que vira um cartão grande ao lado da foto, ex.: "1807" ou "30 d.C."'),
        insert: z
          .enum(["mapa", "intertitulo", "acao"])
          .optional()
          .describe(
            "Quadro de evidências: a cena vira um trecho de cinema mudo (a tela fecha em íris e abre num filme sépia): mapa (com a rota da cena), intertitulo (o texto da cena numa moldura dupla) ou acao (silhuetas). Cena com rota já vira mapa sozinha. No máximo 1 a cada 8 cenas",
          ),
        silhuetas: z
          .array(z.enum(SILHUETAS))
          .min(1)
          .max(4)
          .optional()
          .describe('Quadro de evidências, insert "acao": quem atravessa a tela em silhueta: pessoa, soldado, cavalo, navio, carro ou canhao (o canhão dá um tiro: clarão e fumaça)'),
        narracao: narracaoSchema.optional(),
      }),
    )
    .min(1)
    .max(150),
  tese: z
    .string()
    .max(90)
    .optional()
    .describe("Quadro de evidências: a pergunta central do vídeo, batida à máquina num cartão no meio do quadro (os capítulos se ligam a ela)"),
  voz: z
    .string()
    .default("pm_alex")
    .describe("Id de src/componentes/personagens/vozes.ts (feminina-1..15, masculina-1..15) ou o nome do Kokoro (pf_dora, pm_alex, pm_santa)"),
  velocidade: z.number().min(0.7).max(1.4).default(1),
  pronuncia: z.record(z.string(), z.string()).optional().describe('Como a voz deve ler uma palavra: {"Tiradentes": "Tiradêntes"}'),
  legendas: z.boolean().default(true),
  musica: z
    .string()
    .optional()
    .describe("Música calma em public/, repetida baixinho por baixo da voz: musica/calma-esperanca.mp3, calma-reflexao.mp3 ou calma-drama.mp3"),
  volumeMusica: z.number().min(0).max(0.5).default(0.15),
  /** Frase do cartão final (ex.: "Inscreva-se para a parte 2"). Sem ela, o vídeo termina na última cena. */
  encerramento: z.string().optional(),
  chamadaFinal: z
    .string()
    .max(90)
    .optional()
    .describe('A chamada do canal no cartão final (a do canal-postai.md), ex.: "Está lutando? Comente que a gente ora por você". Sem ela, só o encerramento e o botão'),
  estilo: estiloDoNarradoSchema,
  idioma: z.enum(["pt", "en", "es"]).optional().describe("O idioma do vídeo (o narrar grava): o botão do fim sai nele"),
});

export type Documentario = z.infer<typeof documentarioSchema>;
type Cena = Documentario["cenas"][number];

export const documentarioExemplo: Documentario = {
  cenas: [
    {
      fala: "Em 1808, uma frota cruzou o Atlântico com a família real portuguesa inteira a bordo.",
      capitulo: "A fuga da corte",
      texto: "Lisboa, novembro de 1807",
    },
    { fala: "Eram mais de dez mil pessoas, fugindo das tropas de Napoleão.", movimento: "esquerda" },
    { fala: "E o Rio de Janeiro nunca mais seria o mesmo.", capitulo: "Uma cidade virada do avesso" },
  ],
  voz: "pm_alex",
  velocidade: 1,
  legendas: true,
  volumeMusica: 0.15,
  encerramento: "Inscreva-se para a parte 2",
};

/** Mistura de uma cena com a anterior, em quadros (no começo de capítulo: entrada do preto, mais longa) */
const MISTURA = 18;
const ENTRADA_DO_CAPITULO = 24;
/** O cartão do capítulo, em quadros, e quanto o do 1º espera depois do começo do vídeo */
const DURACAO_DO_CARTAO = 90;
const ATRASO_DO_PRIMEIRO_CAPITULO = 90;

// Movimento de câmera de cinema: começa e termina devagar
const cinema = Easing.bezier(0.45, 0, 0.55, 1);

const movimentoDa = (cena: Cena, indice: number) => cena.movimento ?? MOVIMENTOS[indice % MOVIMENTOS.length];

/** Foto em tela cheia com zoom e deslize lentos (ken burns), do começo ao fim da cena. `parada`: fica no fim do movimento (a cena anterior, na mistura) */
const FotoEmMovimento: React.FC<{
  src: string;
  duracao: number;
  movimento: (typeof MOVIMENTOS)[number];
  inteira?: boolean;
  parada?: boolean;
  /** O tratamento do modelo (filtro CSS) e quanto a câmera anda (1 = o de sempre) */
  filtro?: string;
  ritmo?: number;
  /** Onde está o que importa, em % da imagem: o corte e o zoom ficam em volta dele */
  foco?: [number, number];
}> = ({ src, duracao, movimento, inteira, parada, filtro = "none", ritmo = 1, foco = [50, 50] }) => {
  const frame = useCurrentFrame();
  const t = (parada ? 1 : interpolate(frame, [0, duracao], [0, 1], { extrapolateRight: "clamp", easing: cinema })) * ritmo;
  const escala =
    movimento === "afastar" ? 1.18 - 0.12 * t : movimento === "aproximar" ? 1.06 + 0.12 * t : movimento === "diagonal" ? 1.08 + 0.1 * t : 1.14;
  // O foco (26/11/2026: o zoom cortava os rostos de pinturas deitadas): o corte da
  // imagem (object-position) e o centro do zoom (transform-origin) ficam nele
  const [fx, fy] = [foco[0] / 100, foco[1] / 100];
  // O deslize nunca mostra a borda da imagem: com o zoom em volta de um foco perto
  // da borda, sobra menos imagem desse lado (no meio, sem foco, não muda nada)
  const folga = (f: number, d: number) => Math.min(Math.max(d, (-(1 - f) * (escala - 1) * 100) / escala), (f * (escala - 1) * 100) / escala);
  const x = folga(fx, movimento === "esquerda" ? 3 - 6 * t : movimento === "direita" ? -3 + 6 * t : movimento === "diagonal" ? -2 + 4 * t : 0);
  const y = folga(fy, movimento === "subir" ? 3 - 6 * t : movimento === "descer" ? -3 + 6 * t : movimento === "diagonal" ? 2 - 4 * t : 0);
  if (inteira) {
    // Retrato ou mapa: a imagem inteira no meio, com zoom bem leve, e ela mesma desfocada no fundo
    const leve = 1 + (escala - 1) * 0.4;
    return (
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
        <Img
          src={arquivo(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(40px) brightness(0.45) ${filtro === "none" ? "" : filtro}`, scale: "1.15" }}
        />
        <AbsoluteFill style={{ padding: "40px 0", alignItems: "center", justifyContent: "center" }}>
          <Img
            src={arquivo(src)}
            style={{ height: "100%", maxWidth: "90%", objectFit: "contain", transform: `scale(${leve})`, boxShadow: "0 30px 90px rgba(0,0,0,0.6)", filter: filtro }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={arquivo(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${foco[0]}% ${foco[1]}%`,
          transformOrigin: `${foco[0]}% ${foco[1]}%`,
          transform: `scale(${escala}) translate(${x}%, ${y}%)`,
          filter: filtro,
        }}
      />
    </AbsoluteFill>
  );
};

/** A imagem da cena do jeito do modelo: mapa com rota, recorte de papel, giz ou foto em tela cheia */
const ImagemDaCena: React.FC<{
  cena: Cena;
  indice: number;
  duracao: number;
  ap: Aparencia;
  parada?: boolean;
  /** Colagem: os recortes das cenas anteriores, que ficam por baixo do novo */
  debaixo?: RecorteDeBaixo[];
  /** Colagem: em que quadro do vídeo a cena começa */
  inicio?: number;
}> = ({ cena, indice, duracao, ap, parada, debaixo, inicio }) => {
  const foto = cena.foto as string;
  if (cena.rota)
    return (
      <MapaAnimado src={foto} duracao={duracao} rota={cena.rota} lugares={cena.lugares} filtro={ap.filtro} destaque={ap.destaque} fonte={ap.fonteTexto} parada={parada} />
    );
  if (ap.apresentacao === "recorte")
    return (
      <Recorte
        src={foto}
        duracao={duracao}
        indice={indice}
        filtro={ap.filtro}
        destaque={ap.destaque}
        ritmo={ap.ritmo}
        inteira={cena.inteira}
        parada={parada}
        detalhe={parada ? undefined : (cena.detalhe as [number, number] | undefined)}
        palavra={parada ? undefined : cena.palavra}
        fonte={ap.fonteTitulo}
        foco={cena.foco ? pontoDoFoco(cena.foco) : undefined}
        debaixo={debaixo}
        inicio={inicio}
      />
    );
  if (ap.apresentacao === "giz")
    return <Giz src={foto} duracao={duracao} indice={indice} ritmo={ap.ritmo} inteira={cena.inteira} parada={parada} foco={cena.foco ? pontoDoFoco(cena.foco) : undefined} />;
  return (
    <FotoEmMovimento
      src={foto}
      duracao={duracao}
      movimento={movimentoDa(cena, indice)}
      inteira={cena.inteira}
      parada={parada}
      filtro={ap.filtro}
      ritmo={ap.ritmo}
      foco={pontoDoFoco(cena.foco)}
    />
  );
};

/** Sem foto: fundo escuro na cor de destaque, com um brilho suave */
const FundoSemFoto: React.FC<{ destaque?: string; fundo?: string }> = ({ destaque = cores.destaque, fundo = "#0d0b10" }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 40%, ${destaque}55 0%, ${fundo} 65%)` }} />
);

/** Mistério: o texto treme de leve, como projeção antiga */
const tremorDo = (frame: number, ligado: boolean) => (ligado ? `${Math.sin(frame * 1.7) * 1.5}px ${Math.cos(frame * 2.3) * 1.2}px` : "0 0");

const Capitulo: React.FC<{ titulo: string; ap: Aparencia }> = ({ titulo, ap }) => {
  const frame = useCurrentFrame();
  const opacidade = interpolate(frame, [0, 12, 70, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const linha = interpolate(frame, [6, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  return (
    <AbsoluteFill
      style={{
        // Véu escuro mais forte no meio: o título lê bem até em cima de imagem clara
        background: "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(8,7,10,0.84) 0%, rgba(8,7,10,0.58) 100%)",
        alignItems: "center",
        justifyContent: "center",
        opacity: opacidade,
      }}
    >
      {/* O título numa placa escura própria (23/11/2026): o véu sozinho não bastava em
          gravura clara e ficava em cima da figura da cena; a placa garante a leitura */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "rgba(8,7,10,0.78)",
          borderRadius: 28,
          padding: "44px 72px 52px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          maxWidth: 1600,
        }}
      >
        <div style={{ width: 180 * linha, height: 6, borderRadius: 3, backgroundColor: ap.destaque, marginBottom: 34 }} />
        <div
          style={{
            fontFamily: ap.fonteTitulo,
            fontWeight: ap.pesoTitulo,
            fontSize: 92,
            lineHeight: 1.1,
            color: ap.textoClaro,
            textAlign: "center",
            textShadow: "0 4px 24px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.9)",
            translate: tremorDo(frame, ap.tremor),
          }}
        >
          {titulo}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Texto curto no canto de baixo à esquerda (data, lugar), como numa reportagem */
const TextoNaTela: React.FC<{ texto: string; inicio: number; ap: Aparencia }> = ({ texto, inicio, ap }) => {
  const frame = useCurrentFrame();
  const entrada = interpolate(frame - inicio, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: suave });
  const medida = useConferirTexto<HTMLDivElement>("texto-na-tela");
  return (
    <div
      ref={medida}
      style={{
        position: "absolute",
        left: 90,
        top: 90,
        opacity: entrada,
        translate: `${-30 * (1 - entrada)}px 0`,
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <div style={{ width: 8, height: 54, borderRadius: 4, backgroundColor: ap.destaque }} />
      <div
        style={{
          fontFamily: ap.fonteTexto,
          fontWeight: Math.min(700, ap.pesoTitulo),
          fontSize: 46,
          color: ap.textoClaro,
          translate: tremorDo(frame, ap.tremor),
          backgroundColor: "rgba(8,7,10,0.6)",
          padding: "8px 22px",
          borderRadius: 12,
        }}
      >
        {texto}
      </div>
    </div>
  );
};

/**
 * A cena com a imagem que ela mostra: a própria ou, sem foto nem vídeo (o acervo
 * bloqueou, não achou), a da última cena que tinha. A imagem fica mais tempo na
 * tela, com outro movimento, e o vídeo não para por falta de foto (pedido do
 * dono em 21/11/2026). O mapa animado (rota) é só da própria cena.
 */
function comImagem(cenas: Cena[], indice: number): Cena {
  const cena = cenas[indice];
  if (cena.foto || cena.video) return cena;
  for (let j = indice - 1; j >= 0; j--) {
    const antes = cenas[j];
    if (antes.foto || antes.video) return { ...cena, foto: antes.foto, video: antes.video, inteira: antes.inteira, foco: cena.foco ?? antes.foco };
  }
  return cena;
}

/**
 * Colagem: as imagens das duas cenas anteriores ([duas atrás, a anterior]), que
 * ficam por baixo do recorte novo (ele é colado por cima, sem misturar as fotos;
 * também no começo de capítulo). Sem elas (cena de vídeo ou de mapa de um dos
 * lados), a cena entra do jeito de sempre, misturando.
 */
function recortesDeBaixo(cenas: Cena[], indice: number): RecorteDeBaixo[] | undefined {
  const daCena = (j: number): RecorteDeBaixo | undefined => {
    if (j < 0) return undefined;
    const c = comImagem(cenas, j);
    if (!c.foto || c.video || c.rota) return undefined;
    return { src: c.foto, indice: j, inteira: c.inteira, foco: c.detalhe || !c.foco ? undefined : pontoDoFoco(c.foco) };
  };
  const cena = comImagem(cenas, indice);
  const anterior = daCena(indice - 1);
  if (!cena.foto || cena.video || cena.rota || !anterior) return undefined;
  const duasAtras = daCena(indice - 2);
  return duasAtras ? [duasAtras, anterior] : [anterior];
}

/** A voz da cena e a legenda por cima (no Quadro de evidências, é tudo que a cena desenha: o resto é o quadro) */
const FalaDoQuadro: React.FC<{ cena: Cena; props: Documentario; ap: Aparencia }> = ({ cena, props, ap }) =>
  cena.narracao ? (
    <>
      <Sequence from={TEMPOS.antesDaFala} layout="none" name="Narração">
        <Audio src={staticFile(cena.narracao.audio)} />
      </Sequence>
      {props.legendas && (
        <AbsoluteFill>
          <Legendas
            legendas={cena.narracao.legendas}
            atraso={TEMPOS.antesDaFala}
            tamanho={ap.legenda.tamanho}
            caixa={false}
            noite
            largura={1400}
            fonte={ap.fonteTexto}
            peso={400}
            // Preto e branco: a palavra falada em branco, as outras em cinza claro
            destaque="#ffffff"
            corDoTexto="#b8b2a7"
            style={{ top: cena.legendaNoAlto ? 110 : 920, padding: "0 260px" }}
          />
        </AbsoluteFill>
      )}
    </>
  ) : null;

const CenaDoDocumentario: React.FC<{ cena: Cena; indice: number; props: Documentario; ap: Aparencia; inicio?: number }> = ({ indice, props, ap, inicio }) => {
  const frame = useCurrentFrame();
  if (ap.apresentacao === "quadro") return <FalaDoQuadro cena={props.cenas[indice]} props={props} ap={ap} />;
  const cena = comImagem(props.cenas, indice);
  const duracao = quadrosDaFala(cena);
  const colagem = ap.apresentacao === "recorte";
  const debaixo = colagem ? recortesDeBaixo(props.cenas, indice) : undefined;
  // Dentro do capítulo, a foto nova se mistura com a anterior; no começo de capítulo, entra do preto
  const antes = indice > 0 && !cena.capitulo ? comImagem(props.cenas, indice - 1) : undefined;
  // A mesma imagem (cena sem foto que continua a anterior): troca direto. Misturar
  // a mesma foto em duas posições dava uma dupla exposição desalinhada (23/11/2026)
  const mesmaImagem = Boolean(antes?.foto && antes.foto === cena.foto && !cena.video && !antes.video);
  const anterior = mesmaImagem ? undefined : antes;
  // Com vídeo de um lado, a mistura é curta: o recorte da foto aparecia por trás do vídeo
  const comVideo = Boolean(cena.video || antes?.video);
  const entrada = mesmaImagem
    ? 0
    : anterior?.foto
      ? comVideo
        ? MISTURA
        : Math.max(MISTURA, ap.mistura)
      : Math.max(ENTRADA_DO_CAPITULO, ap.mistura);
  // A primeira cena já começa com a imagem (23/11/2026: o quadro 0 saía preto e a
  // miniatura tirada do começo ficava escura)
  // Na Colagem o recorte novo é colado por cima do anterior: nada de misturar
  const fade = indice === 0 || entrada === 0 || debaixo ? 1 : interpolate(frame, [0, entrada], [0, 1], { extrapolateRight: "clamp", easing: cinema });
  // O cartão do 1º capítulo não abre o vídeo (26/11/2026): os primeiros segundos são
  // a imagem e a pergunta do gancho, e o cartão entra uns 3 s depois. Só o desenho
  // atrasa: o capítulo continua começando no 00:00 da descrição do YouTube
  const inicioDoCartao = indice === 0 ? Math.min(ATRASO_DO_PRIMEIRO_CAPITULO, Math.max(0, duracao - DURACAO_DO_CARTAO)) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {anterior?.foto && frame < entrada && !debaixo && (
        <ImagemDaCena cena={anterior} indice={indice - 1} duracao={quadrosDaFala(anterior)} ap={ap} parada />
      )}
      <AbsoluteFill style={{ opacity: fade }}>
        {cena.video ? (
          <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
            <Video src={arquivo(cena.video)} muted loop objectFit="cover" style={{ width: "100%", height: "100%", filter: ap.filtro }} />
          </AbsoluteFill>
        ) : cena.foto ? (
          <ImagemDaCena cena={cena} indice={indice} duracao={duracao} ap={ap} debaixo={debaixo} inicio={inicio} />
        ) : (
          <FundoSemFoto destaque={ap.destaque} fundo={ap.fundo} />
        )}
        {/* As texturas do modelo (papel velho, grão, vinheta) */}
        <ap.Camadas />
        {/* Escurece as bordas e o pé, para a legenda e o texto lerem bem */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)" }} />
      </AbsoluteFill>
      {cena.texto &&
        (colagem ? (
          // Do lado oposto ao da palavra recortada (a palavra fica no alto, do lado da cena)
          <EtiquetaDeColagem
            texto={cena.texto}
            inicio={cena.capitulo ? inicioDoCartao + 80 : 10}
            fim={duracao}
            fonte={ap.fonteTexto}
            cor={ap.destaque}
            direita={Boolean(cena.palavra) && indice % 2 === 0}
          />
        ) : (
          <TextoNaTela texto={cena.texto} inicio={cena.capitulo ? inicioDoCartao + 80 : 10} ap={ap} />
        ))}
      {cena.capitulo && (
        <Sequence from={inicioDoCartao} durationInFrames={DURACAO_DO_CARTAO} layout="none" name="Capítulo">
          {colagem ? (
            <CapituloDeColagem titulo={cena.capitulo} fonte={ap.fonteTitulo} peso={ap.pesoTitulo} cor={ap.destaque} textoClaro={ap.textoClaro} />
          ) : (
            <Capitulo titulo={cena.capitulo} ap={ap} />
          )}
        </Sequence>
      )}
      {cena.narracao && (
        <>
          <Sequence from={TEMPOS.antesDaFala} layout="none" name="Narração">
            <Audio src={staticFile(cena.narracao.audio)} />
          </Sequence>
          {props.legendas && (
            // A legenda fica por cima do cartão do capítulo, inteira (26/11/2026: ela
            // esperava o cartão sair e ficava escurecida por baixo dele de 1 a 3 s). O
            // cartão fica no meio da tela e a legenda embaixo (ou no alto): não se cruzam
            <AbsoluteFill>
            <Legendas
              legendas={cena.narracao.legendas}
              atraso={TEMPOS.antesDaFala}
              tamanho={ap.legenda.tamanho}
              // Em cima do mapa (claro) a legenda precisa da caixa para ler
              caixa={cena.rota ? true : ap.legenda.caixa}
              noite={cena.rota ? false : ap.legenda.noite}
              largura={1400}
              {...(ap.modelo === "classico"
                ? // O Clássico mantém a letra de sempre, mas a palavra falada usa a cor que o dono escolheu
                  { destaque: ap.destaque, textoNoDestaque: ap.textoNoDestaque }
                : { fonte: ap.fonteTexto, peso: Math.max(500, Math.min(800, ap.pesoTitulo)), destaque: ap.destaque, textoNoDestaque: ap.textoNoDestaque })}
              // No alto quando a imagem tem texto escrito embaixo (a legenda caía em cima dele)
              style={{ top: cena.legendaNoAlto ? 110 : 920, padding: "0 260px" }}
            />
            </AbsoluteFill>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};

// "Inscreva-se" quebrava no hífen ("Inscreva- / se!"): o hífen que não quebra linha
const semQuebrarNoHifen = (texto: string) => texto.replace(/-/g, "\u2011");

const Encerramento: React.FC<{ texto: string; chamada?: string; ap: Aparencia; foto?: string; idioma?: string }> = ({
  texto,
  chamada,
  ap,
  foto,
  idioma,
}) => {
  const frame = useCurrentFrame();
  const entrada = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: suave });
  return (
    <AbsoluteFill style={{ backgroundColor: ap.fundo, alignItems: "center", justifyContent: "center", gap: 40 }}>
      {/* A última imagem do vídeo, desfocada e escura, por trás da chamada (antes era só a cor) */}
      {foto && (
        <Img
          src={arquivo(foto)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(16px) brightness(0.42)", scale: String(1.12 + 0.04 * entrada) }}
        />
      )}
      <ap.Camadas />
      {/* position: relative: por cima da imagem do fundo (que é absoluta) */}
      <div style={{ position: "relative", fontFamily: ap.fonteTitulo, fontWeight: ap.pesoTitulo, fontSize: 84, color: ap.textoClaro, opacity: entrada, textAlign: "center", maxWidth: 1500, textShadow: "0 4px 24px rgba(0,0,0,0.7)" }}>
        {semQuebrarNoHifen(texto)}
      </div>
      {/* A chamada do canal (ex.: "Comente que a gente ora por você"): antes o fim só tinha o encerramento */}
      {chamada && (
        <div
          style={{
            position: "relative",
            fontFamily: ap.fonteTexto,
            fontWeight: 600,
            fontSize: 50,
            lineHeight: 1.25,
            color: ap.textoClaro,
            opacity: interpolate(frame, [12, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            textAlign: "center",
            maxWidth: 1300,
            textShadow: "0 3px 18px rgba(0,0,0,0.75)",
          }}
        >
          {semQuebrarNoHifen(chamada)}
        </div>
      )}
      <div
        style={{
          position: "relative",
          whiteSpace: "nowrap",
          fontFamily: ap.fonteTitulo,
          fontWeight: ap.pesoTitulo,
          fontSize: 44,
          color: ap.textoNoDestaque,
          backgroundColor: ap.destaque,
          padding: "16px 44px",
          borderRadius: 999,
          opacity: entrada,
          scale: String(0.9 + 0.1 * entrada),
        }}
      >
        {semQuebrarNoHifen(textosDoIdioma(idioma).inscrevase)}
      </div>
    </AbsoluteFill>
  );
};

export const Documentario: React.FC<Documentario> = (props) => {
  const total = duracaoDoMolde("Documentario", props);
  const ap = aparenciaDo(props.estilo);
  // Em que quadro cada cena começa (a mesa da Colagem anda com o vídeo inteiro)
  const inicios = props.cenas.reduce<number[]>((lista, cena, i) => [...lista, i === 0 ? 0 : lista[i - 1] + quadrosDaFala(props.cenas[i - 1])], []);
  const quadro = ap.apresentacao === "quadro";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Quadro de evidências: um quadro só, com a câmera andando o vídeo inteiro (o fim também) */}
      {quadro && <QuadroDeEvidencias cenas={props.cenas} tese={props.tese} encerramento={props.encerramento} chamada={props.chamadaFinal} idioma={props.idioma} ap={ap} />}
      <Series>
        {props.cenas.map((cena, i) => (
          <Series.Sequence key={i} durationInFrames={quadrosDaFala(cena)}>
            <CenaDoDocumentario cena={cena} indice={i} props={props} ap={ap} inicio={inicios[i]} />
          </Series.Sequence>
        ))}
        {props.encerramento && (
          <Series.Sequence durationInFrames={QUADROS_DO_ENCERRAMENTO}>
            {quadro ? null : <Encerramento texto={props.encerramento} chamada={props.chamadaFinal} ap={ap} idioma={props.idioma} foto={[...props.cenas].reverse().find((c) => c.foto)?.foto} />}
          </Series.Sequence>
        )}
      </Series>
      {props.musica && (
        <Sequence durationInFrames={total} layout="none">
          <MusicaEmLoop src={props.musica} volume={props.volumeMusica} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};

/** Música repetida durante o vídeo todo, baixinha, com fade a cada volta */
const MusicaEmLoop: React.FC<{ src: string; volume: number }> = ({ src, volume }) => {
  // Trecho de 2 min que se repete (a maioria das trilhas tem isso ou mais)
  const trecho = 120 * 30;
  return (
    <Loop durationInFrames={trecho} name="Música">
      <Audio
        src={arquivo(src)}
        volume={(f) => volume * interpolate(f, [0, 30, trecho - 30, trecho], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </Loop>
  );
};

// ---- Capa do YouTube (1280×720) ----

/** Os modelos de capa do vídeo longo (Configurar > Capa dos vídeos escolhe quais a equipe usa) */
export const MODELOS_DE_CAPA = ["classico", "circulo", "seta", "zoom", "dois-lados", "selo", "cinema"] as const;
const VERMELHO = "#FF2B2B";

/**
 * O que a capa marca por cima da foto: o círculo desenhado à mão, a seta, a lupa
 * com o detalhe ampliado ou o carimbo. Medidas em % da capa (1280x720).
 */
const MarcasDaCapa: React.FC<{ capa: CapaDocumentario; fotoSrc: string | null; naDireita: boolean; filtroDaFoto: string }> = ({
  capa,
  fotoSrc,
  naDireita,
  filtroDaFoto,
}) => {
  const { modelo = "classico" } = capa;
  // O selo sem marca vai no lado oposto ao título, embaixo (antes ele sumia sem aviso)
  const marca = capa.marca ?? (modelo === "selo" ? { x: naDireita ? 28 : 72, y: 66 } : undefined);
  if (!marca || modelo === "classico" || modelo === "dois-lados") return null;
  const W = 1280;
  const H = 720;
  const cx = (marca.x / 100) * W;
  const cy = (marca.y / 100) * H;
  const r = ((marca.raio ?? 12) / 100) * H;
  if (modelo === "circulo")
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {/* Dois traços levemente tortos: parece desenhado à mão */}
        <ellipse cx={cx} cy={cy} rx={r * 1.18} ry={r} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={22} transform={`rotate(-8 ${cx} ${cy})`} />
        <ellipse cx={cx} cy={cy} rx={r * 1.18} ry={r} fill="none" stroke={VERMELHO} strokeWidth={13} transform={`rotate(-8 ${cx} ${cy})`} />
        <ellipse cx={cx + 4} cy={cy - 3} rx={r * 1.24} ry={r * 1.05} fill="none" stroke={VERMELHO} strokeWidth={6} strokeOpacity={0.85} transform={`rotate(-4 ${cx} ${cy})`} />
      </svg>
    );
  if (modelo === "seta") {
    // Seta curta e grossa (como nas capas dos canais grandes): sai de perto do
    // detalhe, do lado que tem mais espaço (rumo ao meio da capa), e aponta o
    // círculo. Nunca atravessa a capa nem passa por trás do título.
    const raio = r * 1.12;
    // Direção: do detalhe para o meio da capa, puxada para baixo (abaixo do título)
    let dx = W / 2 - cx;
    let dy = H * 0.62 - cy;
    const tam = Math.hypot(dx, dy) || 1;
    dx /= tam;
    dy /= tam;
    const comprimento = Math.min(260, Math.max(170, r * 2.4));
    // A ponta encosta no círculo; o começo fica a "comprimento" dela, dentro da capa
    const ex = cx + dx * (raio + 8);
    const ey = cy + dy * (raio + 8);
    const sx = Math.min(W - 40, Math.max(40, ex + dx * comprimento));
    const sy = Math.min(H - 40, Math.max(40, ey + dy * comprimento));
    // Uma curva leve (o controle sai para o lado)
    const mx = (sx + ex) / 2 - dy * 40;
    const my = (sy + ey) / 2 + dx * 40;
    const ang = Math.atan2(ey - my, ex - mx);
    const cabeca = 62;
    const a1 = ang + Math.PI * 0.78;
    const a2 = ang - Math.PI * 0.78;
    const ponta = `${ex},${ey} ${ex + Math.cos(a1) * cabeca},${ey + Math.sin(a1) * cabeca} ${ex + Math.cos(a2) * cabeca},${ey + Math.sin(a2) * cabeca}`;
    const corpo = `M${sx},${sy} Q${mx},${my} ${ex - Math.cos(ang) * cabeca * 0.6},${ey - Math.sin(ang) * cabeca * 0.6}`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <circle cx={cx} cy={cy} r={raio} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={18} />
        <circle cx={cx} cy={cy} r={raio} fill="none" stroke={VERMELHO} strokeWidth={11} />
        <path d={corpo} fill="none" stroke="#FFF" strokeWidth={44} strokeLinecap="round" />
        <polygon points={ponta} fill="#FFF" stroke="#FFF" strokeWidth={16} strokeLinejoin="round" />
        <path d={corpo} fill="none" stroke={VERMELHO} strokeWidth={28} strokeLinecap="round" />
        <polygon points={ponta} fill={VERMELHO} />
      </svg>
    );
  }
  if (modelo === "zoom" && fotoSrc) {
    // A lupa no canto oposto ao título, embaixo: a MESMA foto com o mesmo corte da
    // capa (cover, 50% 22%, scale 1.06), ampliada 2,6x em volta da marca. Antes era
    // uma imagem de fundo esticada para 16:9, que mostrava outro pedaço da foto
    const lr = 190;
    const borda = 10;
    const lx = naDireita ? 60 + lr : W - 60 - lr;
    const ly = H - 40 - lr;
    const aumento = 2.6;
    const centro = lr - borda;
    return (
      <>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <circle cx={cx} cy={cy} r={r * 0.75} fill="none" stroke={VERMELHO} strokeWidth={8} />
          <line x1={cx} y1={cy} x2={lx} y2={ly} stroke={VERMELHO} strokeWidth={8} />
        </svg>
        <div
          style={{
            position: "absolute",
            left: lx - lr,
            top: ly - lr,
            width: lr * 2,
            height: lr * 2,
            boxSizing: "border-box",
            borderRadius: "50%",
            border: `${borda}px solid ${VERMELHO}`,
            boxShadow: "0 0 0 6px #FFF, 0 18px 40px rgba(0,0,0,0.6)",
            overflow: "hidden",
            backgroundColor: "#0d0b10",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: W,
              height: H,
              transformOrigin: "0 0",
              transform: `translate(${centro - cx * aumento}px, ${centro - cy * aumento}px) scale(${aumento})`,
            }}
          >
            <Img
              src={fotoSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 22%", filter: filtroDaFoto, transform: "scale(1.06)" }}
            />
          </div>
        </div>
      </>
    );
  }
  if (modelo === "selo" && capa.selo)
    return (
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          transform: "translate(-50%, -50%) rotate(-12deg)",
          padding: "10px 28px",
          border: `9px solid ${VERMELHO}`,
          borderRadius: 14,
          color: VERMELHO,
          fontFamily: fontes.titulo,
          fontWeight: 900,
          fontSize: 92,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          background: "rgba(255,255,255,0.08)",
          textShadow: "0 0 18px rgba(0,0,0,0.5)",
          boxShadow: "0 0 30px rgba(0,0,0,0.45)",
          whiteSpace: "nowrap",
        }}
      >
        {capa.selo}
      </div>
    );
  return null;
};

/** Dois lados: a foto e a foto2 lado a lado, cortadas na diagonal, com o VS no meio */
const DoisLados: React.FC<{ foto: string; foto2: string; rotulos?: [string, string]; filtro: string }> = ({ foto, foto2, rotulos, filtro }) => (
  <AbsoluteFill>
    <Img src={arquivo(foto)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: filtro, clipPath: "polygon(0 0, 56% 0, 44% 100%, 0 100%)" }} />
    <Img src={arquivo(foto2)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: filtro, clipPath: "polygon(56% 0, 100% 0, 100% 100%, 44% 100%)" }} />
    <svg viewBox="0 0 1280 720" width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
      <line x1={717} y1={0} x2={563} y2={720} stroke="#FFF" strokeWidth={14} />
      <circle cx={640} cy={430} r={70} fill={VERMELHO} stroke="#FFF" strokeWidth={8} />
      <text x={640} y={455} textAnchor="middle" fontFamily={fontes.titulo} fontWeight={900} fontSize={68} fill="#FFF">
        VS
      </text>
    </svg>
    {rotulos?.map((rotulo, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          // Acima do canto de baixo à direita: lá o YouTube põe a duração do vídeo
          bottom: 130,
          [i === 0 ? "left" : "right"]: 48,
          background: i === 0 ? "#000" : VERMELHO,
          color: "#FFF",
          fontFamily: fontes.titulo,
          fontWeight: 900,
          fontSize: 54,
          padding: "6px 22px",
          borderRadius: 10,
        }}
      >
        {rotulo.toUpperCase()}
      </div>
    ))}
  </AbsoluteFill>
);

export const capaDocumentarioSchema = z.object({
  titulo: z.string().describe("Até 4 palavras, que dão curiosidade sem repetir o título do vídeo (ex.: SÓ UMA PEDRA)"),
  destaque: z.string().optional().describe("A palavra do título que sai em amarelo"),
  foto: z.string().optional(),
  lado: z
    .enum(["esquerda", "direita"])
    .optional()
    .describe("De que lado fica o texto: o oposto ao rosto ou à figura principal da foto (padrão: esquerda)"),
  modelo: z
    .enum(MODELOS_DE_CAPA)
    .optional()
    .describe(
      'O modelo da capa: classico (só o título), circulo (círculo vermelho no detalhe), seta (seta do título até o detalhe), zoom (lupa com o detalhe ampliado), dois-lados (foto e foto2 lado a lado, com VS) ou selo (carimbo inclinado, ex.: PROIBIDO)',
    ),
  marca: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      raio: z.number().min(3).max(40).optional(),
    })
    .optional()
    .describe("O detalhe que a capa marca (circulo, seta, zoom, selo): a posição em % da CAPA (0,0 = canto de cima à esquerda), olhando a capa.jpg; raio em % da altura (padrão 12)"),
  foto2: z.string().optional().describe("dois-lados: a segunda foto (a da direita)"),
  rotulos: z.tuple([z.string().max(14), z.string().max(14)]).optional().describe('dois-lados: o rótulo de cada foto, ex.: ["1957", "HOJE"]'),
  selo: z.string().max(14).optional().describe('selo: o texto do carimbo, ex.: "PROIBIDO", "SEGREDO", "REAL"'),
  estilo: estiloDoNarradoSchema,
});
export type CapaDocumentario = z.infer<typeof capaDocumentarioSchema>;

export const capaDocumentarioExemplo: CapaDocumentario = {
  titulo: "A noite em que o Brasil virou capital de Portugal",
  destaque: "capital",
};

/** Título grande à esquerda, foto em tela cheia por trás: legível até pequeno no celular */
// Capa do YouTube que chama o clique (o que a crítica pedia): a figura grande e
// com contraste, as bordas escurecidas, no máximo 4 palavras grossas em
// maiúsculas com contorno preto (amarelo no destaque), do lado oposto à figura
// e nunca no canto de baixo à direita, onde o YouTube põe a duração do vídeo.
/**
 * Capa "cinema" (teste de 23/11/2026, ideia do dono): a foto de cinema (o
 * personagem em close, com emoção) e o título de filme, dourado com brilho e
 * contorno, do lado oposto ao rosto.
 */
const { fontFamily: letraDeCinema } = carregarBebas();
const CapaDeCinema: React.FC<CapaDocumentario> = ({ titulo, destaque, foto, lado = "esquerda" }) => {
  const palavras = titulo.toUpperCase().split(/\s+/).filter(Boolean);
  const alvo = destaque?.toUpperCase().split(/\s+/) ?? [];
  const limpa = (p: string) => p.replace(/[^\p{L}\p{N}]/gu, "");
  const naDireita = lado === "direita";
  // Linhas de até ~11 letras; a palavra de destaque fica maior, e as palavras
  // curtas antes dela (de, da, o) vão na mesma linha ("DE FOGO")
  const ehForte = (p: string) => alvo.includes(limpa(p));
  const linhas: string[][] = [];
  for (const p of palavras) {
    const ultima = linhas[linhas.length - 1];
    const soCurtas = ultima?.every((x) => x.length <= 3 && !ehForte(x));
    if (ultima && ehForte(p) && soCurtas) ultima.push(p);
    else if (!ultima || ultima.join(" ").length + p.length > 13 || ehForte(p) !== ultima.some(ehForte)) linhas.push([p]);
    else ultima.push(p);
  }
  // Curtas que sobraram no fim de uma linha descem para a do destaque
  for (let i = 0; i < linhas.length - 1; i++) {
    const proxima = linhas[i + 1];
    const ultima = linhas[i][linhas[i].length - 1];
    if (linhas[i].length > 1 && proxima.some(ehForte) && ultima.length <= 3) proxima.unshift(linhas[i].pop() as string);
  }
  const dourado = {
    background: "linear-gradient(180deg, #FFF6C9 0%, #FFD772 35%, #E9A93A 62%, #A8661A 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextStroke: "3px #2B1704",
    paintOrder: "stroke fill",
  } as const;
  return (
    <AbsoluteFill style={{ backgroundColor: "#07060a" }}>
      {foto && (
        <Img
          src={arquivo(foto)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%", filter: "contrast(1.12) saturate(1.1)" }}
        />
      )}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)" }} />
      <AbsoluteFill
        style={{
          background: `linear-gradient(${naDireita ? 270 : 90}deg, rgba(5,4,8,0.88) 0%, rgba(5,4,8,0.6) 34%, rgba(5,4,8,0) 58%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [naDireita ? "right" : "left"]: 50,
          width: 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          fontFamily: letraDeCinema,
          // 1.04 (era 0.92): o acento da linha grande (LÓ, É) encostava na linha de cima
          lineHeight: 1.04,
          filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.85)) drop-shadow(0 0 22px rgba(255,186,73,0.35))",
        }}
      >
        {linhas.map((linha, i) => {
          const forte = linha.some(ehForte);
          const letras = linha.filter(ehForte).join(" ").length || linha.join(" ").length;
          // As linhas comuns sempre menores que a do destaque
          const tamanho = forte ? Math.min(210, Math.round(1100 / Math.max(letras, 4))) : Math.min(96, Math.round(860 / Math.max(letras, 8)));
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "0.22em", fontSize: tamanho }}>
              {linha.map((p, j) => (
                // A folga em cima (padding) leva o dourado até o acento: com a linha justa (0.92), o
                // fundo recortado na letra parava na altura da maiúscula e o "É" saía sem acento
                <span key={j} style={{ ...dourado, fontSize: forte && !ehForte(p) ? "0.5em" : "1em", letterSpacing: "0.01em", paddingTop: "0.22em", marginTop: "-0.22em" }}>
                  {p}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Luminância relativa (WCAG) de uma cor #RRGGBB */
function luminancia(cor: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(cor.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre duas cores (1 a 21, WCAG) */
function contraste(a: string, b: string) {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

const AMARELO_DA_CAPA = "#FFD60A";

/**
 * A cor da palavra de destaque da capa: a do modelo ou da marca, se ela lê bem
 * sobre o lado escuro da capa e o contorno preto; senão, amarelo forte (26/11/2026:
 * o vermelho da marca, #B3001B, sumia no fundo escuro). 4,5 é o mínimo de leitura do WCAG.
 */
export function destaqueDaCapa(cor: string) {
  return /^#[0-9a-f]{6}$/i.test(cor) && contraste(cor, "#0d0b10") >= 4.5 ? cor : AMARELO_DA_CAPA;
}

/**
 * A letra do título da capa (1280x720) que cabe: simula a quebra em linhas (letra
 * grossa em caixa alta ≈ 0,72 da altura por letra, medido no render; a caixa tem
 * 640 px e a palavra mais larga que isso fica sozinha na linha) e encolhe até as
 * linhas caberem entre o topo (70) e a margem de baixo.
 */
function letraQueCabe(palavras: string[], inicial: number) {
  const ALTURA_LIVRE = 720 - 70 - 50;
  const linhas = (tamanho: number) => {
    const larguraDe = (p: string) => p.length * tamanho * 0.72;
    const caixa = 640;
    let total = 1;
    let atual = 0;
    for (const p of palavras) {
      const largura = larguraDe(p);
      if (atual > 0 && atual + tamanho * 0.25 + largura > caixa) {
        total += 1;
        atual = largura;
      } else atual += (atual > 0 ? tamanho * 0.25 : 0) + largura;
    }
    return total;
  };
  let tamanho = inicial;
  while (tamanho > 60 && linhas(tamanho) * tamanho > ALTURA_LIVRE) tamanho = Math.floor(tamanho * 0.94);
  return tamanho;
}

/** A palavra que sai em destaque: a pedida ou, sem ela, a mais longa do título (a capa toda branca não chamava o olho) */
function palavrasEmDestaque(palavras: string[], destaque: string | undefined, limpa: (p: string) => string) {
  const pedidas = destaque?.toUpperCase().split(/\s+/).map(limpa).filter(Boolean) ?? [];
  if (pedidas.some((p) => palavras.some((q) => limpa(q) === p))) return pedidas;
  if (palavras.length < 2) return [];
  const maior = palavras.reduce((a, b) => (limpa(b).length > limpa(a).length ? b : a));
  return [limpa(maior)];
}

export const CapaDoDocumentario: React.FC<CapaDocumentario> = (capa) => {
  if (capa.modelo === "cinema") return <CapaDeCinema {...capa} />;
  const { titulo, destaque, foto, lado = "esquerda", estilo } = capa;
  const doisLados = capa.modelo === "dois-lados" && foto && capa.foto2;
  // O modelo do canal: o tratamento da foto, a letra e a cor do destaque (o Clássico fica como sempre)
  const ap = aparenciaDo(estilo);
  const classico = ap.modelo === "classico" && !estilo?.letra && !estilo?.cor;
  const palavras = titulo.toUpperCase().split(/\s+/).filter(Boolean);
  const limpa = (palavra: string) => palavra.replace(/[^\p{L}\p{N}]/gu, "");
  const alvo = palavrasEmDestaque(palavras, destaque, limpa);
  const corDoDestaque = classico ? AMARELO_DA_CAPA : destaqueDaCapa(ap.destaque);
  const maior = Math.max(...palavras.map((p) => p.length), 1);
  // Letra o maior possível: 2 palavras por linha, encolhendo se uma palavra for longa
  // e de novo se o título não couber na altura (26/11/2026: "A FUGA QUE TRANSFORMOU
  // O RIO EM CAPITAL" deu 5 linhas e a última saía cortada embaixo)
  const tamanho = letraQueCabe(palavras, Math.min(150, Math.round(1500 / Math.max(maior, 6))));
  const naDireita = lado === "direita";
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0b10" }}>
      {doisLados ? (
        <DoisLados foto={foto} foto2={capa.foto2 as string} rotulos={capa.rotulos} filtro={`contrast(1.18) saturate(1.15) brightness(1.04)${ap.filtro === "none" ? "" : ` ${ap.filtro}`}`} />
      ) : foto ? (
        <Img
          src={arquivo(foto)}
          // O corte puxa para cima: em retrato e cena com gente, o rosto fica na parte de cima
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 22%",
            filter: `contrast(1.18) saturate(1.15) brightness(1.04)${ap.filtro === "none" ? "" : ` ${ap.filtro}`}`,
            transform: "scale(1.06)",
          }}
        />
      ) : (
        <FundoSemFoto destaque={ap.destaque} fundo={ap.fundo} />
      )}
      {!classico && <ap.Camadas />}
      {/* Bordas escuras e o lado do texto mais escuro, para a figura e as letras saltarem */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)" }} />
      <AbsoluteFill
        style={{
          background: doisLados
            ? "linear-gradient(180deg, rgba(8,7,10,0.8) 0%, rgba(8,7,10,0.2) 40%, rgba(8,7,10,0) 60%)"
            : `linear-gradient(${naDireita ? 270 : 90}deg, rgba(8,7,10,0.85) 0%, rgba(8,7,10,0.55) 38%, rgba(8,7,10,0) 62%)`,
        }}
      />
      {/* O círculo, a seta, a lupa ou o carimbo no detalhe que a capa quer mostrar */}
      <MarcasDaCapa
        capa={capa}
        fotoSrc={foto ? arquivo(foto) : null}
        naDireita={naDireita}
        filtroDaFoto={`contrast(1.18) saturate(1.15) brightness(1.04)${ap.filtro === "none" ? "" : ` ${ap.filtro}`}`}
      />
      {/* O texto fica em cima, do lado escolhido: o canto de baixo à direita fica livre */}
      <div
        style={{
          position: "absolute",
          top: 70,
          [naDireita ? "right" : "left"]: 60,
          maxWidth: 640,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: naDireita ? "flex-end" : "flex-start",
          gap: `0 ${Math.round(tamanho * 0.25)}px`,
          fontFamily: classico ? fontes.titulo : ap.fonteTitulo,
          fontWeight: classico ? 900 : Math.max(700, ap.pesoTitulo),
          fontSize: tamanho,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          textAlign: naDireita ? "right" : "left",
        }}
      >
        {palavras.map((palavra, i) => (
          <span
            key={i}
            style={{
              color: alvo.includes(limpa(palavra)) ? corDoDestaque : "#FFFFFF",
              WebkitTextStroke: `${Math.max(6, Math.round(tamanho * 0.07))}px #000`,
              paintOrder: "stroke fill",
              textShadow: "0 8px 24px rgba(0,0,0,0.7)",
            }}
          >
            {palavra}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
