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
  7: 28,
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
  /** v3: margem dos grupos (contêineres) até a borda da tela. */
  groupInset: 16,
  /** v3: respiro acima e abaixo de um SectionHeader. */
  sectionHeaderTop: 28,
  sectionHeaderBottom: 10,
  /** v3: altura mínima de linha de lista. */
  rowMinHeight: 52,
  /** v4: margem esquerda do texto na folha (a mesma da tela comum; a folha não tem furos). */
  leafMargin: 20,
  /** v4: margem direita do texto na folha. */
  leafGutter: 12,
  /** v4: largura da régua de abas na borda direita. */
  railWidth: 40,
  /** v4: altura mínima de uma aba (rótulo vertical legível + contagem). */
  tabMinHeight: 64,
} as const;
