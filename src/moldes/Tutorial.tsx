import React from "react";
import { AbsoluteFill, Series, useCurrentFrame } from "remotion";
import { z } from "zod";
import { entrada } from "../nucleo/animacao";
import { cores, fontes, marca } from "../nucleo/marca";
import { EfeitosContexto, Musica, Som } from "../componentes/audio/Som";
import { Fundo } from "../componentes/base";
import { ChamadaFinal } from "../componentes/cenas/ChamadaFinal";
import { Toque } from "../componentes/efeitos/Toque";
import { Celular, ALTURA_STATUS, TELA_ALTURA, TELA_LARGURA, tamanhoDoCelular } from "../componentes/midia/Celular";
import { QrAnimado } from "../componentes/midia/QrAnimado";
import { Rolagem } from "../componentes/midia/Rolagem";
import { Texto } from "../componentes/texto/Texto";
import { duracaoDoMolde, TEMPOS } from "./tempos";

// Vídeo 9:16 mostrando o site (ou app) do cliente no celular: gancho → um
// passo por cena, com a página rolando até o ponto certo, o dedo tocando e
// uma legenda em cima → chamada com QR do site. O print vem de
// `npm run capturar-site` (página inteira, na largura de celular).

export const tutorialSchema = z.object({
  gancho: z.string(),
  destaqueGancho: z.string().optional(),
  print: z.string().describe("Print da página inteira em public/ (ex.: sites/inicio.png)"),
  proporcao: z.number().describe("Altura do print dividida pela largura (o capturar-site informa)"),
  passos: z
    .array(
      z.object({
        legenda: z.string().describe("Curta: até umas 7 palavras"),
        rolagem: z.number().min(0).max(1).describe("Onde a página para: 0 = topo, 1 = fim"),
        toque: z
          .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
          .optional()
          .describe("Onde o dedo toca, na tela visível (0 a 1)"),
      }),
    )
    .min(1)
    .max(6),
  chamada: z.string().optional(),
  qr: z.string().optional().describe("Endereço do QR da chamada (sem isso, sem QR)"),
  musica: z.string().optional(),
  efeitos: z.boolean().default(true),
});

export type Tutorial = z.infer<typeof tutorialSchema>;

export const tutorialExemplo: Tutorial = {
  gancho: "Pedir pelo site leva 30 segundos",
  destaqueGancho: "30 segundos",
  print: "exemplos/site.svg",
  proporcao: 3,
  passos: [
    { legenda: "Escolha o produto", rolagem: 0.15, toque: { x: 0.5, y: 0.55 } },
    { legenda: "Diga quantos quer", rolagem: 0.5, toque: { x: 0.7, y: 0.6 } },
    { legenda: "Pague no PIX e pronto", rolagem: 0.9, toque: { x: 0.5, y: 0.75 } },
  ],
  qr: "https://suamarca.com.br",
  efeitos: true,
};

const ESCALA = 1.75;

const Passo: React.FC<{
  passo: Tutorial["passos"][number];
  anterior: number;
  numero: number;
  print: string;
  proporcao: number;
}> = ({ passo, anterior, numero, print, proporcao }) => {
  const frame = useCurrentFrame();
  const { largura } = tamanhoDoCelular(ESCALA);
  const alturaVisivel = TELA_ALTURA - ALTURA_STATUS;
  return (
    <Fundo>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 70, gap: 40 }}>
        <div
          style={{
            ...entrada(frame, 0, 16, 30),
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "0 70px",
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              flexShrink: 0,
              background: cores.destaque,
              color: cores.textoNoDestaque,
              display: "grid",
              placeItems: "center",
              fontFamily: fontes.titulo,
              fontWeight: 800,
              fontSize: 54,
            }}
          >
            {numero}
          </div>
          <div style={{ fontFamily: fontes.titulo, fontWeight: 800, fontSize: 64, lineHeight: 1.05, color: cores.texto }}>
            {passo.legenda}
          </div>
        </div>
        <div style={{ position: "relative", width: largura }}>
          <Celular escala={ESCALA} inicio={numero === 1 ? 0 : -60}>
            <Rolagem
              print={print}
              largura={TELA_LARGURA}
              altura={alturaVisivel}
              proporcao={proporcao}
              pontos={[
                { em: 0, y: anterior },
                { em: 40, y: passo.rolagem },
              ]}
            />
          </Celular>
          {passo.toque && (
            <Toque
              em={58}
              x={(13 + passo.toque.x * TELA_LARGURA) * ESCALA}
              y={(13 + ALTURA_STATUS + passo.toque.y * alturaVisivel) * ESCALA}
            />
          )}
        </div>
      </AbsoluteFill>
    </Fundo>
  );
};

const Final: React.FC<{ chamada?: string; qr?: string }> = ({ chamada, qr }) => {
  const frame = useCurrentFrame();
  if (!qr) return <ChamadaFinal chamada={chamada} />;
  return (
    <Fundo escuro>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, padding: 90 }}>
        <Texto texto={chamada ?? marca.chamada} cor={cores.textoNoDestaque} tamanho={96} />
        <div style={{ ...entrada(frame, 10), background: "#fff", padding: 36, borderRadius: 40 }}>
          <QrAnimado texto={qr} tamanho={420} inicio={14} cor="#111" />
        </div>
        <div style={{ ...entrada(frame, 24), fontFamily: fontes.texto, fontWeight: 600, fontSize: 46, color: cores.textoNoDestaque }}>
          {marca.site}
        </div>
      </AbsoluteFill>
    </Fundo>
  );
};

export const Tutorial: React.FC<Tutorial> = (props) => (
  <AbsoluteFill>
    <EfeitosContexto.Provider value={props.efeitos}>
      <Series>
        <Series.Sequence durationInFrames={TEMPOS.gancho}>
          <Som tipo="impacto" em={0} volume={0.4} />
          <Fundo>
            <AbsoluteFill style={{ justifyContent: "center", padding: 90 }}>
              <Texto texto={props.gancho} destaque={props.destaqueGancho} tamanho={120} />
            </AbsoluteFill>
          </Fundo>
        </Series.Sequence>
        {props.passos.map((passo, i) => (
          <Series.Sequence key={i} durationInFrames={TEMPOS.passo}>
            <Som tipo="transicao" em={0} />
            <Passo
              passo={passo}
              anterior={i === 0 ? 0 : props.passos[i - 1].rolagem}
              numero={i + 1}
              print={props.print}
              proporcao={props.proporcao}
            />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={TEMPOS.chamada}>
          <Som tipo="sucesso" em={4} />
          <Final chamada={props.chamada} qr={props.qr} />
        </Series.Sequence>
      </Series>
    </EfeitosContexto.Provider>
    {props.musica && <Musica src={props.musica} total={duracaoDoMolde("Tutorial", props)} />}
  </AbsoluteFill>
);
