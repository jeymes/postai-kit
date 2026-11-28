import { Easing, interpolate, spring } from "remotion";
import { z } from "zod";
import type { Expressao, Momento, Palavra } from "../../componentes/personagens/Boneco";
import { MAOS_OCUPADAS, type Momento2D, type Pose2D } from "../../componentes/personagens/movimento";
import { ACOES, EXPRESSOES_DO_ROTEIRO, normalizar, PLANOS, POSES_DO_ROTEIRO, type Acao, type Plano, type Troca } from "./regras2d";
export { ACOES, EXPRESSOES_DO_ROTEIRO, MINIMO_NO_CENARIO, normalizar, PLANOS, POSES_DO_ROTEIRO, trocasDeCenario, type Troca } from "./regras2d";
import type { TipoDeApoio } from "../../componentes/objetos/ObjetosDeApoio";

// A direção do episódio 2D (27/11/2026): as ações na palavra exata, a câmera viva,
// a troca de cenário com transição e o objeto de apoio sempre na mesma mão.
// Fica fora do Conversa.tsx; um roteiro sem os campos novos também ganha a câmera,
// a vida dos personagens e as transições (sem os bugs de antes).

export const acaoSchema = z.object({
  quem: z.string().describe("O id de quem faz a ação (do elenco)"),
  em: z
    .string()
    .describe('A palavra da fala em que a ação acontece, como está escrita (a primeira vez que ela aparece; "inicio" = antes da 1ª palavra, "fim" = depois da última)'),
  vez: z.number().int().min(1).optional().describe("Se a palavra aparece mais de uma vez: qual delas (1 = a primeira)"),
  pose: z.enum(POSES_DO_ROTEIRO).optional(),
  expressao: z.enum(EXPRESSOES_DO_ROTEIRO).optional(),
  acao: z.enum(ACOES).optional().describe("Uma ação: pegar/guardar/baixar o celular, cair sentado, levantar, andar, virar, ficar de costas, pular, tremer"),
});
export type AcaoDoRoteiro = z.infer<typeof acaoSchema>;

/** Os campos novos de cada fala */
export const camposDeDirecao = {
  acoes: z
    .array(acaoSchema)
    .max(8)
    .optional()
    .describe(
      'O personagem age DURANTE a fala, na palavra exata: [{ "quem": "bia", "em": "celular", "acao": "pegar-celular" }, { "quem": "lu", "em": "sério", "pose": "bracos-cruzados", "expressao": "brava" }]. A troca é suave (uns 9 quadros)',
    ),
  camera: z.enum(PLANOS).optional().describe('O plano desta fala: "aberto" (todos), "medio" (perto de quem fala) ou "close" (o rosto). Sem isso, a câmera escolhe sozinha'),
  foco: z.string().optional().describe("Em quem a câmera fica no medio e no close (sem isso: quem fala)"),
};

/** A direção do roteiro inteiro (campos do topo) */
export const camposDeDirecaoDoTopo = {
  camera: z
    .enum(["viva", "fixa"])
    .default("viva")
    .describe('"viva" (padrão): a câmera troca de plano sozinha e aproxima nas emoções; "fixa": o quadro aberto o vídeo inteiro'),
  figurino: z
    .union([z.number().int().min(0).max(4), z.record(z.string(), z.number().int().min(0).max(4))])
    .optional()
    .describe('A roupa do episódio: 0 (a de sempre) a 4, para todos ou por id ({"bia": 2}). Sem isso: escolhida pelo número do episódio'),
  episodio: z.number().int().min(0).optional().describe("O número do episódio (escolhe a roupa de cada um, se não houver figurino)"),
};

// ---- A palavra exata ----

type Trecho = { cena: { fala: string; quem?: string; acoes?: AcaoDoRoteiro[] }; inicio: number; palavras: Palavra[]; legendas: Array<{ texto: string }> };

/** O quadro em que a ação acontece: um pouco antes da palavra (o gesto chega junto com ela); null se a palavra não está na fala */
export function quadroDaPalavra(trecho: Trecho, em: string, vez = 1): number | null {
  const { palavras, legendas, inicio } = trecho;
  if (!palavras.length) return null;
  const alvo = normalizar(em);
  if (alvo === "inicio") return Math.max(0, inicio - 4);
  if (alvo === "fim") return palavras[palavras.length - 1].fim;
  let achadas = 0;
  for (let n = 0; n < legendas.length && n < palavras.length; n++) {
    const palavra = normalizar(legendas[n].texto);
    if (palavra === alvo || (alvo.length >= 4 && palavra.startsWith(alvo))) {
      achadas++;
      if (achadas === vez) return Math.max(inicio, palavras[n].inicio - 3);
    }
  }
  return null;
}

// ---- Os momentos de cada personagem ----

type Evento = Partial<Omit<Momento2D, "em">> & { em: number };

/** Para onde a pessoa anda (px na tela, a partir do lugar dela) */
function destino(acao: Acao, indice: number, pessoas: number, left: number): number | undefined {
  const meio = left + 270;
  const lado = pessoas === 2 ? (indice === 0 ? 1 : -1) : 1;
  switch (acao) {
    case "andar-perto":
      return pessoas === 2 ? 130 * lado : 0;
    case "andar-longe":
      return pessoas === 2 ? -120 * lado : 0;
    case "andar-meio":
      return 540 - meio;
    case "andar-esquerda":
      return 250 - meio;
    case "andar-direita":
      return 830 - meio;
    case "voltar":
      return 0;
    default:
      return undefined;
  }
}

function eventoDaAcao(acao: AcaoDoRoteiro, em: number, indice: number, pessoas: number, left: number): Evento {
  const ev: Evento = { em };
  if (acao.pose) ev.pose = acao.pose;
  if (acao.expressao) ev.expressao = acao.expressao;
  switch (acao.acao) {
    case "pegar-celular":
      ev.pose = ev.pose ?? "celular";
      break;
    case "guardar-celular":
    case "levantar":
      ev.pose = ev.pose ?? "normal";
      break;
    case "baixar-celular":
      ev.pose = ev.pose ?? "celular-baixo";
      break;
    case "cair-sentado":
      // Com o celular na mão, senta com ele; sem, as mãos no colo (o Conversa troca)
      ev.pose = "sentado-livre";
      ev.rapido = true;
      break;
    case "virar":
      ev.virado = true;
      break;
    case "desvirar":
      ev.virado = false;
      break;
    case "costas":
      ev.costas = true;
      break;
    case "frente":
      ev.costas = false;
      break;
    case "pular":
      ev.efeito = "pulo";
      break;
    case "tremer":
      ev.efeito = "tremer";
      break;
    default:
      if (acao.acao) ev.x = destino(acao.acao, indice, pessoas, left);
  }
  return ev;
}

/** Junta os eventos (estado da fala, virada do meio, ações na palavra) em momentos completos, em ordem */
export function montarMomentos(eventos: Evento[]): Momento2D[] {
  const ordem = eventos.map((e, i) => ({ e, i })).sort((a, b) => a.e.em - b.e.em || a.i - b.i);
  let pose: Pose2D = "normal";
  let expressao: Expressao = "neutra";
  return ordem.map(({ e }) => {
    // Cair sentado com o celular na mão: senta com ele
    const comCelular = pose === "celular" || pose === "sentado";
    pose = e.rapido && e.pose === "sentado-livre" && comCelular ? "sentado" : (e.pose ?? pose);
    expressao = e.expressao ?? expressao;
    return { ...e, pose, expressao } as Momento2D;
  });
}

/** Os eventos das ações de alguém numa fala */
export function eventosDasAcoes(trecho: Trecho, quem: string, indice: number, pessoas: number, left: number): Evento[] {
  return (trecho.cena.acoes ?? [])
    .filter((a) => a.quem === quem)
    .flatMap((a) => {
      const em = quadroDaPalavra(trecho, a.em, a.vez);
      // Palavra que não está na fala: a ação fica no meio da fala (a conferência avisa)
      const quadro = em ?? trecho.palavras[Math.floor(trecho.palavras.length / 2)]?.inicio ?? trecho.inicio;
      return [eventoDaAcao(a, quadro, indice, pessoas, left)];
    });
}

// ---- Objeto de apoio: sempre na mesma mão, entrando e saindo devagar ----

export type Pegada = { tipo: TipoDeApoio; de: number; ate: number };

/** Os objetos que alguém segura ao longo do vídeo (cada um de quando entra até quando sai) */
export function pegadasDe(linha: Array<{ cena: { objetos?: Array<{ quem: string; tipo: string; onde?: string }> }; inicio: number }>, id: string): Pegada[] {
  const pegadas: Pegada[] = [];
  let atual: Pegada | null = null;
  for (const { cena, inicio } of linha) {
    for (const o of cena.objetos ?? []) {
      if (o.quem !== id || (o.onde ?? "mao") !== "mao") continue;
      const quando = Math.max(0, inicio - 6);
      if (atual && (o.tipo === "nenhum" || o.tipo !== atual.tipo)) {
        atual.ate = quando;
        pegadas.push(atual);
        atual = null;
      }
      if (o.tipo !== "nenhum" && !atual) atual = { tipo: o.tipo as TipoDeApoio, de: quando, ate: Infinity };
    }
  }
  if (atual) pegadas.push(atual);
  return pegadas;
}

/** A mão livre durante toda a pegada (a direita, se der; senão a esquerda) */
export function maoDaPegada(pegada: Pegada, momentos: Momento2D[]): "esq" | "dir" {
  const poses = new Set<Pose2D>();
  let antes: Pose2D = "normal";
  for (const m of momentos) {
    if (m.em <= pegada.de) antes = m.pose;
    else if (m.em < pegada.ate) poses.add(m.pose);
  }
  poses.add(antes);
  const ocupadas = new Set([...poses].flatMap((p) => MAOS_OCUPADAS[p] ?? []));
  if (!ocupadas.has("dir")) return "dir";
  return "esq";
}

/** O objeto na mão agora: o tipo, a mão e o tamanho (cresce ao entrar, encolhe ao sair e quando a mão vai à cabeça) */
export function objetoNaMaoAgora(pegadas: Pegada[], momentos: Momento2D[], frame: number, fps: number) {
  const p = pegadas.find((g) => frame >= g.de && frame < g.ate);
  if (!p) return null;
  const mao = maoDaPegada(p, momentos);
  const entra = spring({ frame: frame - p.de, fps, config: { damping: 14, stiffness: 170 } });
  const sai = Number.isFinite(p.ate) ? interpolate(frame, [p.ate - 8, p.ate], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  // Mão ocupada (na cabeça, no queixo, cruzada): o objeto encolhe junto com o movimento, sem sumir num quadro
  const ocupada = nivelAgora(momentos, (pose) => MAOS_OCUPADAS[pose]?.includes(mao) ?? false, frame, 10);
  return { tipo: p.tipo, mao, escala: Math.min(entra, sai, 1 - ocupada) };
}

// ---- Olhar: quem ouve olha para quem fala ----

/** Os trechos em que OUTRO personagem fala (uma fala inteira de cada vez, sem piscar entre as palavras) */
export function quandoOutroFala(linha: Array<{ cena: { quem?: string }; palavras: Palavra[] }>, id: string, ids: string[]): Palavra[] {
  return linha
    .filter((l) => l.cena.quem && l.cena.quem !== id && ids.includes(l.cena.quem) && l.palavras.length)
    .map((l) => ({ inicio: l.palavras[0].inicio, fim: l.palavras[l.palavras.length - 1].fim }));
}

// ---- Câmera ----

export type Camera = { x: number; y: number; z: number };
export const CAMERA_ABERTA: Camera = { x: 540, y: 960, z: 1 };

/** O ponto da câmera dentro do cenário, sem mostrar fora dele (o cenário é do tamanho da tela) */
function dentro(c: Camera): Camera {
  const mx = 540 / c.z;
  const my = 960 / c.z;
  return { z: c.z, x: Math.min(1080 - mx, Math.max(mx, c.x)), y: Math.min(1920 - my, Math.max(my, c.y)) };
}

/** O enquadramento de um plano: `rosto` é o rosto de quem está em foco (na tela, sem câmera) */
export function enquadrar(plano: Plano, rosto: { x: number; y: number } | null, forca?: number): Camera {
  if (plano === "aberto" || !rosto) return CAMERA_ABERTA;
  if (plano === "medio") {
    const z = 1.14;
    return dentro({ z, x: 540 + (rosto.x - 540) * 0.5, y: rosto.y + 220 / z });
  }
  // Close: o rosto em y ~ 820 na tela (acima da legenda, abaixo do título)
  // Close de verdade (1,45): com menos, o outro ficava cortado ao meio e parecia erro de enquadramento
  const z = forca ? 1 + forca : 1.45;
  return dentro({ z, x: 540 + (rosto.x - 540) * 0.92, y: rosto.y + 160 / z });
}

const EMOCAO_FORTE = new Set<string>(["surpresa", "medo", "brava", "radiante", "preocupada"]);
const BRACOS_NO_ALTO = new Set<string>(["comemorando", "cabeca", "acenando"]);

export type PlanoDaFala = { plano: Plano; foco: number };

/**
 * O plano de cada fala. O roteiro manda (`camera` e `foco` da fala, `zoom` do topo); sem isso,
 * a câmera escolhe: a 1ª fala aberta (a prévia do feed), close na emoção forte de quem fala,
 * medio e aberto alternando, e aberto quando há cartão, QR, notificação, abraço ou alguém andando.
 */
export function planosDasFalas(args: {
  falas: Array<{
    quem?: string;
    camera?: Plano;
    foco?: string;
    expressoes: Record<string, string | undefined>;
    poses: string[];
    cheia: boolean;
  }>;
  ids: string[];
  viva: boolean;
  zoom?: { em: string; de: number; ate: number };
}): PlanoDaFala[] {
  const { falas, ids, viva, zoom } = args;
  const planos: PlanoDaFala[] = [];
  falas.forEach((f, k) => {
    const fala = ids.indexOf(f.quem ?? "");
    const foco = f.foco ? ids.indexOf(f.foco) : fala;
    if (zoom && k >= zoom.de && k <= zoom.ate) {
      planos.push({ plano: "close", foco: Math.max(0, ids.indexOf(zoom.em)) });
      return;
    }
    if (f.camera) {
      planos.push({ plano: f.camera, foco: foco >= 0 ? foco : 0 });
      return;
    }
    if (!viva || k === 0 || f.cheia || foco < 0 && ids.length > 1) {
      // O narrador: aberto, ou um medio no meio de vez em quando
      planos.push({ plano: !viva || k === 0 || f.cheia || planos[k - 1]?.plano !== "aberto" ? "aberto" : "medio", foco: -1 });
      return;
    }
    const alvo = foco >= 0 ? foco : 0;
    const antes = planos[k - 1]?.plano ?? "aberto";
    const emocao = EMOCAO_FORTE.has(f.expressoes[ids[alvo]] ?? "");
    const bracosNoAlto = f.poses.some((p) => BRACOS_NO_ALTO.has(p));
    let plano: Plano;
    if (emocao && !bracosNoAlto && antes !== "close") plano = "close";
    else if (antes === "aberto") plano = "medio";
    else if (antes === "close") plano = k % 2 ? "medio" : "aberto";
    else plano = k % 3 === 0 && !bracosNoAlto ? "close" : "aberto";
    planos.push({ plano, foco: alvo });
  });
  return planos;
}

/** A câmera agora: troca suave de um plano para o outro (16 quadros) e um respiro (aproxima devagar e balança de leve) */
export function cameraAgora(alvos: Array<{ em: number; camera: Camera }>, frame: number): Camera {
  let atual = alvos[0]?.camera ?? CAMERA_ABERTA;
  let desde = alvos[0]?.em ?? 0;
  for (let k = 1; k < alvos.length; k++) {
    const a = alvos[k];
    if (a.em > frame) break;
    const t = interpolate(frame, [a.em, a.em + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    // Parte de onde a câmera estava (se a troca anterior não acabou, sem salto)
    const de = atual;
    atual = { x: de.x + (a.camera.x - de.x) * t, y: de.y + (a.camera.y - de.y) * t, z: de.z + (a.camera.z - de.z) * t };
    if (t >= 1) atual = a.camera;
    desde = a.em;
  }
  // O respiro: aproxima ~2,5% em 4 s e balança uns pixels (só fora do quadro aberto)
  const respiro = atual.z > 1.01 ? Math.min(0.025, ((frame - desde) / 120) * 0.025) : 0;
  const balanco = atual.z > 1.01 ? Math.sin(frame / 70) * 5 : 0;
  return dentro({ z: atual.z * (1 + respiro), x: atual.x + balanco, y: atual.y });
}

/** O transform da câmera (CSS, na camada da cena) */
export const transformDaCamera = (c: Camera) => `translate(540px, 960px) scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;

export const trocaAgora = (trocas: Troca[], frame: number) => trocas.filter((t) => t.em <= frame).pop() ?? trocas[0];

/** Ajuda para as poses de agora de alguém (depois de montar os momentos) */
export const momentoAgora = (momentos: Array<Momento | Momento2D>, frame: number) => momentos.filter((m) => m.em <= frame).pop();

/** De 0 a 1: o quanto vale a condição da pose agora, indo e voltando devagar (`quadros`), sem salto */
export function nivelAgora(momentos: Array<Momento | Momento2D>, condicao: (pose: Pose2D) => boolean, frame: number, quadros = 16) {
  let valor = 0;
  let alvo = 0;
  let desde = 0;
  const curva = (t: number) => interpolate(t, [0, quadros], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  for (const m of momentos) {
    if (m.em > frame) break;
    const novo = condicao(m.pose as Pose2D) ? 1 : 0;
    if (novo === alvo) continue;
    valor = valor + (alvo - valor) * curva(m.em - desde);
    alvo = novo;
    desde = m.em;
  }
  return valor + (alvo - valor) * curva(frame - desde);
}

/** De 0 a 1: o quanto a pessoa está na pose (ex.: no abraço, perto do outro), indo e voltando devagar */
export const naPoseAgora = (momentos: Array<Momento | Momento2D>, pose: Pose2D, frame: number) => nivelAgora(momentos, (p) => p === pose, frame);
