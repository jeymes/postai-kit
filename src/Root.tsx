import React from "react";
import { Composition, Folder } from "remotion";
import { TexturaDoNarrado } from "./estilos/narrado";
import { AntesDepois, antesDepoisExemplo, antesDepoisSchema } from "./moldes/AntesDepois";
import { Capa, capaExemplo, capaSchema } from "./moldes/Capa";
import { Carrossel, carrosselExemplo, carrosselSchema } from "./moldes/Carrossel";
import { CapaConversa, Conversa, conversaExemplo, conversaSchema, FichaDoPersonagem } from "./moldes/Conversa";
import { CapaDoDocumentario, capaDocumentarioExemplo, capaDocumentarioSchema, Documentario, documentarioExemplo, documentarioSchema } from "./moldes/Documentario";
import { CorteVertical, corteVerticalExemplo, corteVerticalSchema } from "./moldes/CorteVertical";
import { Depoimento, depoimentoExemplo, depoimentoSchema } from "./moldes/Depoimento";
import { Lista, listaExemplo, listaSchema } from "./moldes/Lista";
import { MeusMoldes } from "./moldes/meus";
import { Narrado, narradoExemplo, narradoSchema } from "./moldes/Narrado";
import { Oferta, ofertaExemplo, ofertaSchema } from "./moldes/Oferta";
import { duracaoDoMolde, FPS, QUADROS_DA_IMAGEM } from "./moldes/tempos";
import { Trend, trendExemplo, trendSchema } from "./moldes/Trend";
import { Tutorial, tutorialExemplo, tutorialSchema } from "./moldes/Tutorial";
import { Teste3D } from "./componentes/3d/Teste3D";
import { PreviaDoEstilo } from "./estilos/Previa";
import { Vitrine3D, vitrine3dExemplo, vitrine3dSchema } from "./moldes/Vitrine3D";
import { Mundo3D, mundo3dExemplo, mundo3dSchema } from "./moldes/Mundo3D";
import { Vinheta, vinhetaExemplo, type PropsDaVinheta } from "./moldes/Vinheta";
import { duracaoDaDemo, IlustracaoDemo, ilustracaoDemoSchema, type PropsDaDemo } from "./componentes/ilustracao/Demo";

// Moldes do Kit Estúdio. O conteúdo de cada peça vem de conteudo/<peca>.json
// (ver CLAUDE.md); aqui ficam só os exemplos para abrir no Studio. Os moldes
// criados para a marca ficam em src/moldes/meus/ (do dono, fora das
// atualizações do kit).

const video = { width: 1080, height: 1920, fps: FPS } as const;

// O conteúdo do JSON passa pelo schema: completa os valores padrão (efeitos,
// fundo, bpm...) e calcula a duração com o conteúdo de verdade.
// O Remotion mostra só "ZodError" sem dizer o campo (26/11/2026: a prévia do
// Documentário quebrou e ninguém soube por quê). Aqui o erro diz qual campo do
// JSON está errado e o que era esperado, numa linha que chega à Saúde do kit.
type Problema = { path: PropertyKey[]; message: string };
type Resultado<T> = { success: true; data: T } | { success: false; error: { issues: Problema[] } };
const duracao = <T extends Record<string, unknown>>(id: string, schema: { safeParse: (dados: unknown) => Resultado<T> }) => ({
  calculateMetadata: ({ props }: { props: T }) => {
    const resultado = schema.safeParse(props);
    if (!resultado.success) {
      const campos = resultado.error.issues
        .slice(0, 6)
        .map((p) => `${p.path.map(String).join(".") || "(raiz)"}: ${p.message}`)
        .join("; ");
      throw new Error(`Conteúdo inválido no molde ${id}: ${campos}`);
    }
    const completo = resultado.data;
    return { durationInFrames: duracaoDoMolde(id, completo), props: completo };
  },
});

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Videos">
      {/* As texturas do Canal dark, desenhadas uma vez (public/texturas/LEIA.md) */}
      <Composition id="TexturaDoNarrado" component={TexturaDoNarrado} defaultProps={{ tipo: "grao" as const, semente: 0 }} width={1920} height={1080} fps={30} durationInFrames={1} />
      <Composition id="Oferta" component={Oferta} schema={ofertaSchema} defaultProps={ofertaExemplo} {...video} durationInFrames={duracaoDoMolde("Oferta", ofertaExemplo)} {...duracao("Oferta", ofertaSchema)} />
      <Composition id="Lista" component={Lista} schema={listaSchema} defaultProps={listaExemplo} {...video} durationInFrames={duracaoDoMolde("Lista", listaExemplo)} {...duracao("Lista", listaSchema)} />
      <Composition id="Tutorial" component={Tutorial} schema={tutorialSchema} defaultProps={tutorialExemplo} {...video} durationInFrames={duracaoDoMolde("Tutorial", tutorialExemplo)} {...duracao("Tutorial", tutorialSchema)} />
      <Composition
        id="AntesDepois"
        component={AntesDepois}
        schema={antesDepoisSchema}
        defaultProps={antesDepoisExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("AntesDepois", antesDepoisExemplo)}
        {...duracao("AntesDepois", antesDepoisSchema)}
      />
      <Composition
        id="Depoimento"
        component={Depoimento}
        schema={depoimentoSchema}
        defaultProps={depoimentoExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("Depoimento", depoimentoExemplo)}
        {...duracao("Depoimento", depoimentoSchema)}
      />
      <Composition id="Trend" component={Trend} schema={trendSchema} defaultProps={trendExemplo} {...video} durationInFrames={duracaoDoMolde("Trend", trendExemplo)} {...duracao("Trend", trendSchema)} />
      <Composition
        id="Narrado"
        component={Narrado}
        schema={narradoSchema}
        defaultProps={narradoExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("Narrado", narradoExemplo)}
        {...duracao("Narrado", narradoSchema)}
      />
      {/* Bonecos de palito num mundo 3D (estilo "Mundo 3D" da Animação) */}
      <Composition
        id="Mundo3D"
        component={Mundo3D}
        schema={mundo3dSchema}
        defaultProps={mundo3dExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("Mundo3D", mundo3dExemplo)}
        {...duracao("Mundo3D", mundo3dSchema)}
      />
      <Composition
        id="Vitrine3D"
        component={Vitrine3D}
        schema={vitrine3dSchema}
        defaultProps={vitrine3dExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("Vitrine3D", vitrine3dExemplo)}
        {...duracao("Vitrine3D", vitrine3dSchema)}
      />
      <Composition
        id="Conversa"
        component={Conversa}
        schema={conversaSchema}
        defaultProps={conversaExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("Conversa", conversaExemplo)}
        {...duracao("Conversa", conversaSchema)}
      />
    </Folder>
    <Folder name="Longos">
      <Composition
        id="Documentario"
        component={Documentario}
        schema={documentarioSchema}
        defaultProps={documentarioExemplo}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={duracaoDoMolde("Documentario", documentarioExemplo)}
        {...duracao("Documentario", documentarioSchema)}
      />
      {/* O short do vídeo longo do Canal dark: um trecho em pé, com o gancho no alto */}
      <Composition
        id="CorteVertical"
        component={CorteVertical}
        schema={corteVerticalSchema}
        defaultProps={corteVerticalExemplo}
        {...video}
        durationInFrames={duracaoDoMolde("CorteVertical", corteVerticalExemplo)}
        {...duracao("CorteVertical", corteVerticalSchema)}
      />
      <Composition
        id="CapaDoDocumentario"
        component={CapaDoDocumentario}
        schema={capaDocumentarioSchema}
        defaultProps={capaDocumentarioExemplo}
        width={1280}
        height={720}
        fps={FPS}
        durationInFrames={QUADROS_DA_IMAGEM}
      />
    </Folder>
    <Folder name="Meus">
      <MeusMoldes />
    </Folder>
    <Folder name="Ferramentas">
      <Composition id="Teste3D" component={Teste3D} {...video} durationInFrames={60} />
      <Composition id="FichaDoPersonagem" component={FichaDoPersonagem} width={1080} height={1920} fps={FPS} durationInFrames={30} defaultProps={{}} />
      <Composition
        id="Vinheta"
        component={Vinheta}
        defaultProps={vinhetaExemplo}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={vinhetaExemplo.quadros}
        calculateMetadata={({ props }: { props: PropsDaVinheta }) => ({ width: props.largura, height: props.altura, durationInFrames: props.quadros })}
      />
      <Composition id="PreviaDoEstilo" component={PreviaDoEstilo} width={1080} height={1920} fps={FPS} durationInFrames={150} defaultProps={{ modelo: "chapado" as const, fundo: "claro" as const, cena: "dupla" as const }} />
    </Folder>
    {/* Testes de componentes (não são moldes): a ilustração da fala com todos os tipos */}
    <Folder name="Testes">
      <Composition
        id="IlustracaoDemo"
        component={IlustracaoDemo}
        schema={ilustracaoDemoSchema}
        defaultProps={{ modelo: "chapado" as const, fundo: "claro" as const, parte: "tipos" as const }}
        {...video}
        durationInFrames={duracaoDaDemo({})}
        calculateMetadata={({ props }: { props: Partial<PropsDaDemo> }) => ({ durationInFrames: duracaoDaDemo(props) })}
      />
    </Folder>
    <Folder name="Imagens">
      <Composition id="Capa" component={Capa} schema={capaSchema} defaultProps={capaExemplo} {...video} durationInFrames={QUADROS_DA_IMAGEM} />
      <Composition id="CapaConversa" component={CapaConversa} defaultProps={conversaExemplo} {...video} durationInFrames={QUADROS_DA_IMAGEM} />
      <Composition
        id="Carrossel"
        component={Carrossel}
        schema={carrosselSchema}
        defaultProps={carrosselExemplo}
        width={1080}
        height={1350}
        fps={FPS}
        durationInFrames={QUADROS_DA_IMAGEM}
      />
    </Folder>
  </>
);
