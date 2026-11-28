// Testes da escolha do motor da voz do Google (sem rede): node --test ferramentas/voz/motor.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { cabe, dividirTexto, erroDeCota, escolherMotor, jeitoDaFala, lerVozesDoCanal, quandoVolta, SAIDA_ESPERAR_COTA, type CotaDeVoz } from "./motor.ts";

const nada = { pedidos: 0, letras: 0 };
const gasto = (pedidos: number, letras: number) => ({ gemini: { pedidos, letras }, chirp: { pedidos, letras } });
const cota = (sobraHoje: number, sobraNoMes: number): CotaDeVoz => ({
  gemini: { sobraHoje, zeraEm: "2026-11-29T08:00:00.000Z" },
  chirp: { sobraNoMes },
});

test("o principal cabe: sai nele", () => {
  assert.deepEqual(escolherMotor({ motor: "gemini", semCota: "esperar" }, gasto(4, 300), cota(10, 0)), { motor: "gemini" });
  assert.deepEqual(escolherMotor({ motor: "chirp", semCota: "esperar" }, gasto(4, 300), cota(0, 300)), { motor: "chirp" });
});

test("sem cota e sem reserva: espera, com o motivo e quando volta", () => {
  const escolha = escolherMotor({ motor: "gemini", semCota: "esperar" }, gasto(4, 300), cota(3, 1_000_000));
  assert.ok("esperar" in escolha);
  assert.match(escolha.esperar, /Gemini/);
  assert.match(escolha.esperar, /precisa de 4 pedido/);
  assert.match(escolha.esperar, /sobram 3/);
  assert.match(escolha.esperar, /às 05:00 de 29\/11/);
  // Nunca o Kokoro: com o chirp sobrando, mas o canal pediu esperar, espera
  assert.doesNotMatch(escolha.esperar, /kokoro/i);
});

test("sem cota e com reserva: o outro motor, se couber", () => {
  const escolha = escolherMotor({ motor: "gemini", semCota: "reserva" }, gasto(4, 300), cota(3, 500));
  assert.equal("motor" in escolha && escolha.motor, "chirp");
  assert.ok("aviso" in escolha && /reserva \(Chirp 3 HD/.test(escolha.aviso ?? ""));
  const doDark = escolherMotor({ motor: "chirp", semCota: "reserva" }, gasto(4, 300), cota(5, 100));
  assert.equal("motor" in doDark && doDark.motor, "gemini");
});

test("com reserva, mas os dois sem cota: espera", () => {
  const escolha = escolherMotor({ motor: "chirp", semCota: "reserva" }, gasto(4, 300), cota(1, 100));
  assert.ok("esperar" in escolha);
  assert.match(escolha.esperar, /Chirp 3 HD do mês/);
  assert.match(escolha.esperar, /Gemini de hoje/);
});

test("o que já está guardado não gasta: cabe mesmo com a cota zerada", () => {
  assert.deepEqual(escolherMotor({ motor: "gemini", semCota: "esperar" }, { gemini: nada, chirp: { pedidos: 3, letras: 90 } }, cota(0, 0)), { motor: "gemini" });
});

test("sem a cota (o Postaí não respondeu): tenta o principal", () => {
  assert.deepEqual(escolherMotor({ motor: "chirp", semCota: "esperar" }, gasto(4, 300), null), { motor: "chirp" });
  assert.equal(cabe("gemini", { pedidos: 9, letras: 9 }, null), true);
});

test("falhou no meio: a reserva (com reserva) ou espera (sem)", () => {
  const comReserva = escolherMotor({ motor: "gemini", semCota: "reserva" }, gasto(4, 300), cota(10, 1000), ["gemini"]);
  assert.equal("motor" in comReserva && comReserva.motor, "chirp");
  const semReserva = escolherMotor({ motor: "gemini", semCota: "esperar" }, gasto(4, 300), cota(10, 1000), ["gemini"]);
  assert.ok("esperar" in semReserva && /parou no meio desta rodada/.test(semReserva.esperar));
  const osDois = escolherMotor({ motor: "gemini", semCota: "reserva" }, gasto(4, 300), cota(10, 1000), ["gemini", "chirp"]);
  assert.ok("esperar" in osDois);
});

test("o código de saída do ESPERAR_COTA é 75", () => {
  assert.equal(SAIDA_ESPERAR_COTA, 75);
});

test("erros do gerar_voz", () => {
  assert.equal(erroDeCota("gerar_voz: COTA_ACABOU: acabou hoje"), "COTA_ACABOU");
  assert.equal(erroDeCota("gerar_voz: VOZ_FALHOU: voz recusada"), "VOZ_FALHOU");
  assert.equal(erroDeCota("O Postaí respondeu 500 em gerar_voz."), null);
});

test("vozes.json: lê o que vale e recusa o resto", () => {
  assert.deepEqual(lerVozesDoCanal({ motor: "gemini", semCota: "reserva", narrador: " Charon " }), { motor: "gemini", semCota: "reserva", narrador: "Charon" });
  assert.deepEqual(lerVozesDoCanal({ motor: "chirp" }), { motor: "chirp", semCota: "esperar" });
  assert.deepEqual(lerVozesDoCanal({ motor: "kokoro", semCota: "outra" }), { motor: "kokoro", semCota: "esperar" });
  assert.equal(lerVozesDoCanal({ motor: "openai" }), undefined);
  assert.equal(lerVozesDoCanal(null), undefined);
});

test("quando volta", () => {
  assert.equal(quandoVolta("chirp", null), "no dia 1º do mês que vem");
  assert.equal(quandoVolta("gemini", null), "amanhã");
  assert.match(quandoVolta("gemini", cota(0, 0), new Date("2026-11-30T00:00:00Z")), /já deve ter voltado/);
});

test("dividirTexto: até 1500 letras, nas pontas das frases", () => {
  assert.deepEqual(dividirTexto("  Uma frase   curta. "), ["Uma frase curta."]);
  assert.deepEqual(dividirTexto(""), []);
  const frase = "Esta é uma frase de exemplo com umas quarenta letras."; // 53
  const longo = Array.from({ length: 60 }, () => frase).join(" ");
  const trechos = dividirTexto(longo);
  assert.ok(trechos.length >= 3);
  for (const t of trechos) {
    assert.ok(t.length <= 1500);
    assert.ok(t.endsWith("."));
  }
  assert.equal(trechos.join(" "), longo);
  // Uma "frase" sem ponto, maior que o limite: quebra nas palavras
  const semPonto = Array.from({ length: 400 }, () => "palavra").join(" ");
  const pedacos = dividirTexto(semPonto, 1500);
  assert.ok(pedacos.every((t) => t.length <= 1500));
  assert.equal(pedacos.join(" "), semPonto);
});

test("jeito do Gemini: pelo molde, curto e no idioma", () => {
  assert.match(jeitoDaFala("Documentario", true), /documentário/);
  assert.match(jeitoDaFala("Conversa", false), /natural e expressivo/);
  assert.match(jeitoDaFala("Conversa", true), /narrador/);
  assert.match(jeitoDaFala("Documentario", true, "en"), /documentary/);
  for (const molde of ["Documentario", "Conversa", "Mundo3D"])
    for (const idioma of ["pt", "en", "es"] as const) for (const n of [true, false]) assert.ok(jeitoDaFala(molde, n, idioma).length <= 200);
});
