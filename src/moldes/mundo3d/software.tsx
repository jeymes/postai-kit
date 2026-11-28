import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";

// O render por software (28/11/2026): na nuvem não há placa de vídeo e o 3D é
// desenhado no processador (SwiftShader), pixel por pixel. Ali o mundo usa um
// material mais simples nas coisas foscas (chão, grama, montanhas, árvores,
// casas): a luz de PBR (o meshStandardMaterial) custava caro em cada pixel e,
// numa superfície fosca, quase não aparece. Os bonecos e o que brilha (metal,
// ouro, água) continuam com o material de antes.

/** O 3D está sendo desenhado no processador (a nuvem, sem placa de vídeo)? */
export function useSoftware() {
  const { gl } = useThree();
  return useMemo(() => {
    const ctx = gl.getContext();
    const info = ctx.getExtension("WEBGL_debug_renderer_info");
    return /swiftshader|software|llvmpipe/i.test(String(info ? ctx.getParameter(info.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)));
  }, [gl]);
}

type PropsDoMaterial = React.ComponentProps<"meshStandardMaterial">;

/** O material do cenário: o de sempre na placa de vídeo; fosco (Lambert) por software, quando a coisa é fosca */
export const Fosco: React.FC<PropsDoMaterial> = (props) => {
  const software = useSoftware();
  const { roughness, metalness, ...resto } = props;
  const fosco = (roughness ?? 1) >= 0.5 && (metalness ?? 0) <= 0.15;
  if (software && fosco) return <meshLambertMaterial {...(resto as React.ComponentProps<"meshLambertMaterial">)} />;
  return <meshStandardMaterial {...props} />;
};
