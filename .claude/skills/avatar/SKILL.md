---
name: avatar
description: Avatar falante no Kit Estúdio: a pessoa da marca aparece falando a narração do vídeo, com a boca sincronizada (MuseTalk), a partir de um vídeo curto dela gravado uma vez. Só em computador com placa NVIDIA. Usar quando o dono pedir avatar, "eu falando no vídeo", apresentador, rosto falando ou vídeo estilo HeyGen, mesmo sem citar a skill.
---

# Avatar falante

Tudo em pt-BR. O MuseTalk (código e modelo MIT, uso comercial liberado) não inventa uma pessoa: ele
pega um **vídeo curto de alguém de verdade** e mexe a boca no ritmo da narração do kit. Junto com o
molde `Narrado`, a pessoa aparece em tela cheia ou numa janela no canto.

## 0. Antes de tudo: pode usar esse rosto?

- Só o rosto do **dono** ou de alguém que **autorizou por escrito** (funcionário, sócio). Nunca de
  famoso, cliente ou pessoa de foto da internet, nem para fingir que alguém disse o que não disse.
- Se a pessoa não for o dono, pergunte se ele tem a autorização antes de seguir.

## 1. O computador aguenta?

Rode `npm run diagnostico` e veja a linha do avatar. Precisa de **placa NVIDIA com 4 GB ou mais**
(Windows ou Linux); com 8 GB fica bem mais rápido. **No Mac ainda não roda**: ofereça o mascote da
narração (skill `narrar`).

## 2. Instalar (só na primeira vez)

Avise o dono antes: baixa uns **7 GB** e leva de 20 a 40 minutos. Com o ok:

```bash
npm run avatar:instalar
```

Ele confere a placa, baixa o MuseTalk numa versão fixa, cria um Python só para ele (pelo `uv`),
instala o PyTorch com CUDA, os pacotes da OpenMMLab e os modelos, e testa. Se falhar:

- falta o `uv`: o comando diz como instalar;
- erro no `mim install mmcv`: confira se o driver da NVIDIA está atualizado (`nvidia-smi` mostra
  "CUDA Version" 11.8 ou mais). Depois apague a pasta `.avatar/python` e rode de novo;
- erro ao baixar o `79999_iter.pth` (Google Drive): espere uns minutos e rode de novo (só baixa o
  que falta).

## 3. Gravar o vídeo base (uma vez por pessoa)

Peça ao dono um vídeo em **`public/avatar/base.mp4`**:

- 10 a 20 segundos, celular em pé (vertical), de frente, rosto inteiro e o peito aparecendo;
- luz boa no rosto (de frente para a janela), fundo simples;
- **boca fechada ou falando pouco**, piscando e mexendo a cabeça de leve, sem as mãos na frente do
  rosto e sem cortes;
- sem óculos escuros nem cabelo cobrindo a boca.

Outra pessoa ou outro vídeo: grave em `public/avatar/<nome>.mp4` e use `"avatarVideo":
"avatar/<nome>.mp4"` no conteúdo.

## 4. Fazer o vídeo

1. Escreva o roteiro no molde `Narrado` (skill `narrar`) e acrescente `"avatar": "tela"` (a pessoa
   em tela cheia nas cenas sem imagem e na janela nas outras) ou `"avatar": "janela"` (sempre no
   canto). Com avatar, o mascote não aparece.
2. `npm run narrar -- conteudo/<nome>.json` (a voz e a legenda).
3. `npm run avatar -- conteudo/<nome>.json`: gera a pessoa falando, cena por cena, em
   `public/narracao/<nome>/`. Na primeira vez ele estuda o rosto (demora mais). Mudou a fala? Rode
   `narrar` e depois `avatar` de novo: só refaz o que mudou.
4. `npm run previa`, olhe as imagens (Read): a boca encaixou? o rosto ficou borrado? Mostre ao dono
   e espere a aprovação. Depois `npm run renderizar` e siga a skill `criar-post`.

A voz continua sendo a do kit (Kokoro), não a da pessoa: deixe isso claro para o dono.
