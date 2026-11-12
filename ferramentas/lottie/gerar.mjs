// Gera as animações Lottie do kit nas cores da marca (marca/marca.json) em
// src/componentes/lottie/gerados/. Rodar de novo sempre que as cores mudarem.
//   npm run lottie
// Para uma animação nova, siga o mesmo jeito (veja a skill lottie).
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  anim,
  arquivo,
  brilho4,
  contorno,
  coracao,
  curva,
  desenha,
  EASE,
  elipse,
  estrela5,
  fixo,
  grupo,
  hex,
  linha,
  preenche,
  retangulo,
  salvar,
  sorteio,
} from "./lottie.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");
const SAIDA = join(RAIZ, "src", "componentes", "lottie", "gerados");
mkdirSync(SAIDA, { recursive: true });
const marca = JSON.parse(readFileSync(join(RAIZ, "marca", "marca.json"), "utf8"));

const C = {
  destaque: hex(marca.cores.destaque),
  texto: hex(marca.cores.texto),
  fundo: hex(marca.cores.fundo),
  noDestaque: hex(marca.cores.textoNoDestaque),
  ouro: hex("#ffc23d"),
  ouroApagado: hex("#d9d4cc"),
  branco: hex("#ffffff"),
};

const L = 320;
const M = L / 2;

/** Brilho que pisca: cresce girando e some; `t` = quadro do pico */
const brilho = (x, y, r, t, cor) => ({
  nm: "brilho",
  shapes: [grupo("estrela", [brilho4(r), preenche(cor)])],
  transform: {
    p: [x, y, 0],
    s: anim([
      [t - 8, [0, 0, 100], EASE.pop],
      [t, [100, 100, 100], EASE.saida],
      [t + 14, [0, 0, 100]],
    ]),
    r: anim([
      [t - 8, -45],
      [t + 14, 45],
    ]),
  },
});

// Sucesso: o círculo se desenha, o check se desenha por dentro, brilhos em volta.
salvar(
  join(SAIDA, "sucesso.json"),
  arquivo("sucesso", {
    w: L,
    h: L,
    op: 60,
    camadas: [
      {
        nm: "check",
        shapes: [
          grupo("traço", [
            linha([
              [-48, 2],
              [-14, 36],
              [52, -34],
            ]),
            contorno(C.noDestaque, 22),
            desenha(anim([
              [12, 0, EASE.entrada],
              [26, 100],
            ])),
          ]),
        ],
        transform: { p: [M, M, 0] },
      },
      {
        nm: "círculo",
        shapes: [grupo("disco", [elipse(210), preenche(C.destaque)])],
        transform: {
          p: [M, M, 0],
          s: anim([
            [0, [0, 0, 100], EASE.pop],
            [10, [112, 112, 100], EASE.assenta],
            [18, [100, 100, 100]],
          ]),
        },
      },
      brilho(60, 70, 22, 22, C.destaque),
      brilho(262, 90, 16, 26, C.ouro),
      brilho(250, 252, 20, 30, C.destaque),
    ],
  }),
);

// Confete: pedaços nas cores da marca sobem e caem girando (fundo transparente).
{
  const r = sorteio(7);
  const W = 1080;
  const H = 1080;
  const cores = [C.destaque, C.ouro, C.texto, C.branco];
  const camadas = [];
  for (let k = 0; k < 46; k++) {
    const x0 = W / 2 + (r() - 0.5) * 240;
    const xf = r() * W;
    const pico = 120 + r() * 300;
    const atraso = Math.round(r() * 8);
    const queda = 50 + Math.round(r() * 30);
    const largura = 14 + r() * 14;
    camadas.push({
      nm: `confete ${k}`,
      shapes: [
        grupo("pedaço", [
          k % 3 === 0 ? elipse(largura) : retangulo(largura, largura * 0.55, 3),
          preenche(cores[k % cores.length]),
        ]),
      ],
      transform: {
        p: anim([
          [atraso, [x0, H + 20, 0], EASE.sobe],
          [atraso + 18, [(x0 + xf) / 2, pico, 0], EASE.cai],
          [atraso + 18 + queda, [xf, H + 60, 0]],
        ]),
        r: anim([
          [atraso, 0, EASE.linear],
          [atraso + 18 + queda, (r() - 0.5) * 1080],
        ]),
      },
    });
  }
  salvar(join(SAIDA, "confete.json"), arquivo("confete", { w: W, h: H, op: 90, camadas }));
}

// Estrelas: cinco estrelas de avaliação acendem em sequência, com um pulo.
{
  const W = 900;
  const H = 200;
  const camadas = [];
  for (let k = 0; k < 5; k++) {
    const x = 100 + k * 175;
    const t = 6 + k * 6;
    camadas.push({
      nm: `estrela ${k + 1}`,
      shapes: [grupo("cheia", [estrela5(70), preenche(C.ouro)])],
      transform: {
        p: [x, H / 2, 0],
        s: anim([
          [t, [0, 0, 100], EASE.pop],
          [t + 8, [122, 122, 100], EASE.assenta],
          [t + 16, [100, 100, 100]],
        ]),
      },
    });
    camadas.push({
      nm: `vazia ${k + 1}`,
      shapes: [grupo("vazia", [estrela5(70), preenche(C.ouroApagado)])],
      transform: { p: [x, H / 2, 0] },
    });
  }
  salvar(join(SAIDA, "estrelas.json"), arquivo("estrelas", { w: W, h: H, op: 60, camadas }));
}

// Curtida: coração pula, pulsa uma vez e solta brilhos.
salvar(
  join(SAIDA, "curtida.json"),
  arquivo("curtida", {
    w: L,
    h: L,
    op: 60,
    camadas: [
      brilho(70, 80, 18, 16, C.ouro),
      brilho(250, 70, 22, 19, C.destaque),
      brilho(260, 240, 16, 22, C.ouro),
      {
        nm: "coração",
        shapes: [grupo("coração", [coracao(80), preenche(C.destaque)])],
        transform: {
          p: [M, M + 10, 0],
          s: anim([
            [0, [0, 0, 100], EASE.pop],
            [9, [125, 125, 100], EASE.assenta],
            [16, [95, 95, 100], EASE.assenta],
            [24, [108, 108, 100], EASE.assenta],
            [32, [100, 100, 100]],
          ]),
        },
      },
    ],
  }),
);

// Seta: aponta para baixo e balança (para "link na bio", "toque aqui").
salvar(
  join(SAIDA, "seta.json"),
  arquivo("seta", {
    w: 200,
    h: 260,
    op: 60,
    camadas: [
      {
        nm: "seta",
        shapes: [
          grupo("haste", [
            curva([0, -90], [[[0, -40], [0, -10], [0, 40]]]),
            contorno(C.destaque, 22),
            desenha(anim([
              [0, 0, EASE.entrada],
              [12, 100],
            ])),
          ]),
          grupo("ponta", [
            linha([
              [-46, -6],
              [0, 44],
              [46, -6],
            ]),
            contorno(C.destaque, 22),
            desenha(anim([
              [8, 0, EASE.entrada],
              [18, 100],
            ])),
          ]),
        ],
        transform: {
          p: anim([
            [18, [100, 120, 0], EASE.viagem],
            [34, [100, 140, 0], EASE.viagem],
            [50, [100, 120, 0]],
          ]),
          o: fixo(100),
        },
      },
    ],
  }),
);
