import React from "react";
import { Fundo } from "../base";
import { Formas3D } from "./Formas3D";
import { Palco3D } from "./Palco3D";

/** Cena 3D leve que o `npm run diagnostico` renderiza para medir o computador */
export const Teste3D: React.FC = () => (
  <Fundo>
    <Palco3D>
      <Formas3D />
    </Palco3D>
  </Fundo>
);
