import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { APOIOS, ApoioAoLado, metadeDaLargura, type TipoDeApoio } from "../../componentes/objetos/ObjetosDeApoio";
import { PainelDoQr, textoDoQr } from "../../componentes/midia/QrCode";
import { TIPOS_DE_TESTA } from "../../componentes/personagens/MarcaNaTesta";
export { testaAgora } from "../../componentes/personagens/MarcaNaTesta";

// Recursos a mais do molde Conversa (26/11/2026, pedidos da crítica): objetos de
// apoio na mão ou ao lado, marca/brilho na testa e QR Code (numa cena e no
// cartão do fim). Ficam aqui, fora do Conversa.tsx, e todos são opcionais: um
// roteiro sem eles sai igual ao de antes.

// ---- Schema ----

const qrDaCenaSchema = z
  .object({
    texto: z.string().max(300).optional().describe("O endereço do QR (sem ele: o do qr do roteiro ou o site da marca)"),
    como: z.enum(["celular", "convite", "cartao"]).default("celular").describe('"celular" (na tela de um celular grande), "convite" (convite de papel) ou "cartao"'),
    titulo: z.string().max(30).optional().describe('Só no convite: o nome em cima do QR, ex.: "Bia & Leo"'),
    legenda: z.string().max(28).optional().describe('Linha curta embaixo do QR, ex.: "Confirme aqui"'),
    lado: z.enum(["esquerda", "direita"]).default("direita"),
  })
  .describe("Um QR Code grande, de verdade (dá para escanear), no alto da cena, ao lado do título: some na fala seguinte (repita na fala seguinte para ele ficar)");

/** Os campos a mais de cada fala (espalhados no schema da cena) */
export const camposExtrasDaCena = {
  objetos: z
    .array(
      z.object({
        quem: z.string().describe("O id de quem segura ou de quem o objeto fica ao lado"),
        tipo: z.enum([...APOIOS, "nenhum"] as [TipoDeApoio | "nenhum", ...Array<TipoDeApoio | "nenhum">]).describe('O objeto (ou "nenhum" para tirar)'),
        onde: z.enum(["mao", "ao-lado"]).default("mao").describe('"mao": na mão livre (a do celular fica com o celular); "ao-lado": de pé no chão, ao lado da pessoa'),
        lado: z.enum(["esquerda", "direita"]).optional().describe("Ao lado: de que lado da pessoa (sem isso: do lado de fora, longe da outra pessoa)"),
      }),
    )
    .optional()
    .describe(
      "Objetos de apoio: alianca, caixinha-de-alianca, terno, vestido-de-noiva, buque, bolo, presente, convite, tacas. Ficam de uma fala para a outra até outra fala trocar ou pôr \"nenhum\" (um na mão e um ao lado por pessoa)",
    ),
  testa: z
    .record(z.string(), z.enum(TIPOS_DE_TESTA))
    .optional()
    .describe('Marca na testa, pelo id: "marca" (sinal escuro), "brilho" (luz dourada), "marca-brilho" (sinal que brilha) ou "nenhuma". Fica até outra fala mudar'),
  qr: qrDaCenaSchema.optional(),
};

/** O QR do roteiro (no cartão do fim) */
export const qrDoRoteiroSchema = z
  .object({
    texto: z.string().max(300).optional().describe("O endereço (sem ele: o site da marca, do marca.json)"),
    legenda: z.string().max(28).optional().describe('Linha curta embaixo do QR, ex.: "Aponte a câmera"'),
    noFim: z.boolean().default(true).describe("Mostra o QR no cartão do fim (as pessoas abrem espaço para ele)"),
  })
  .optional()
  .describe("QR Code de verdade (escaneável) no cartão do fim, acima da chamada; o endereço também serve de padrão para o qr das cenas");

type QrDaCena = z.infer<typeof qrDaCenaSchema>;
type ObjetoDaCena = NonNullable<z.infer<typeof camposExtrasDaCena.objetos>>[number];
type CenaComExtras = {
  cenario?: string;
  objetos?: ObjetoDaCena[];
  testa?: Record<string, (typeof TIPOS_DE_TESTA)[number]>;
  qr?: QrDaCena;
};
type Trecho = { cena: CenaComExtras; inicio: number };

// ---- Contas (quem tem o quê agora) ----

/** O objeto de alguém agora, na mão ou ao lado (com o quadro em que entrou).
 * O de ao lado fica no lugar: quando a fala troca de cenário, ele some (o da mão vai junto com a pessoa) */
export function objetoAgora(linha: Trecho[], id: string, onde: "mao" | "ao-lado", frame: number) {
  let atual = null as { tipo: TipoDeApoio; desde: number; lado?: "esquerda" | "direita" } | null;
  let lugar: string | undefined;
  for (const { cena, inicio } of linha) {
    if (inicio - 6 > frame) break;
    // Só quando o lugar muda de verdade (27/11/2026: repetir o mesmo "cenario" numa fala fazia o objeto sumir e voltar)
    if (onde === "ao-lado" && cena.cenario && lugar !== undefined && cena.cenario !== lugar) atual = null;
    if (cena.cenario) lugar = cena.cenario;
    for (const o of cena.objetos ?? []) {
      if (o.quem !== id || (o.onde ?? "mao") !== onde) continue;
      if (o.tipo === "nenhum") atual = null;
      else if (atual?.tipo !== o.tipo || atual.lado !== o.lado) atual = { tipo: o.tipo, desde: Math.max(0, inicio - 6), lado: o.lado };
    }
  }
  return atual;
}

// ---- Desenho ----

/** O objeto ao lado da pessoa: entra crescendo do chão. `centro`: o meio do corpo na tela */
export const ObjetoAoLado: React.FC<{
  tipo: TipoDeApoio;
  desde: number;
  centro: number;
  lado: "esquerda" | "direita";
  chao: number;
  /** A camada do estilo (nos estilos de traço, o objeto vira desenho de linha como o cenário) */
  Camada: React.FC<{ children: React.ReactNode }>;
}> = ({ tipo, desde, centro, lado, chao, Camada }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame: frame - desde, fps, config: { damping: 14, stiffness: 140 } });
  if (frame < desde) return null;
  // Inteiro na tela: o meio fica a meia largura do objeto da borda
  const meio = metadeDaLargura(tipo);
  const x = Math.min(1080 - meio - 8, Math.max(meio + 8, centro + (lado === "esquerda" ? -230 : 230)));
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 2, opacity: Math.min(1, entra * 1.5), transform: `scale(${0.7 + 0.3 * entra})`, transformOrigin: `${x}px ${chao}px` }}>
      <Camada>
        <ApoioAoLado tipo={tipo} x={x} chao={chao} />
      </Camada>
    </div>
  );
};

/** Altura (aprox.) de onde termina o cartão do título: o QR entra logo abaixo */
export const baixoDoTitulo = (titulo: string, parte?: string) => 120 + 56 + Math.ceil(titulo.length / 24) * 62 + (parte ? 70 : 0);

/** O QR da fala de agora (some na fala seguinte, a não ser que ela repita o mesmo QR) */
export const QrNaCena: React.FC<{ linha: Trecho[]; fim: number; qrDoRoteiro?: { texto?: string }; topo: number }> = ({ linha, fim, qrDoRoteiro, topo }) => {
  const frame = useCurrentFrame();
  const k = linha.findIndex((l, n) => frame >= l.inicio - 4 && frame < (linha[n + 1]?.inicio ?? fim) - 4);
  const qr = k >= 0 ? linha[k].cena.qr : undefined;
  if (!qr) return null;
  const texto = textoDoQr(qr.texto ?? qrDoRoteiro?.texto);
  if (!texto) return null;
  // Entra na primeira fala de uma sequência com o mesmo QR (não pula de novo a cada fala)
  let comeco = k;
  while (comeco > 0 && linha[comeco - 1].cena.qr && JSON.stringify(linha[comeco - 1].cena.qr) === JSON.stringify(qr)) comeco--;
  const tamanho = 250;
  return (
    <PainelDoQr
      texto={texto}
      como={qr.como}
      legenda={qr.legenda}
      titulo={qr.titulo}
      tamanho={tamanho}
      em={linha[comeco].inicio - 4}
      style={{ top: topo, ...(qr.lado === "esquerda" ? { left: 40 } : { right: 40 }) }}
    />
  );
};

/** Quanto as pessoas abrem espaço para o QR no cartão do fim (px na tela, por lugar) */
export function afastarParaOQr(quantos: number, indice: number) {
  if (quantos === 1) return -220;
  return indice === 0 ? -150 : 150;
}

/** O QR no cartão do fim: no meio (ou à direita de quem está sozinho), entre o título e a chamada */
export const QrNoFim: React.FC<{ texto: string; legenda?: string; topo: number; limite: number; sozinho: boolean }> = ({ texto, legenda, topo, limite, sozinho }) => {
  // Cabe entre o título e o selo do cartão (que sobe uns 110 px acima dele)
  const tamanho = Math.max(220, Math.min(330, Math.floor((limite - 110 - topo - 20) / (1.1 + (legenda ? 0.17 : 0)))));
  const largura = tamanho * 1.14 + 14;
  const centro = sozinho ? 720 : 540;
  return <PainelDoQr texto={texto} como="cartao" legenda={legenda} tamanho={tamanho} em={14} style={{ top: topo, left: centro - largura / 2 }} />;
};
