# Kit Estúdio do Postaí

Vídeos e carrosséis com a cara da sua marca, feitos pelo **seu Claude Code** no seu computador e
mandados direto para o piloto automático do [Postaí](https://postaiapp.web.app), que publica sozinho
no Instagram e no Facebook nos horários que você escolheu.

- Você pede com as suas palavras, o Claude cria com os moldes do kit e mostra a prévia antes.
- Nada de pagar por vídeo: tudo roda no seu computador. Só precisa da assinatura do Claude.
- Voz, legenda animada, 3D e até você falando no vídeo, se o computador aguentar.

## Começar (uma vez só)

O passo a passo com links e comandos para copiar está no Postaí, em **Criar com o Claude**. Em
resumo:

1. **Ferramentas:** assinatura do Claude (Pro ou Max), [Node](https://nodejs.org) (LTS),
   [VS Code](https://code.visualstudio.com), a extensão **Claude Code** e o Claude no Terminal:

   ```console
   npm install -g @anthropic-ai/claude-code
   ```

2. **Conectar o Postaí:** Criar com o Claude > Conectar > Criar chave, e cole o comando que aparece
   no Terminal.
3. **Instalar o kit:** numa conversa nova do Claude, peça **"instala o Kit Estúdio do Postaí"**. Ele
   baixa o kit em `postai-estudio`, na sua pasta pessoal, e instala o que precisa.
4. **Abrir o kit:** no VS Code, **Arquivo > Abrir pasta** e escolha `postai-estudio`. Converse com o
   Claude sempre com essa pasta aberta.
5. **Ensinar a sua marca:**

   > configura a minha marca: o site é minhaloja.com.br

   Ele lê o site e pega as cores, a fonte, o logo, o tom e as fotos dos produtos.

## No dia a dia

Peça com as suas palavras. Alguns exemplos:

| Você quer | Peça |
| --- | --- |
| um vídeo de produto | faz um vídeo do pão de queijo e me mostra antes de mandar |
| um carrossel | faz um carrossel com os 4 bolos mais pedidos |
| ensinar a comprar pelo site | faz um tutorial mostrando como pedir pelo nosso site |
| um vídeo no ritmo de trend | faz um trend com 6 cortes sobre a fornada de sexta |
| um vídeo com voz | faz um vídeo narrado, com o mascote, explicando como pedir pelo site |
| um lançamento em 3D | faz uma vitrine 3D com os 3 produtos mais pedidos |
| você apresentando | faz um vídeo narrado comigo apresentando a novidade (avatar) |
| a semana toda | planeja uma semana de posts, 1 vídeo e 2 carrosséis, e me mostra tudo junto |
| publicar | pode mandar para o Postaí |
| acompanhar | mostra a fila do Postaí e quando cada post sai |
| corrigir um texto | muda a legenda do vídeo do pão de queijo no Postaí para... |

O Claude **sempre mostra a prévia antes** e só manda para a fila quando você disser que pode. Quem
publica é o piloto do Postaí.

**Receber os moldes novos:** peça **"atualiza o Kit Estúdio do Postaí"**. A sua marca, os seus posts,
fotos, músicas, moldes próprios e o que você instalou (voz, avatar) ficam como estão.

## Moldes

| Molde | Formato | Para quê |
| --- | --- | --- |
| Oferta | vídeo, 12 a 16 s | um produto: gancho, foto, nome, preço, benefícios e chamada |
| Lista | vídeo, 2 a 7 itens | dicas, erros, "5 sabores que…" |
| Tutorial | vídeo, 1 a 6 passos | o seu site no celular, rolando, com o dedo tocando |
| AntesDepois | vídeo, ~11 s | transformação: a cortina revela o depois |
| Depoimento | vídeo, 1 a 3 falas | o que clientes disseram, com estrelas (só depoimento real) |
| Trend | vídeo, 3 a 14 cortes | cortes na batida da música, com zoom e clarão |
| Narrado | vídeo, 1 a 12 cenas | voz em português, legenda animada, mascote ou você falando |
| Vitrine3D | vídeo, 1 a 5 produtos | título em letras 3D e produtos em cartões 3D girando |
| Carrossel | fotos 4:5, 2 a 10 | capa, itens com foto e preço, e final |
| Capa | imagem 9:16 | capa do vídeo, feita junto com ele |

Precisa de algo que nenhum molde faz? Peça um vídeo sob medida: o Claude cria um molde só seu em
`src/moldes/meus/`, que as atualizações do kit não mexem.

## O que o seu computador aguenta

Peça **"roda o diagnóstico do kit"** (ou `npm run diagnostico`). Ele mede o computador em 1 ou 2
minutos e diz o que roda bem e quanto tempo leva cada vídeo.

| Recurso | Peso | Precisa |
| --- | --- | --- |
| Moldes, carrossel, Lottie, sons, print do site, fotos livres | leve | qualquer computador com Node |
| Narração com voz e legenda animada | médio | uns 1,3 GB livres; 8 GB de memória é o ideal |
| 3D (Vitrine3D e cenas sob medida) | médio | placa de vídeo razoável (Mac M1 ou mais novo, ou PC com placa dedicada) |
| Avatar falante (você no vídeo) | pesado | placa NVIDIA com 4 GB ou mais (8 GB é bem melhor), Windows ou Linux; uns 7 GB livres. Ainda não roda no Mac |

## Narração com voz

Uma voz em português lê o roteiro, com legenda palavra por palavra e, se quiser, um mascote na cor
da marca falando junto. A voz é gerada no seu computador, sem custo por vídeo.

> instala a narração do kit, com o mascote, e faz um vídeo narrado de 20 segundos explicando como
> pedir pelo nosso site

Por baixo, o Claude roda:

```console
npm run voz:instalar -- --mascote        # uma vez: ~1,2 GB em .voz/
npm run narrar -- conteudo/<peça>.json   # voz, legenda e conferência de cada cena
```

- Vozes: `pf_dora` (feminina), `pm_alex` e `pm_santa` (masculinas).
- Preço, hora, porcentagem, @ e site são lidos por extenso ("R$ 12,90" vira "doze reais e noventa
  centavos"), e a legenda mostra como você escreveu.
- A **conferência** escuta a voz e avisa o que saiu diferente do roteiro. Palavra pronunciada errado
  se ensina em `"pronuncia": { "Kombi": "Cômbi" }`.

## 3D

Títulos com letras em volume na fonte da sua marca, fotos em cartões girando e formas flutuando nas
suas cores.

> faz uma vitrine 3D com os 3 produtos mais pedidos

A fonte 3D é preparada sozinha a partir do `marca/marca.json`. O 3D usa a placa de vídeo: rode o
diagnóstico antes, uma vez, para o kit saber o melhor jeito de desenhar no seu computador.

## Avatar falante

Você aparece no vídeo falando a narração, com a boca sincronizada, em tela cheia ou numa janela no
canto. Grava um vídeo curto uma vez e o Claude faz o resto.

> instala o avatar do kit e me ensina a gravar o vídeo base; depois faz um vídeo narrado comigo
> apresentando a nossa novidade

1. **Instalar** (uma vez, placa NVIDIA): `npm run avatar:instalar` (~7 GB em `.avatar/`).
2. **Gravar o vídeo base** em `public/avatar/base.mp4`: 10 a 20 segundos, celular em pé, de frente,
   boa luz no rosto, fundo simples, boca fechada ou falando pouco, sem cortes e sem nada cobrindo a
   boca.
3. **Fazer o vídeo:** no molde Narrado, `"avatar": "tela"` (você em tela cheia nas cenas sem imagem)
   ou `"avatar": "janela"` (sempre no canto). Depois:

   ```console
   npm run narrar -- conteudo/<peça>.json
   npm run avatar -- conteudo/<peça>.json
   ```

**Só o seu rosto ou o de quem autorizou por escrito.** Nunca de famoso, cliente ou foto da
internet. A voz continua sendo a do kit, não a sua.

## Comandos

```console
npm run previa -- conteudo/<peça>.json          # um quadro de cada cena, para conferir
npm run renderizar -- conteudo/<peça>.json      # vídeo + capa (ou slides) e info.json em out/
npm run capturar-site -- https://site nome      # print do seu site (+ --computador)
npm run buscar-fotos -- --candidatos x="termo"  # fotos livres para uso comercial
npm run lottie                                  # refaz as animações com as cores da marca
npm run diagnostico                             # o que este computador aguenta
npm run voz:instalar [-- --mascote]             # narração (uma vez)
npm run narrar -- conteudo/<peça>.json          # voz e legenda
npm run fonte-3d                                # fonte da marca para o 3D (o renderizar faz sozinho)
npm run avatar:instalar                         # avatar (uma vez, placa NVIDIA)
npm run avatar -- conteudo/<peça>.json          # você falando, cena por cena
npm run dev                                     # Remotion Studio, para ajustar à mão
npm run lint                                    # confere o código
```

## Onde fica cada coisa

```
marca/marca.json        cores, fontes, logo, tom, público e chamada            (seu)
conteudo/               uma peça por arquivo JSON; exemplos em exemplo-*.json  (seu)
public/                 produtos/, fotos/, sites/, musica/, avatar/            (seu)
                        sfx/, trilhas/, exemplos/                              (do kit)
src/nucleo/             marca e curvas de animação
src/componentes/        texto, legendas, mídia, efeitos, áudio, Lottie, 3D, mascote, apresentador
src/moldes/             os moldes do kit; os seus em src/moldes/meus/          (seus)
ferramentas/            renderizar, narrar, avatar, diagnóstico e os instaladores
.claude/skills/         o que o Claude sabe fazer aqui: configurar-marca, criar-post,
                        fazer-video, narrar, avatar, lottie
out/                    os vídeos e imagens prontos                            (seu)
.voz/ .avatar/          o que foi instalado neste computador                   (fora do kit)
```

A atualização do kit troca só o que é do kit. O que está marcado como seu, e o que foi instalado no
computador, fica como está.

## Regras

- **Nada inventado:** preço, horário, promoção e depoimento só do seu site ou do que você disser.
- **Fotos:** as suas, as do seu site ou livres para uso comercial (o `buscar-fotos` só traz essas).
- **Música:** a trilha do kit (feita por código) ou com licença livre para uso comercial em
  `public/musica/`. Música famosa é silenciada ou derrubada pelas redes.
- **Rostos:** no avatar, só o seu ou de quem autorizou.
- **Postaí:** por enquanto publica no Instagram e no Facebook, com até 5 hashtags no Instagram.

## Licenças de terceiros

O kit usa o [Remotion](https://www.remotion.dev) (grátis para pessoas e empresas de até 3 pessoas;
acima disso, veja a [licença](https://www.remotion.dev/license)). O que é instalado à parte, no seu
computador, tem licença livre para uso comercial:

- **Narração:** [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (voz, Apache 2.0) pelo
  [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT),
  [faster-whisper](https://github.com/SYSTRAN/faster-whisper) (MIT),
  [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) (MIT)
- **3D:** [three.js](https://threejs.org) e [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)
  (MIT), [opentype.js](https://github.com/opentypejs/opentype.js) (MIT); fontes do Google Fonts (OFL)
- **Avatar:** [MuseTalk](https://github.com/TMElyralab/MuseTalk) (código e modelo MIT), sd-vae-ft-mse
  (MIT), whisper-tiny (MIT), DWPose (Apache 2.0), face-parsing (MIT), resnet18 (BSD)
- **Python do kit:** [uv](https://github.com/astral-sh/uv) (MIT ou Apache 2.0)
