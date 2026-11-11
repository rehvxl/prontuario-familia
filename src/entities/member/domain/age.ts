/** Idade em anos completos na data `today`; `null` se a data for inválida ou futura. */
export function calculateAge(birthDate: string, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - y;
  const hadBirthday = today.getMonth() + 1 > mo || (today.getMonth() + 1 === mo && today.getDate() >= d);
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/** Texto de idade: "5 anos", "1 ano" (12–23 meses), "8 meses" (menos de 1 ano) ou "recém-nascido". `null` sem data válida. */
export function formatAge(birthDate: string | null, today: Date = new Date()): string | null {
  if (!birthDate) return null;
  const years = calculateAge(birthDate, today);
  if (years === null) return null;
  if (years >= 2) return `${years} anos`;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  let months = (today.getFullYear() - Number(m[1])) * 12 + (today.getMonth() + 1 - Number(m[2]));
  if (today.getDate() < Number(m[3])) months -= 1;
  if (months < 1) return 'recém-nascido';
  if (months < 12) return months === 1 ? '1 mês' : `${months} meses`;
  return '1 ano';
}
