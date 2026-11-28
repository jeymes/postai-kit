// Testes da tabela de vozes do Google: node --test src/componentes/personagens/vozesGoogle.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { VOZES } from "./vozes.ts";
import { PADRAO_FEMININA, PADRAO_MASCULINA, RECOMENDADA_DO_KOKORO, recomendarVozGoogle, VOZES_GOOGLE, VOZES_GOOGLE_DO_ELENCO, vozGoogleValida, outroMotor } from "./vozesGoogle.ts";

test("as 30 vozes do Google: 14 femininas e 16 masculinas", () => {
  const nomes = Object.keys(VOZES_GOOGLE);
  assert.equal(nomes.length, 30);
  assert.equal(nomes.filter((n) => VOZES_GOOGLE[n].genero === "feminina").length, 14);
  assert.equal(nomes.filter((n) => VOZES_GOOGLE[n].genero === "masculina").length, 16);
  for (const n of nomes) assert.ok(VOZES_GOOGLE[n].descricao.length > 0);
});

test("toda voz do catálogo do Kokoro tem recomendada do mesmo gênero", () => {
  for (const id of Object.keys(VOZES)) {
    const google = RECOMENDADA_DO_KOKORO[id];
    assert.ok(google, `${id} sem recomendada`);
    assert.ok(VOZES_GOOGLE[google], `${id} → ${google} não é voz do Google`);
    assert.equal(VOZES_GOOGLE[google].genero, id.startsWith("feminina") ? "feminina" : "masculina", id);
  }
  assert.equal(Object.keys(RECOMENDADA_DO_KOKORO).length, Object.keys(VOZES).length);
});

test("recomendarVozGoogle", () => {
  // O nome do Google vale como está (sem ligar para maiúscula)
  assert.equal(recomendarVozGoogle("charon"), "Charon");
  assert.equal(recomendarVozGoogle("Puck"), "Puck");
  // O id do catálogo
  assert.equal(recomendarVozGoogle("masculina-4"), "Charon");
  assert.equal(recomendarVozGoogle("feminina-1"), "Laomedeia");
  // A voz crua do Kokoro: a do catálogo com ela, ou o gênero pela primeira voz
  assert.equal(recomendarVozGoogle("pm_santa"), RECOMENDADA_DO_KOKORO["masculina-2"]);
  assert.equal(recomendarVozGoogle("pf_dora*0.5+af_heart*0.5"), RECOMENDADA_DO_KOKORO["feminina-4"]);
  assert.equal(recomendarVozGoogle("am_adam"), PADRAO_MASCULINA);
  assert.equal(recomendarVozGoogle("bf_emma*0.7+af_sky*0.3"), PADRAO_FEMININA);
  // Sem pista: a padrão pedida
  assert.equal(recomendarVozGoogle(undefined, "Charon"), "Charon");
  assert.equal(recomendarVozGoogle("qualquer"), PADRAO_FEMININA);
  assert.equal(recomendarVozGoogle(null, "não existe"), PADRAO_FEMININA);
});

test("a Bia e a Lu ganham vozes femininas", () => {
  for (const id of ["noiva", "organizadora"]) assert.equal(VOZES_GOOGLE[VOZES_GOOGLE_DO_ELENCO[id]].genero, "feminina");
});

test("vozGoogleValida e outroMotor", () => {
  assert.equal(vozGoogleValida(" kore "), "Kore");
  assert.equal(vozGoogleValida("pf_dora"), undefined);
  assert.equal(vozGoogleValida(""), undefined);
  assert.equal(outroMotor("gemini"), "chirp");
  assert.equal(outroMotor("chirp"), "gemini");
});
