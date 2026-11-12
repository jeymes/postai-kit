---
name: fazer-video
description: Roteiro para um vídeo sob medida no Kit Estúdio, quando nenhum molde pronto serve (cena própria, animação nova, roteiro com várias partes, molde novo). Junta as ferramentas do kit (celular com o site, toques, Lottie, sons, trilha, cortes na batida, fotos CC0). Usar quando o dono pedir algo diferente dos moldes, "um vídeo como os de marca grande", ou um molde novo, mesmo sem citar a skill.
---

# Fazer um vídeo sob medida

Tudo em pt-BR. Vídeo 1080×1920, 30 quadros por segundo, em Remotion. Para um post comum, use a skill
`criar-post`; esta é para o que os moldes não fazem.

## 1. Antes de tudo

1. Leia o `marca/marca.json` (tom, público, chamada) e o `CLAUDE.md` (componentes e regras).
2. Pergunte o que o dono quer que a pessoa sinta ou faça no fim. Um vídeo, uma ideia.
3. O **primeiro segundo** decide: comece pela dor ou pela vontade do público, nunca pelo logo.

## 2. Plano primeiro, sem código

Mostre o plano e **espere o dono aprovar**:

- cenas com tempo (em segundos) e o que aparece em cada uma;
- texto de cada cena (curto: o vídeo é visto sem som na maioria das vezes);
- o que entra de cada ferramenta da seção 3 e por quê;
- de onde vêm as fotos e prints (site do dono, fotos dele, CC0);
- música e efeitos.

## 3. Ferramentas do kit

| Ferramenta | Para quê | Onde |
| --- | --- | --- |
| Site do cliente no celular ou navegador | mostrar como pedir, agendar, comprar | `npm run capturar-site`, `Celular`, `Navegador`, `Rolagem` |
| Dedo tocando | guiar o olhar, com som de toque | `efeitos/Toque` |
| Texto que entra palavra a palavra | títulos e frases | `texto/Texto` (com `destaque`) |
| Lottie nas cores da marca | sucesso, confete, estrelas, curtida, seta | `lottie/Animacao`; animação nova: skill `lottie` |
| Efeitos sonoros | toque, transição, sucesso, moeda, impacto, sininho, fogos... | `audio/Som` (lista em `SONS`) |
| Trilha | batida a 129,2 bpm feita por código | `audio/Musica`, `public/trilhas/batida-129bpm.mp3` |
| Cortes na batida | ritmo de trend | `quadrosPorBatida(bpm)` em `moldes/tempos.ts`, `efeitos/Flash` |
| QR do site | chamada final | `midia/QrAnimado` |
| Fotos CC0 | quando o dono não tem foto | `npm run buscar-fotos` (olhe as opções antes de escolher) |
| Transições do Remotion | troca de cena com fade, slide, wipe | `@remotion/transitions` (já instalado) |
| Narração e legenda animada | voz em português, legenda palavra por palavra | skill `narrar`; `texto/Legendas`, áudio de `npm run narrar` |
| Mascote que fala | personagem na cor da marca, boca no tempo da voz | `personagens/Mascote` |
| 3D | título com volume, foto em cartão girando, formas ao fundo | `3d/` (`Palco3D`, `Titulo3D`, `Cartao3D`, `Formas3D`); antes, `npm run diagnostico` |
| Pessoa falando | o dono apresentando, com a boca no tempo da voz (placa NVIDIA) | skill `avatar`; `personagens/Apresentador` |

Para regras gerais do Remotion, use a skill `remotion-best-practices`, se estiver instalada
(`npx remotion skills add`).

## 4. Montar

1. Molde novo em `src/moldes/meus/<Nome>.tsx`, com `schema` (zod) e um exemplo, seguindo os moldes
   do kit. Registre a `<Composition>` em `src/moldes/meus/index.tsx` (com o `calculateMetadata` que
   passa o conteúdo pelo schema, como no `src/Root.tsx`) e a duração das cenas em
   `src/moldes/meus/tempos.ts`. Nunca mexa no `src/Root.tsx` nem nos moldes do kit: são trocados nas
   atualizações.
2. O conteúdo vai num `conteudo/<data>-<tema>.json`, como os outros. Para narrar um molde seu, dê a
   ele `cenas[]` com `fala` e `narracao` (como no `src/moldes/Narrado.tsx`): o `npm run narrar`
   funciona igual.
3. Movimento discreto e com propósito: entrada suave, um destaque por cena. Texto com no mínimo 44 px
   (apoio) e 84 px (título). O que importa fica no meio da tela (a grade do perfil corta as bordas).
4. `npm run lint`.

## 5. Mostrar e renderizar

1. `npm run previa -- conteudo/<nome>.json` e olhe cada imagem (Read). Corrija texto cortado,
   contraste ruim, foto errada.
2. Mostre ao dono e espere a aprovação. Para ver o movimento, `npm run dev` abre o Studio.
3. `npm run renderizar -- conteudo/<nome>.json`. Depois, se o dono quiser, mande para o Postaí como na
   skill `criar-post` (seção 4).
