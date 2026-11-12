---
name: narrar
description: Vídeo com narração no Kit Estúdio: uma voz em português lê o roteiro, com legenda animada palavra por palavra e, se o dono quiser, o mascote da marca falando junto (molde Narrado). Instala a voz no computador na primeira vez. Usar quando o dono pedir vídeo narrado, com voz, locução, "alguém falando", legenda animada ou mascote, mesmo sem citar a skill.
---

# Vídeo narrado

Tudo em pt-BR. A voz é gerada no computador do dono, sem custo por vídeo: Kokoro (voz, Apache 2.0),
faster-whisper (confere a fala e dá o tempo da legenda, MIT) e, para o mascote, o Rhubarb (boca, MIT).

## 1. Instalar (só na primeira vez)

Se não existir a pasta `.voz/python`, avise o dono antes: baixa uns **1,2 GB** e leva alguns minutos.
Com o ok dele:

```bash
npm run voz:instalar               # voz e legendas
npm run voz:instalar -- --mascote  # + boca exata do mascote (mais uns 90 MB)
```

Se faltar o `uv`, o comando diz como instalar (uma linha no terminal). Instale, peça para o dono
**fechar e abrir o terminal** se o `uv` ainda não for achado, e rode de novo. Precisa de uns 8 GB de
memória; em computador mais fraco funciona, só demora mais.

## 2. Roteiro

Molde `Narrado` (exemplo em `conteudo/exemplo-narrado.json`). Cada cena tem:

- `fala`: o que a voz diz. **1 ou 2 frases curtas**, como se fala, não como se escreve. A primeira
  cena é o gancho (dor ou vontade do público). O vídeo inteiro com 15 a 40 s de fala.
- na tela, um destes (ou nada, e a legenda fica grande no meio): `titulo` (+ `destaque`), `foto`,
  `print` + `proporcao` + `rolagem` (o site no celular; ver `npm run capturar-site`), `animacao`
  (sucesso, confete, estrelas, curtida, seta).

No topo: `voz` (`pf_dora` feminina; `pm_alex` ou `pm_santa` masculinas), `velocidade` (1 = normal),
`mascote` (true/false), `avatar` (`"tela"` ou `"janela"`: a pessoa falando, ver a skill `avatar`), `legendas` (true), `chamada`, `musica` (fica baixinha) e `post`.

Pode escrever preço, hora, porcentagem, @ e site normalmente ("R$ 12,90", "das 8h às 18h", "50%",
"@marca", "marca.com.br"): o `narrar` lê por extenso, e a legenda mostra como você escreveu.
**Nada inventado**: preço e horário só do site ou do que o dono disse.

## 3. Narrar e conferir

```bash
npm run narrar -- conteudo/<nome>.json
```

Gera o áudio de cada cena em `public/narracao/<nome>/` e grava a legenda e a duração no próprio JSON
(em `narracao` de cada cena: não edite à mão). Mudou uma fala? Rode de novo: só refaz o que mudou.

No fim aparece a **conferência**: o que o Whisper ouviu diferente do roteiro. Para cada aviso:

- pronúncia errada de verdade (nome da marca, palavra estrangeira): ensine em `pronuncia`, escrevendo
  como se fala, ex.: `"pronuncia": { "Kombi": "Cômbi", "delivery": "delivéri" }`, e narre de novo;
- diferença só de escrita (número, sotaque, plural): pode ignorar.

## 4. Mostrar e renderizar

1. `npm run previa -- conteudo/<nome>.json` e olhe as imagens (Read): legenda cortada, título
   brigando com a legenda, mascote cobrindo algo.
2. Mostre ao dono e diga que a voz só dá para ouvir no vídeo final (ou no `npm run dev`). Pergunte se
   quer ouvir antes: o áudio de cada cena está em `public/narracao/<nome>/`.
3. `npm run renderizar -- conteudo/<nome>.json`, e o envio para o Postaí segue a skill `criar-post`
   (seção 4).
