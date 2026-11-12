import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { Texture, TextureLoader, SRGBColorSpace } from "three";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { arquivo } from "../base";

// O Remotion espera a foto ou a fonte carregar antes de fotografar o quadro
// (delayRender). Sem isso, o 3D sai vazio no vídeo. E como no vídeo o 3D só é
// desenhado quando o quadro muda, depois de carregar é preciso mandar
// desenhar de novo (advance) antes de liberar.

function useLiberarDepoisDeDesenhar(pronto: boolean, espera: number) {
  const { advance } = useThree();
  useEffect(() => {
    if (!pronto) return;
    advance(performance.now());
    continueRender(espera);
  }, [pronto, espera, advance]);
}

/** Foto como textura do three.js */
export function useTextura(src: string) {
  const [textura, setTextura] = useState<Texture | null>(null);
  const [espera] = useState(() => delayRender(`Foto 3D: ${src}`));
  useEffect(() => {
    new TextureLoader().load(
      arquivo(src),
      (t) => {
        t.colorSpace = SRGBColorSpace;
        setTextura(t);
      },
      undefined,
      () => cancelRender(new Error(`Não consegui abrir a foto ${src}`)),
    );
  }, [src, espera]);
  useLiberarDepoisDeDesenhar(textura !== null, espera);
  return textura;
}

/** A fonte de título da marca, convertida pelo `npm run fonte-3d` */
export function useFonte3d() {
  const [fonte, setFonte] = useState<Font | null>(null);
  const [espera] = useState(() => delayRender("Fonte 3D"));
  useEffect(() => {
    fetch(staticFile("marca/fonte-3d.json"))
      .then((r) => {
        if (!r.ok) throw new Error("Falta a fonte 3D da marca. Rode: npm run fonte-3d");
        return r.json();
      })
      .then((dados) => {
        setFonte(new FontLoader().parse(dados));
      })
      .catch((erro) => cancelRender(erro));
  }, [espera]);
  useLiberarDepoisDeDesenhar(fonte !== null, espera);
  return fonte;
}
