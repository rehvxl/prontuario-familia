import { CATEGORICAL_COUNT, type CategoricalIndex } from '../tokens';

/** Iniciais para avatar: "Ana Paula da Silva" → "AS"; "carlos" → "C". */
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0 && !/^(da|de|do|das|dos|e)$/i.test(p));
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase('pt-BR');
}

/** Índice determinístico (0..6) da paleta categórica a partir de um id estável (FNV-1a). */
export function categoricalIndexFor(seed: string): CategoricalIndex {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % CATEGORICAL_COUNT) as CategoricalIndex;
}
