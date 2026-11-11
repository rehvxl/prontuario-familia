import * as Haptics from 'expo-haptics';

/** Toque leve de seleção (checkbox, chip, segmento). Nunca quebra a UI se o háptico falhar. */
export function selectionFeedback(): void {
  try {
    const result: unknown = Haptics.selectionAsync();
    if (result instanceof Promise) result.catch(() => undefined);
  } catch {
    // sem háptico (web, simulador, testes)
  }
}
