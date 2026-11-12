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
      "titulo": "Ele largou o emprego com 40 anos e olha no que deu",
      "legenda": "Você teria coragem? 👀\n\n#podcast #carreira #cortes"
    }
  ]
}
```

O que faz um bom corte:
- **De 30 a 60 segundos** (aceita de 10 a 90). Se o dono ligou a chamada do fim no Postaí, o `cortar` acrescenta sozinho um cartão de 3,5 s (então o trecho vai até 86,5 s). Não escreva a chamada no gancho nem na legenda. Um assunto só, que se entende sem o resto do vídeo.
- **Começa forte:** na frase que prende (uma pergunta, uma revelação, uma opinião forte, um número). Corte o "então, é..." do começo. Use o tempo de início da frase, uns 0,2 s antes.
- **Termina fechado:** no fim de uma frase, de preferência numa conclusão. Nunca no meio da palavra.
- **De 3 a 6 cortes por vídeo de 1 hora**, os melhores, sem repetir assunto. Prefira poucos e bons.
- **Gancho:** até 70 caracteres, a promessa do corte, sem entregar o final. Fica no topo do vídeo o tempo todo.
- **Título:** até 100 caracteres, sem `<` nem `>`, que dê vontade de clicar. É o título do Short.
- **Legenda:** uma pergunta ou frase curta para comentar e no máximo 3 hashtags (o Instagram aceita até 5).
- **Dúvida (opcional):** se ficou algo que você não conseguiu resolver (a fala termina cortada, um trecho pode ofender, o rosto sai do quadro), ponha `"duvida": "<o que conferir>"` no corte. Ele espera o dono aprovar, mesmo com a aprovação automática ligada.
- **Enquadramento:** `desfocado` (o vídeo inteiro no meio, com fundo desfocado) serve para qualquer vídeo. Use `centro` com `"foco"` de 0 a 1 só quando uma pessoa fala sozinha e sempre no mesmo lugar da tela (0,5 = no meio).

## 4. Conferir e renderizar

`npm run previa -- trabalho/<id>` e olhe cada `cortes/NN/previa.jpg` (Read). Confira se o gancho cabe, se a legenda não cobre o rosto e se, no `centro`, a pessoa ficou no quadro (ajuste o `foco`). Depois `npm run cortar -- trabalho/<id>`. Um corte de 1 minuto leva uns 3 a 4 minutos.

## 5. Mandar

`npm run enviar -- trabalho/<id>`. Os cortes vão para o menu Cortes, esperando aprovação (e o pedido, se veio de um link, fica "Pronto"). Se um vídeo de link der erro no meio (transcrição, corte) e não se resolver, marque: `npm run marcar -- <pedidoId> erro "o que houve"`.

## 6. Resumir

Diga quantos cortes foram para aprovação, os títulos, e lembre de aprovar no menu Cortes do Postaí. Diga até que dia a fila tem posts (`npm run estado -- --fila`). Se a fila tiver menos de 7 dias, sugira pedir mais vídeos.
