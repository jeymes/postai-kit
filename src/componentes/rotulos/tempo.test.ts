// Testes do texto na cena (rótulos): node --test src/componentes/rotulos/tempo.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import type { PalavraNoTempo } from "../ilustracao/tempo.ts";
import { rotulosSchema, type Rotulo } from "./schema.ts";
import { conferirRotulos, planejarRotulos, presencaDoRotulo, TEMPO_DO_ROTULO } from "./tempo.ts";

const fala = (texto: string, passo = 10, de = 0): PalavraNoTempo[] => texto.split(" ").map((t, i) => ({ texto: t, inicio: de + i * passo, fim: de + i * passo + passo - 2 }));

test("o schema aceita os quatro tipos e recusa o que passa do tamanho", () => {
  const ok = rotulosSchema.safeParse([
    { tipo: "lugarEData", texto: "Itália, 1944" },
    { tipo: "nome", quem: "dito", nome: "Seu Dito", papel: "borracheiro" },
    { tipo: "placa", texto: "CURVA PERIGOSA", estilo: "aviso" },
    { tipo: "bilhete", texto: "Paga ou eu entro.", assinatura: "Lampião", carimbo: "URGENTE" },
  ]);
  assert.equal(ok.success, true);
  assert.equal(rotulosSchema.safeParse([{ tipo: "lugarEData", texto: "x".repeat(40) }]).success, false);
  assert.equal(rotulosSchema.safeParse([{ tipo: "bilhete", texto: "oi", papel: "guardanapo" }]).success, false);
  assert.equal(rotulosSchema.safeParse(Array.from({ length: 5 }, () => ({ tipo: "lugarEData", texto: "a" }))).success, false);
});

test("entra na palavra exata (3 quadros antes) e sai na palavra de saída", () => {
  const p = fala("Em 1944 o Brasil mandou soldados para a Itália", 10, 100);
  const [r] = planejarRotulos([{ tipo: "lugarEData", texto: "Itália, 1944", em: "Brasil", ate: "Itália" }], p, { inicio: 100, fim: 220 });
  assert.equal(r.entra, 100 + 3 * 10 - TEMPO_DO_ROTULO.antecipa);
  assert.equal(r.sai, 100 + 8 * 10 - TEMPO_DO_ROTULO.antecipa);
  assert.equal(r.achouEm && r.achouAte, true);
});

test("sem palavra: entra um tico depois do corte e sai sozinho, nunca depois do fim da cena", () => {
  const p = fala("Seu Dito era borracheiro na curva", 10, 0);
  const [r] = planejarRotulos([{ tipo: "nome", quem: "dito", nome: "Seu Dito" }], p, { inicio: 0, fim: 70 });
  assert.equal(r.entra, 8);
  assert.ok(r.sai <= 70 - TEMPO_DO_ROTULO.saida);
  assert.ok(r.sai - r.entra >= TEMPO_DO_ROTULO.minimo.nome);
});

test("a placa não entra no plano do tempo (é do cenário) e o título do começo segura a etiqueta", () => {
  const p = fala("Na serra tinha uma curva", 10, 0);
  const planos = planejarRotulos(
    [
      { tipo: "placa", texto: "CURVA PERIGOSA" },
      { tipo: "lugarEData", texto: "Serra do Mar · 1987" },
    ] as Rotulo[],
    p,
    { inicio: 0, fim: 200, naoAntesDe: 90 },
  );
  assert.equal(planos.length, 1);
  assert.equal(planos[0].indice, 1);
  assert.equal(planos[0].entra, 90);
});

test("a mesma palavra duas vezes: o segundo rótulo pega a segunda vez", () => {
  const p = fala("Ele escreveu um bilhete e depois outro bilhete", 10, 0);
  const planos = planejarRotulos(
    [
      { tipo: "bilhete", texto: "Primeiro", em: "bilhete", ate: "depois" },
      { tipo: "bilhete", texto: "Segundo", em: "bilhete" },
    ],
    p,
    { inicio: 0, fim: 300 },
  );
  assert.equal(planos[0].entra, 30 - TEMPO_DO_ROTULO.antecipa);
  assert.equal(planos[1].entra, 70 - TEMPO_DO_ROTULO.antecipa);
});

test("presença: 0 fora, sobe na entrada, 1 no meio e desce na saída", () => {
  const p = { entra: 10, sai: 60 };
  assert.equal(presencaDoRotulo(p, 5), 0);
  assert.equal(presencaDoRotulo(p, 10 + TEMPO_DO_ROTULO.entrada / 2), 0.5);
  assert.equal(presencaDoRotulo(p, 40), 1);
  assert.equal(presencaDoRotulo(p, 60 + TEMPO_DO_ROTULO.saida), 0);
});

test("o conferir avisa palavra que falta, nome de quem não está, dois bilhetes e placa no Conversa", () => {
  const avisos = conferirRotulos(
    [
      { tipo: "nome", quem: "ze", nome: "Zé", em: "chegou" },
      { tipo: "bilhete", texto: "a" },
      { tipo: "bilhete", texto: "b" },
      { tipo: "placa", texto: "Loja" },
    ],
    "O Dito apareceu na estrada",
    { ids: ["dito"], molde: "Conversa" },
  );
  assert.ok(avisos.some((a) => a.includes('"chegou" não está na fala')));
  assert.ok(avisos.some((a) => a.includes('"ze" não está em personagens')));
  assert.ok(avisos.some((a) => a.includes("2 bilhetes")));
  assert.ok(avisos.some((a) => a.includes("no Conversa ela não aparece")));
  assert.deepEqual(conferirRotulos([{ tipo: "lugarEData", texto: "Japão", em: "Japão" }], "No Japão é assim", { molde: "Mundo3D" }), []);
});
