import { useEffect, useRef } from "react";
import { continueRender, delayRender, getInputProps } from "remotion";

// Conferência da tela (23/11/2026): com `__conferir` nos dados (só o npm run
// conferir-tela manda), cada texto marcado diz no console onde ficou na tela e
// a cor da letra. O conferir-tela junta com a imagem e avisa texto embaixo dos
// botões do app ou difícil de ler. Sem `__conferir`, não faz nada.

const conferindo = () => Boolean((getInputProps() as { __conferir?: boolean }).__conferir);

/** Liga a medida num texto: devolve o ref para o elemento que tem a letra. */
export function useConferirTexto<T extends HTMLElement>(nome: string) {
  const ref = useRef<T>(null);
  const ligado = conferindo();
  useEffect(() => {
    if (!ligado) return;
    const espera = delayRender(`conferir ${nome}`);
    document.fonts.ready.then(() => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        // A cor da letra: a de um trecho sem fundo próprio (na legenda, uma palavra que não está sendo falada)
        const comTexto = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))].filter((e) => Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim()));
        const semFundo = (e: HTMLElement) => {
          const fundo = getComputedStyle(e).backgroundColor;
          return fundo === "transparent" || /rgba\([^)]*,\s*0\)/.test(fundo);
        };
        const letra = comTexto.find(semFundo) ?? comTexto[0] ?? el;
        const estilo = getComputedStyle(letra);
        // Caixa em volta do texto (no próprio bloco ou até 2 acima): lê em cima de qualquer imagem
        let caixa = false;
        for (let atual: HTMLElement | null = el, n = 0; atual && n < 3; atual = atual.parentElement, n++) {
          const fundo = getComputedStyle(atual).backgroundColor;
          const alfa = /rgba?\(([^)]+)\)/.exec(fundo)?.[1].split(",")[3];
          if (fundo !== "transparent" && (alfa === undefined || Number(alfa) > 0.5)) caixa = true;
        }
        const contorno = parseFloat(estilo.getPropertyValue("-webkit-text-stroke-width")) > 0;
        const sombra = estilo.textShadow !== "none";
        if (r.width > 0 && r.height > 0)
          console.debug(
            "POSTAI_TEXTO " +
              JSON.stringify({ nome, x: r.left, y: r.top, w: r.width, h: r.height, cor: estilo.color, caixa, contorno, sombra, texto: (el.textContent ?? "").trim().slice(0, 60) }),
          );
      }
      continueRender(espera);
    });
  });
  return ref;
}
