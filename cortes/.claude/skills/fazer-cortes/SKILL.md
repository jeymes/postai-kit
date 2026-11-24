---
name: fazer-cortes
description: Transforma os vídeos pedidos no menu Cortes do Postaí ou postos em entrada/ em cortes verticais com legenda e manda cada um para aprovação. Usar quando a pessoa pedir para fazer cortes, processar os vídeos, encher a fila ou ver o que falta, mesmo sem citar a skill.
---

# Fazer cortes

Responder em pt-BR. Seguir na ordem.

**Na rotina (nuvem do Claude) ninguém está olhando: nunca pergunte nada nem espere resposta.** Decida sozinho o que achar melhor (quantos cortes, quais trechos, enquadramento) e siga. Se um passo falhar, tente resolver por uns 15 minutos sem mudar o código da fábrica; se não der, `npm run marcar -- <pedidoId> erro "<o problema em palavras simples>"` e passe para o próximo vídeo. Só pergunte quando a pessoa estiver conversando com você no computador dela.

**Conte o andamento:** os comandos já avisam sozinhos (baixando, transcrevendo, montando cada corte, mandando). Quando você mesmo decidir algo importante ou mudar de plano, avise também: `npm run marcar -- <pedidoId> processando "<o que está fazendo, em até 20 palavras>"`. Isso aparece com a hora na tela Cortes do Postaí.

Use só os comandos `npm run` desta pasta (a chave do `.env`). Nunca as ferramentas `mcp__postai__*`: podem ser de outra conta do Postaí. Se faltar o `.env` ou o `npm run instalar`, use a ferramenta `instalar_cortes` do conector.

## 1. Buscar os pedidos e ver o que tem

`npm run buscar` baixa os vídeos pedidos por link no menu Cortes do Postaí (se algum link falhar, ele avisa no app sozinho). Os vídeos que a pessoa pôs à mão em `entrada/` já estão lá. Depois, `npm run estado -- --fila`.

## 2. Transcrever

`npm run transcrever` (todos os novos). Um vídeo de 1 hora leva uns 10 a 20 minutos num computador comum com o modelo `small`. Rode em segundo plano se for longo.

## 3. Escolher os cortes

Leia o `trabalho/<id>/transcricao.txt` inteiro e escreva o `trabalho/<id>/cortes.json`:

```json
{
  "enquadramento": "desfocado",
  "cortes": [
    {
      "inicio": 62.5,
      "fim": 118.0,
      "gancho": "Ele largou tudo com 40 anos",
      "titulo": "Largou o emprego aos 40. Olha no que deu",
      "legenda": "Você teria coragem? 👀\n\n#mudancadecarreira #podcast #cortes"
    }
  ]
}
```

Se a transcrição começar com **PEDIDO DO POSTAÍ**, siga o que ele diz (ex.: shorts do vídeo longo do Canal dark: um vídeo narrado sobre imagens, deitado; você escolhe quantos cortes valem a pena). Ele vale mais que as regras abaixo quando se chocam.

O que faz um bom corte:
- **De 20 a 45 segundos** (aceita de 10 a 90). Corte curto é assistido mais vezes até o fim, e é isso que faz a rede mostrar para mais gente. Só passe de 45 s se a história precisar. Se o dono ligou a chamada do fim no Postaí, o `cortar` acrescenta sozinho um cartão de 3,5 s (então o trecho vai até 86,5 s). Não escreva a chamada no gancho nem na legenda. Um assunto só, que se entende sem o resto do vídeo.
- **Começa no impacto:** o primeiro segundo já é a frase que prende (uma pergunta, uma revelação, uma opinião forte, um número). Nunca comece pela cena montando o contexto: se a frase forte vem depois de 5 s de conversa, comece nela. Corte o "então, é..." do começo. Use o tempo de início da frase, uns 0,2 s antes.
- **Termina fechado:** no fim de uma frase, de preferência numa conclusão. Nunca no meio da palavra.
- **De 3 a 6 cortes por vídeo de 1 hora**, os melhores, sem repetir assunto. Prefira poucos e bons.
- **Gancho:** até 40 caracteres (o máximo é 70), a promessa do corte, sem entregar o final. Fica no topo do vídeo o tempo todo e é o que segura quem está rolando o feed.
- **Título:** até 60 caracteres (o máximo é 100), sem `<` nem `>`, com o mais forte nas **primeiras palavras**, porque o Shorts e o Reels mostram só o começo. Ex.: "Só Deus poderia curá-la. E Ele estava ali", e não "Somente Deus poderia curá-la. E aqui está o Senhor: a emoção de Nicodemos".
- **Legenda:** uma pergunta que se responde com uma palavra ("Você crê? Comente amém") e no máximo 3 hashtags, com pelo menos 1 do assunto do corte (#salomão, #provérbios, #carreira), nunca só as gerais (#fé, #reflexão).
- **Dúvida (opcional):** se ficou algo que você não conseguiu resolver (a fala termina cortada, um trecho pode ofender, o rosto sai do quadro), ponha `"duvida": "<o que conferir>"` no corte. Ele espera o dono aprovar, mesmo com a aprovação automática ligada.
- **Enquadramento:** `desfocado` (o vídeo inteiro no meio, com fundo desfocado) serve para qualquer vídeo. Use `centro` com `"foco"` de 0 a 1 só quando uma pessoa fala sozinha e sempre no mesmo lugar da tela (0,5 = no meio).

## 4. Conferir e renderizar

`npm run previa -- trabalho/<id>` e olhe cada `cortes/NN/previa.jpg` (Read). Confira se o gancho cabe, se a legenda não cobre o rosto e se, no `centro`, a pessoa ficou no quadro (ajuste o `foco`). Depois `npm run cortar -- trabalho/<id>`. Um corte de 1 minuto leva uns 3 a 4 minutos.

## 5. Mandar

`npm run enviar -- trabalho/<id>`. Os cortes vão para o menu Cortes, esperando aprovação (e o pedido, se veio de um link, fica "Pronto"). Se um vídeo de link der erro no meio (transcrição, corte) e não se resolver, marque: `npm run marcar -- <pedidoId> erro "o que houve"`.

## 6. Resumir

Diga quantos cortes foram para aprovação, os títulos, e lembre de aprovar no menu Cortes do Postaí. Diga até que dia a fila tem posts (`npm run estado -- --fila`). Se a fila tiver menos de 7 dias, sugira pedir mais vídeos.
