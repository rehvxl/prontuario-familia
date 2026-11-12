import { PERSON_HUE_COUNT, type PersonHueIndex } from '../tokens';

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

/**
 * Índice determinístico (0..6) do matiz da pessoa a partir de um id estável (FNV-1a).
 * Use com `theme.personBoard(i)` (divisória) ou `theme.categorical[i]` (tinta/soft).
 */
export function categoricalIndexFor(seed: string): PersonHueIndex {
  return assignedHues.get(seed) ?? hashHue(seed);
}

function hashHue(seed: string): PersonHueIndex {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % PERSON_HUE_COUNT) as PersonHueIndex;
}

// shortcut: registro de módulo (não contexto) para os ~20 pontos que chamam categoricalIndexFor no render;
// trocar por contexto se o app passar a ter mais de uma família aberta ao mesmo tempo.
let assignedHues = new Map<string, PersonHueIndex>();

/**
 * Divisórias sem cor repetida e iguais em qualquer aparelho: a ordem de cadastro escolhe o matiz
 * (1ª pessoa = matiz 0, 2ª = 1…). Da 8ª pessoa em diante as cores voltam a se repetir.
 * shortcut: excluir uma pessoa desloca as cores de quem veio depois; persistir o matiz no cadastro se isso incomodar.
 */
export function registerPersonHues(idsInCreationOrder: readonly string[]): void {
  assignedHues = new Map(idsInCreationOrder.map((id, i) => [id, (i % PERSON_HUE_COUNT) as PersonHueIndex]));
}
