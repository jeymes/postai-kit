import React from "react";
import { Composition, Folder } from "remotion";
import { AntesDepois, antesDepoisExemplo, antesDepoisSchema } from "./moldes/AntesDepois";
import { Capa, capaExemplo, capaSchema } from "./moldes/Capa";
import { Carrossel, carrosselExemplo, carrosselSchema } from "./moldes/Carrossel";
import { CapaConversa, Conversa, conversaExemplo, conversaSchema, FichaDoPersonagem } from "./moldes/Conversa";
import { CapaDoDocumentario, capaDocumentarioExemplo, capaDocumentarioSchema, Documentario, documentarioExemplo, documentarioSchema } from "./moldes/Documentario";
import { Depoimento, depoimentoExemplo, depoimentoSchema } from "./moldes/Depoimento";
import { Lista, listaExemplo, listaSchema } from "./moldes/Lista";
import { MeusMoldes } from "./moldes/meus";
import { Narrado, narradoExemplo, narradoSchema } from "./moldes/Narrado";
import { Oferta, ofertaExemplo, ofertaSchema } from "./moldes/Oferta";
import { duracaoDoMolde, FPS, QUADROS_DA_IMAGEM } from "./moldes/tempos";
import { Trend, trendExemplo, trendSchema } from "./moldes/Trend";
import { Tutorial, tutorialExemplo, tutorialSchema } from "./moldes/Tutorial";
import { Teste3D } from "./componentes/3d/Teste3D";
import { Vitrine3D, vitrine3dExemplo, vitrine3dSchema } from "./moldes/Vitrine3D";

// Moldes do Kit Estúdio. O conteúdo de cada peça vem de conteudo/<peca>.json
// (ver CLAUDE.md); aqui ficam só os exemplos para abrir no Studio. Os moldes
// criados para a marca ficam em src/moldes/meus/ (do dono, fora das
// atualizações do kit).

const video = { width: 1080, height: 1920, fps: FPS } as const;

// O conteúdo do JSON passa pelo schema: completa os valores padrão (efeitos,
// fundo, bpm...) e calcula a duração com o conteúdo de verdade.
const duracao = <T extends Record<string, unknown>>(id: string, schema: { parse: (dados: unknown) => T }) => ({
  calculateMetadata: ({ props }: { props: T }) => {
    const completo = schema.parse(props);
    return { durationInFrames: duracaoDoMolde(id, completo), props: completo };
  },
});

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Videos">
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
