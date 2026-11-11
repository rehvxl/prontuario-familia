/** Grade de 4 pt. Use as chaves numéricas: `space[4]` = 16. */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
export type SpaceKey = keyof typeof space;

/** Medidas de layout recorrentes. */
export const layout = {
  /** Margem lateral das telas. */
  screenGutter: 20,
  /** Distância entre seções de uma tela. */
  sectionGap: 32,
  /** Distância entre campos de formulário. */
  fieldGap: 20,
  /** Largura máxima de leitura (tablets/landscape). */
  maxContentWidth: 640,
  /** Altura de botões e campos (acima do mínimo de toque, pensando em 60+). */
  controlHeight: 52,
  controlHeightSmall: 44,
} as const;
