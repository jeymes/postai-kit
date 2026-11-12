// Duração das cenas de cada molde desta pasta, em quadros (30 por segundo).
// Ex.: Promocao: (c) => [75, 120, 90]. Sem import de runtime (ver ../tempos.ts).
export const CENAS_DOS_MEUS_MOLDES: Record<string, (conteudo: Record<string, unknown>) => number[]> = {};
