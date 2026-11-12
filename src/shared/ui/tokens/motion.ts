/**
 * Movimento. Curto, com desaceleração exponencial e começando de um estado já visível.
 * Com "Reduzir movimento" ativo, `theme.motion.reduced` é true: troque deslocamentos por fade
 * ou corte instantâneo.
 */
export const duration = {
  instant: 0,
  fast: 120,
  base: 200,
  slow: 300,
} as const;

/** Curvas cubic-bezier (x1, y1, x2, y2). Use com `Easing.bezier(...curve)`. */
export const easing = {
  /** Entrada de elementos e sheets: ease-out exponencial. */
  out: [0.16, 1, 0.3, 1],
  /** Saída: acelera para fora. */
  in: [0.7, 0, 0.84, 0],
  /** Mudanças de estado no lugar. */
  standard: [0.2, 0, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/**
 * Molas (v2). O iOS 26 anima por mola; use com `Animated.spring` / Reanimated `withSpring`.
 * `snappy` para controles, `smooth` para superfícies (sheets, FAB). Com "Reduzir movimento", não use.
 */
export const spring = {
  snappy: { damping: 22, stiffness: 320, mass: 1 },
  smooth: { damping: 26, stiffness: 200, mass: 1 },
} as const;

/**
 * v3: a única animação autoral do sistema. O marcador da RangeBar assenta do centro da faixa até o
 * valor na primeira vez que aparece. Com "Reduzir movimento", aparece no lugar.
 */
export const rangeSettle = { duration: duration.slow, easing: easing.out } as const;

/**
 * v4: a troca de divisória. A capa, o papel e o conteúdo trocam no mesmo quadro (nunca um quadro com a cor nova
 * e o conteúdo antigo). O movimento fica na aba, que sai de trás da folha em `tab` ms, e no conteúdo da folha,
 * que entra em `content` ms de opacidade. Com "Reduzir movimento", os dois são instantâneos.
 */
export const boardSwap = { tab: 120, content: 150 } as const;
