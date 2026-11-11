/** Remove acentos, caixa e espaços repetidos: base da busca textual (ex.: "Cardiologísta" ≈ "cardiologista"). */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Apara e colapsa espaços internos. */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
