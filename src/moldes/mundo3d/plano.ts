import type { FormaDaBoca, Palavra } from "../../componentes/personagens/Boneco";
import { estimarPalavras, FPS, quadrosDaCenaDoMundo3D } from "../tempos.ts";
import { meioDaCabeca, posicaoNoQuadro, posturaNoQuadro } from "./animacao.ts";
import { anguloSuave, montarAtuacao, rumoBase, type CenaParaAtuar } from "./atuacao.ts";
import { planejarTomadas, type MovimentoDaCamera, type Plano, type Ponto } from "./camera.ts";
import { lugaresDaMultidao, prepararTomadas, type Palco } from "./filmagem.ts";

// O plano de filmagem do Mundo3D (28/11/2026): a linha do tempo, a atuação e as
// tomadas, tudo conta pura (sem React). O molde desenha com isto e o conferir
// usa o mesmo cálculo para avisar quando nenhum ângulo mostra o rosto do foco
// (o ajoelhado atrás de quem está de pé).

/** A ponte do campo (o Mundo.tsx desenha com estas medidas) */
export const PONTE = { meiaLargura: 1.3, z1: -10.6, z2: -3.4, altura: 0.62 };

export type PalavraDita = Palavra & { texto: string; fimDeFrase?: boolean };

/** O que o plano lê de cada cena do roteiro */
export type CenaDoPlano = {
  fala: string;
  quem?: string;
  plano: string;
  foco: string;
  lugar?: string;
  estados?: CenaParaAtuar["estados"];
  multidao?: CenaParaAtuar["multidao"];
  mudancas?: CenaParaAtuar["mudancas"];
  acoes?: CenaParaAtuar["acoes"];
  camera?: { movimento?: string; cortar?: boolean };
  ilustra?: unknown[];
  queda?: string;
  narracao?: {
    duracaoSeg: number;
    legendas: Array<{ texto: string; inicioMs: number; fimMs: number; fimDeFrase?: boolean }>;
    boca?: Array<{ inicio: number; forma: string }>;
  };
};

// Onde começa cada cena e o tempo de cada palavra: o da voz (npm run narrar)
// ou, antes dela, a estimativa
export function linhaDoTempo<C extends CenaDoPlano>(cenas: C[]) {
  let quadro = 0;
  return cenas.map((cena) => {
    const inicio = quadro;
    let palavras: PalavraDita[];
    let boca: FormaDaBoca[] | undefined;
    if (cena.narracao) {
      palavras = cena.narracao.legendas.map((l) => ({
        texto: l.texto,
        inicio: inicio + Math.round((l.inicioMs / 1000) * FPS),
        fim: inicio + Math.round((l.fimMs / 1000) * FPS),
        ...(l.fimDeFrase ? { fimDeFrase: true } : {}),
      }));
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
    }
    const limpa = (t: string) => t.toLowerCase().replace(/[^\p{L}]/gu, "");
    const queda = cena.queda ? palavras.find((p) => limpa(p.texto).startsWith(limpa(cena.queda ?? "")))?.inicio : undefined;
    // O mesmo tempo que o tempos.ts calcula (o render, a prévia e a conferência batem)
    const fim = inicio + quadrosDaCenaDoMundo3D(cena);
    quadro = fim;
    return { cena, inicio, fim, palavras, boca, queda };
  });
}

export type EntradaDoPlano<C extends CenaDoPlano> = {
  personagens: Array<{ id: string; onde: [number, number]; naPonte?: boolean; cenas?: number[] }>;
  multidao?: { quantos: number; naPonte?: boolean } | null;
  objetos: Array<{ tipo: string; perto?: string; naMao?: boolean }>;
  /** O lugar da história (cenario.ambiente) */
  ambiente: string;
  semente: number;
  linha: ReturnType<typeof linhaDoTempo<C>>;
  largura: number;
  altura: number;
};

/** A atuação, quem está em cada cena e as tomadas (com o lado e o ângulo de cada uma) */
export function planejarFilmagem<C extends CenaDoPlano>(e: EntradaDoPlano<C>) {
  const { personagens, multidao, linha, largura, altura } = e;
  const ids = personagens.map((p) => p.id);
  /** Quem está na cena n (sem "cenas", todos) */
  const presentes = (n: number) => personagens.filter((p) => !p.cenas?.length || p.cenas.includes(n + 1)).map((p) => p.id);
  // O lugar de cada cena: o da cena (cena.lugar) ou o da história
  const lugarDaCena = (n: number): string => {
    let l = e.ambiente;
    for (let k = 0; k <= n; k++) l = linha[k]?.cena.lugar ?? l;
    return l;
  };
  const lugares = multidao ? lugaresDaMultidao(multidao.quantos, Boolean(multidao.naPonte), personagens.map((p) => p.onde), e.semente) : [];

  // A atuação: as poses, as ações na palavra, os passos, os giros e quem segura o quê
  const atuacao = montarAtuacao(
    personagens.map((p) => ({ id: p.id, onde: p.onde })),
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
    e.objetos,
  );
  const { trilhas } = atuacao;
  const ondeNoChao = (id: string, quadro: number) => posicaoNoQuadro(trilhas[id], quadro).onde;
  const cenaDoQuadro = (q: number) => {
    const n = linha.findIndex((l) => q < l.fim);
    return n === -1 ? linha.length - 1 : n;
  };
  const presentesNoQuadro = (q: number) => presentes(Math.max(0, cenaDoQuadro(q)));
  const rumoDe = (id: string, quadro: number) => anguloSuave((k) => rumoBase(id, k, trilhas, presentesNoQuadro), quadro, 10);
  /** Os pés no mundo, sem o balanço da ponte (as contas feitas uma vez: todas as abas do render calculam igual) */
  const pesDe = (id: string, quadro: number): Ponto => {
    const [x, z] = ondeNoChao(id, quadro);
    return personagens.find((p) => p.id === id)?.naPonte ? [x, PONTE.altura, z] : [x, 0, z];
  };
  /** O meio do rosto no mundo (sem a vida, só a postura da chave), a partir dos pés: para a câmera mirar */
  const rostoAPartirDe = (id: string, quadro: number, pes: Ponto): Ponto => {
    const r = meioDaCabeca(posturaNoQuadro(trilhas[id].chaves, quadro).postura);
    const giro = rumoDe(id, quadro);
    return [pes[0] + r[0] * Math.cos(giro) + r[2] * Math.sin(giro), pes[1] + r[1], pes[2] - r[0] * Math.sin(giro) + r[2] * Math.cos(giro)];
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
  const sozinho = personagens.length === 1 && !multidao;

  // As tomadas: uma ou duas por cena; o lado de cada uma, o grupo do plano aberto e quem da multidão sai do plano
  const palco: Palco = {
    ids,
    presentesNa: presentes,
    rostoDe: (id, quadro) => rostoAPartirDe(id, quadro, pesDe(id, quadro)),
    pesDe,
    rumoDe,
    meioDoGrupo,
    multidao: lugares,
    alturaDaMultidao: multidao?.naPonte ? PONTE.altura : 0,
    sozinho,
    largura,
    altura,
  };
  const tomadas = prepararTomadas(
    planejarTomadas(
      linha.map((t, n) => ({
        inicio: t.inicio,
        fim: t.fim,
        plano: t.cena.plano as Plano,
        foco: focoValido(t.cena.foco),
        quem: t.cena.quem,
        movimento: t.cena.camera?.movimento as MovimentoDaCamera | undefined,
        cortar: t.cena.camera?.cortar,
        palavras: t.palavras,
        comIlustracao: Boolean(t.cena.ilustra?.length),
        // Mudou quem está ou o lugar: corta (ninguém aparece ou some no meio de um plano)
        corteAntes: n > 0 && (presentes(n).join() !== presentes(n - 1).join() || lugarDaCena(n) !== lugarDaCena(n - 1)),
      })),
      ids,
    ),
    palco,
  );
  return { ids, atuacao, lugares, presentes, presentesNoQuadro, lugarDaCena, ondeNoChao, rumoDe, rostoAPartirDe, meioDoGrupo, sozinho, palco, tomadas };
}
