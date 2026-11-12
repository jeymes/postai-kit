# Kit Estúdio do Postaí

Projeto de vídeos e carrosséis de **uma marca** (a do dono desta pasta), feitos em Remotion. O Claude
cria as peças com os moldes e componentes daqui e manda para a fila do piloto automático do Postaí
pelo conector `postai` (ferramentas `ver_contas`, `ver_fila`, `pedir_envio`, `por_na_fila`,
`tirar_da_fila`, `instalar_kit`).

Converse e escreva em **português do Brasil**, com frases simples: quem usa nem sempre é programador.

## Como o trabalho anda

1. **Marca** (`marca/marca.json`): se ainda estiver com "Sua Marca", use a skill `configurar-marca`
   antes de qualquer peça.
2. **Post comum**: skill `criar-post`. Cada peça é um arquivo `conteudo/<data>-<tema>.json` com o
   molde e os textos; nada de código novo.
3. **Vídeo narrado** (voz, legenda animada, mascote): skill `narrar`. Com a pessoa falando (placa
   NVIDIA): skill `avatar`.
4. **Vídeo sob medida** (cena própria, animação nova, roteiro que nenhum molde faz): skill
   `fazer-video`. Plano primeiro, código depois.
5. **Mostrar antes**: `npm run previa`, olhar as imagens e mostrar ao dono. Só renderizar o final
   depois que ele aprovar.
6. **Mandar para o Postaí**: só quando o dono disser que pode (o piloto publica sozinho).

## Onde fica cada coisa

```
marca/marca.json          cores, fontes, logo, tom, público e chamada (do dono)
conteudo/                 uma peça por arquivo JSON (do dono); exemplos em exemplo-*.json
public/                   marca/ (logo), produtos/, fotos/, sites/, musica/ (do dono)
                          sfx/ (efeitos sonoros do kit), exemplos/
src/nucleo/               marca.ts (lê o marca.json e carrega as fontes), animacao.ts (curvas)
src/componentes/
  texto/Texto             título que entra palavra a palavra, com trecho em destaque
  texto/Legendas          legenda da narração, com a palavra falada em destaque
  personagens/Mascote     mascote na cor da marca que fala junto com a narração
  personagens/Apresentador a pessoa falando (vídeo do npm run avatar)
  3d/                     Palco3D (câmera e luzes), Titulo3D (letras com volume na fonte da
                          marca), Cartao3D (foto num cartão girando), Formas3D (formas ao fundo)
  base                    Fundo, Foto, Assinatura (logo), Selo (preço), arquivo()
  cenas/ChamadaFinal      última cena: logo, chamada e @ ou site
  midia/                  Celular, Navegador, Rolagem (print de site rolando), QrAnimado
  efeitos/                Toque (dedo com som), Flash
  audio/Som               Som (efeitos de public/sfx) e Musica (trilha que baixa no fim)
  lottie/Animacao         sucesso, confete, estrelas, curtida, seta (nas cores da marca)
src/moldes/               um arquivo por molde + tempos.ts (duração de cada cena)
ferramentas/              renderizar, capturar-site, buscar-fotos, narrar, fonte-3d, diagnostico,
                          lottie/, voz/
.voz/                     voz instalada neste computador (npm run voz:instalar; fora do kit)
.avatar/                  avatar instalado neste computador (npm run avatar:instalar; fora do kit)
public/avatar/            vídeo base da pessoa para o avatar (do dono)
public/narracao/          áudio das narrações (do dono)
```

## Moldes

| Molde | Formato | Para quê |
| --- | --- | --- |
| `Oferta` | vídeo, 12 a 16 s | um produto: gancho, foto, nome, preço, até 3 benefícios, chamada |
| `Lista` | vídeo, 2 a 7 itens | dicas, erros, "5 sabores que…" |
| `Tutorial` | vídeo, 1 a 6 passos | o site do cliente no celular, rolando, com o dedo tocando: "como pedir", "como agendar" |
| `AntesDepois` | vídeo, ~11 s | transformação: cortina revela a foto do depois |
| `Depoimento` | vídeo, 1 a 3 falas | o que clientes disseram, com estrelas (só depoimento real e autorizado) |
| `Trend` | vídeo, 3 a 14 cortes | cortes na batida da música, zoom e clarão em cada corte |
| `Narrado` | vídeo, 1 a 12 cenas | uma voz lê a `fala` de cada cena, com legenda animada e mascote opcional; cada cena dura o tempo da fala |
| `Vitrine3D` | vídeo, 1 a 5 produtos | título em letras 3D e cada produto num cartão 3D girando, com nome e preço |
| `Carrossel` | fotos 4:5, 2 a 10 | capa, itens (com foto e preço opcionais) e final |
| `Capa` | imagem 9:16 | capa do vídeo, gerada junto com ele |

O formato de cada um está no `schema` do arquivo do molde; os valores padrão (efeitos ligados, bpm,
fundo) entram sozinhos. Exemplos prontos em `conteudo/exemplo-*.json`.

## Comandos

```bash
npm run previa -- conteudo/<nome>.json        # um quadro de cada cena, em out/<nome>/
npm run renderizar -- conteudo/<nome>.json    # vídeo + capa (ou slides) e info.json
npm run capturar-site -- https://site nome    # print da página inteira em public/sites/ (+ --computador)
npm run buscar-fotos -- --candidatos x="termo em inglês"   # fotos CC0 em public/fotos/
npm run voz:instalar [-- --mascote]           # instala a narração neste computador (uma vez, ~1,2 GB)
npm run narrar -- conteudo/<nome>.json        # voz, legenda e conferência das cenas com "fala"
npm run avatar:instalar                       # avatar falante (placa NVIDIA; uma vez, ~7 GB)
npm run avatar -- conteudo/<nome>.json        # a pessoa falando, cena por cena (depois do narrar)
npm run lottie                                # refaz as animações com as cores da marca
npm run fonte-3d                              # fonte da marca para o 3D (o renderizar faz sozinho)
npm run diagnostico                           # o que este computador aguenta (3D, voz, avatar) e o tempo de cada vídeo
npm run dev                                   # Remotion Studio, para ajustar à mão
npm run lint                                  # confere o código
```

## 3D

O 3D usa a placa de vídeo e pesa mais. Antes do primeiro vídeo 3D num computador, rode
`npm run diagnostico`: ele mede o tempo e guarda em `.estudio.json` o jeito de desenhar que funcionou
(o renderizar usa). Se o diagnóstico disser que o 3D não roda, use os outros moldes. Num molde seu
com 3D, use os componentes de `src/componentes/3d/` dentro de um `<Palco3D>`; foto e fonte carregam
pelos hooks de `3d/carregar.ts` (sem eles, o 3D sai vazio no vídeo).

## Regras

- **Nada inventado**: preço, horário, endereço, promoção e depoimento só se estiverem no site ou forem
  ditos pelo dono. Na dúvida, deixe de fora.
- **Fotos**: do próprio site ou redes do dono, das que ele mandar, ou CC0 pelo `buscar-fotos`. Nunca de
  outras lojas, do Google Imagens ou de bancos sem licença livre.
- **Música**: a `trilhas/batida-129bpm.mp3` do kit (feita por código, sem crédito) ou com licença livre
  para uso comercial que o dono colocou em `public/musica/`. Sem música é melhor que música protegida.
- **Sites**: só capture o site do dono (ou com permissão dele).
- **Postaí**: por enquanto publica só no Instagram e no Facebook. Fotos e capa vão em JPEG (os arquivos
  de `out/` já saem assim). A legenda tem até 2200 caracteres e no máximo 5 hashtags.
- **O que é do dono** e nunca é trocado numa atualização do kit (`instalar_kit` com `atualizar: true`):
  `marca/`, `conteudo/`, `public/marca/`, `public/produtos/`, `public/fotos/`, `public/sites/`,
  `public/musica/`, `src/moldes/meus/` e `out/`; também `.voz/`, `.avatar/`, `public/avatar/` e
  `public/narracao/`, que não vêm no kit.
- **Avatar**: só o rosto do dono ou de quem autorizou. Nunca de famoso, cliente ou foto da internet. Moldes criados para a marca vão em
  `src/moldes/meus/`, registrados no `index.tsx` e no `tempos.ts` de lá: nunca no `src/Root.tsx`, que
  é do kit e é trocado nas atualizações.
