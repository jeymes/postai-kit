---
name: configurar-marca
description: Monta a marca do Kit Estúdio (marca/marca.json, logo e fotos dos produtos) a partir do site ou do Instagram do dono. Usar na primeira vez, quando o marca.json ainda estiver com "Sua Marca", ou quando o dono pedir para mudar cores, fontes, logo, tom ou a chamada.
---

# Configurar a marca

O resultado é o `marca/marca.json` preenchido, o logo em `public/marca/` e as fotos dos produtos em
`public/produtos/`. Tudo em pt-BR.

## 1. Ler o site

Peça o endereço do site, se o dono ainda não deu. Abra a página inicial e as de produtos ou cardápio
(WebFetch). Anote:

- **nome** da marca, **site** e **@ do Instagram** (costuma estar no rodapé);
- **cores**: a de fundo, a do texto e a de destaque (botões, links). Se o site só tiver preto e
  branco, use a cor principal do logo como destaque;
- **fontes**: compare com as que o kit carrega (`FONTES` em `src/marca.ts`: Bricolage Grotesque,
  DM Serif Display, Inter, Montserrat, Nunito, Playfair Display, Poppins) e escolha a mais parecida
  para o título e para o texto;
- **tom**: como o site fala (formal, divertido, acolhedor) e com quem;
- **chamada**: o que a pessoa deve fazer ("Peça pelo WhatsApp", "Agende pelo link da bio");
- **produtos**: nome, preço (só se estiver escrito) e o endereço da foto.

## 2. Baixar o logo e as fotos

Só do próprio site do dono (ou do que ele mandar):

```bash
curl -L -o public/marca/logo.png "<url do logo>"
curl -L -o public/produtos/<nome-curto>.jpg "<url da foto>"
```

Se o logo vier em SVG, pode usar o SVG mesmo (`logo.svg`). Olhe cada imagem baixada (Read) para
conferir que é a certa e que não está cortada. Se o logo for branco, ele some no fundo claro: avise
e use o nome da marca no lugar (`"logo": null`).

## 3. Gravar o marca.json

```json
{
  "nome": "...", "site": "...", "instagram": "@...",
  "cores": { "fundo": "#...", "superficie": "#FFFFFF", "texto": "#...", "textoSuave": "#...",
             "destaque": "#...", "textoNoDestaque": "#FFFFFF" },
  "fontes": { "titulo": "...", "texto": "..." },
  "logo": "marca/logo.png",
  "tom": "...", "publico": "...", "chamada": "..."
}
```

Confira o contraste: o texto precisa ler bem no fundo, e o `textoNoDestaque` precisa ler bem na cor
de destaque (branco num destaque escuro, quase preto num destaque claro).

## 4. Animações e print do site

```bash
npm run lottie                                          # animações nas cores novas
npm run capturar-site -- https://<site do dono> inicio  # print para o molde Tutorial
```

Olhe o print (`public/sites/inicio.png`): se vier um aviso de cookies cobrindo a página, avise o dono.

## 5. Mostrar

Rode `npm run renderizar -- conteudo/exemplo-carrossel.json`, olhe os slides em
`out/exemplo-carrossel/` e mostre ao dono. Pergunte se as cores e o jeito de falar estão certos.
Guarde a lista de produtos encontrados numa nota para o dono (não precisa de arquivo novo): ela vira
as primeiras ideias de post.
