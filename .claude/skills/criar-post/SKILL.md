---
name: criar-post
description: Cria um vídeo ou carrossel com os moldes do Kit Estúdio, mostra ao dono e, depois de aprovado, manda para a fila do Postaí pelo conector. Usar sempre que o dono pedir um post, vídeo, reels, carrossel, ideias de post ou "uma semana de posts", e quando pedir para mandar algo para o Postaí.
---

# Criar um post e mandar para o Postaí

Tudo em pt-BR. Se o `marca/marca.json` ainda estiver com "Sua Marca", rode antes a skill
`configurar-marca`.

## 1. Escolher o molde e escrever

| O dono quer… | Molde |
| --- | --- |
| mostrar um produto, uma promoção, um lançamento | `Oferta` (vídeo) |
| dicas, erros, "os 5 mais…" | `Lista` (vídeo) |
| ensinar a pedir, agendar ou comprar pelo site | `Tutorial` (vídeo; antes, `npm run capturar-site`) |
| mostrar uma transformação (reforma, cabelo, limpeza) | `AntesDepois` (vídeo) |
| mostrar o que clientes disseram | `Depoimento` (vídeo; só depoimento real e autorizado) |
| algo rápido e no ritmo, para viralizar | `Trend` (vídeo, cortes na batida) |
| um lançamento ou vitrine com cara de marca grande, em 3D | `Vitrine3D` (vídeo; antes, uma vez, `npm run diagnostico`) |
| uma voz contando, com legenda animada (e o mascote) | `Narrado` (vídeo; siga a skill `narrar`) |
| vários produtos, um cardápio, uma lista para salvar | `Carrossel` (fotos) |

Se nenhum serve, use a skill `fazer-video`.

Escreva no tom do `marca.json`:

- **gancho**: o primeiro segundo decide. Uma dor ou vontade do público, em até 8 palavras
  ("Sexta sem pão de queijo quentinho?"). Marque 1 a 3 palavras em `destaqueGancho`.
- Frases curtas: título de item com até umas 6 palavras, texto de apoio com uma frase.
- **Nada inventado** (preço, horário, promoção): só o que está no site ou o que o dono disse.
- **post.legenda**: 1 a 3 frases, a chamada e até 5 hashtags (o Instagram aceita no máximo 5).
- **post.titulo**: curto, só para o dono achar o post no app.

Fotos: as do dono em `public/produtos/`; sem foto, `npm run buscar-fotos` (CC0) e olhe as opções
antes de escolher. No Tutorial, o `capturar-site` informa o `print` e a `proporcao`; para achar a
`rolagem` (0 a 1) e o `toque` de cada passo, olhe o print.

Grave em `conteudo/<data>-<tema>.json` (ex.: `conteudo/2026-10-27-pao-de-queijo.json`), no formato
dos `conteudo/exemplo-*.json`: `molde`, os campos do molde, `post` e, no vídeo, `capa` (opcional:
sem ela, a capa usa o gancho e a foto do produto).

## 2. Mostrar antes de qualquer coisa

```bash
npm run previa -- conteudo/<nome>.json
```

Olhe cada imagem em `out/<nome>/` (Read). Confira: texto cortado ou grande demais, foto errada,
contraste ruim. Corrija e rode de novo. Depois mostre ao dono os caminhos das imagens e a legenda, e
**espere a aprovação**. Com uma semana de posts, mostre todos juntos.

## 3. Gerar o final

```bash
npm run renderizar -- conteudo/<nome>.json
```

O `out/<nome>/info.json` traz o que o Postaí pede: cada arquivo com tipo e tamanho em bytes, a
duração do vídeo (`duracaoSeg`) e o `post`.

## 4. Mandar para o Postaí (só com o "pode mandar" do dono)

1. `pedir_envio`:
   - vídeo: `{ formato: "video", video: { tamanho }, capa: { tamanho, tipo: "image/jpeg" } }`;
   - carrossel: `{ formato: "fotos", fotos: [tamanho do slide 1, tamanho do slide 2, ...] }`, na ordem.
2. Rode cada comando `curl` que ele devolve, trocando o nome em maiúsculas pelo caminho do arquivo
   (`out/<nome>/video.mp4`, `out/<nome>/capa.jpg`, `out/<nome>/slide-01.jpg`...). Os links valem 1 hora.
3. `por_na_fila` com o `envioId`, `titulo` e `legenda` do `post` e, no vídeo, `duracaoSeg`. Para uma
   rede só, passe `redes: ["instagram"]` ou `["facebook"]`.
4. `ver_fila` e diga ao dono quando o post sai.

Se o Postaí recusar (legenda grande, hashtags demais, Reels longo para o Facebook), a mensagem diz o
motivo: corrija e mande de novo com um `pedir_envio` novo. Se as ferramentas `postai` não existirem
nesta conversa, o conector não está ligado: mande o dono para Postaí > Configurações > Conectar ao
Claude e peça para abrir uma conversa nova depois.
