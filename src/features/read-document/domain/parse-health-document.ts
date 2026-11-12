// Parser de documentos de saúde (ocr-tecnico.md, Apêndice A), alinhado à spec v0.2 ("Alinhamento com a spec").
// Puro, síncrono e determinístico. O texto recebido é dado de saúde: nada aqui loga, persiste ou envia.
import type { RecordType } from '@/entities/health-record';
import { ANALYTES, GROUP_TITLES, UNIT_ALIASES, computeFlag, type Analyte, type AnalyteGroup } from '@/entities/measurement';
import type { MedicationDuration } from '@/entities/medication';
import { VACCINE_ALIASES, type DoseKey } from '@/entities/vaccine';
import type {
  Confidence,
  HealthDocumentSuggestions,
  LabResultSuggestion,
  MedicationSuggestion,
  ParseOptions,
  ParseWarning,
  Suggestion,
  VaccineSuggestion,
} from './suggestions';

// ---------------------------------------------------------------- texto

/** Minúsculas e sem acento, preservando o comprimento (índices do texto dobrado valem no original). */
export function fold(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    out += f.length === 1 ? f : c;
  }
  return out;
}

export function prepareLines(text: string): string[] {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[   \t]/g, ' ')
    .replace(/[‐-―−]/g, '-')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/μ/g, 'µ')
    .split('\n')
    .map((l) => l.replace(/\s*\/\s*/g, '/').replace(/ {3,}/g, '  ').trim())
    .filter((l) => l !== '');
}

const SMALL_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
const ACRONYMS = new Set(['UBS', 'UPA', 'SUS', 'USF', 'AMA', 'PA', 'AP']);
/** Palavras em CAIXA ALTA viram "Título" (exceto siglas conhecidas e conectivos). */
export function tidyCaps(s: string): string {
  return s
    .split(' ')
    .map((w, i) => {
      if (!/^[A-ZÀ-Ý]+$/.test(w) || ACRONYMS.has(w) || (w.length === 1 && w !== 'E')) return w;
      const lower = w.toLowerCase();
      return i > 0 && SMALL_WORDS.has(lower) ? lower : lower[0]!.toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const clip = (s: string, max = 120) => (s.length > max ? s.slice(0, max).trim() : s);

// ---------------------------------------------------------------- números

const NUM = String.raw`(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)`;

/** Interpretações possíveis de um número pt-BR. "10.000" → [10000, 10]; "13,8" → [13.8]; "1.020" → [1020, 1.02]. */
export function numberCandidates(raw: string): number[] {
  if (raw.includes(',') && raw.includes('.')) return [Number(raw.replace(/\./g, '').replace(',', '.'))];
  if (raw.includes(',')) return (raw.match(/,/g)?.length ?? 0) === 1 ? [Number(raw.replace(',', '.'))] : [];
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    const thousands = Number(raw.replace(/\./g, ''));
    return (raw.match(/\./g)?.length ?? 0) === 1 ? [thousands, Number(raw)] : [thousands];
  }
  return [Number(raw)];
}

const round = (v: number) => Number(v.toPrecision(12));

/** Escolhe a leitura plausível na unidade canônica; empate segue a convenção BR (ponto = milhar). */
function resolveNumber(raw: string, factor: number, plausible: [number, number]): { value: number; ambiguous: boolean } | null {
  const ok = numberCandidates(raw).map((n) => round(n * factor)).filter((n) => Number.isFinite(n) && n >= plausible[0] && n <= plausible[1]);
  if (ok.length === 0) return null;
  return { value: ok[0]!, ambiguous: ok.length > 1 };
}

// ---------------------------------------------------------------- unidades

const EGFR_UNIT = /^ml\/min\/1[.,]73 ?m[2²]/;
const POWER_UNIT = /^x? ?10 ?\^? ?([3³6⁶]) ?\/ ?[uµ]l/;

/** Lê a unidade no início de `rest` (dobrado). Devolve a forma exibida e quantos caracteres consumiu. */
export function readUnit(rest: string): { unit: string; length: number } | null {
  // barra vertical: coluna de tabela exportada ("TSH | 3,10 | µUI/mL")
  const s = rest.replace(/^[\s|]+/, '');
  const skipped = rest.length - s.length;
  const egfr = EGFR_UNIT.exec(s);
  if (egfr) return { unit: 'mL/min/1,73m²', length: skipped + egfr[0].length };
  const power = POWER_UNIT.exec(s);
  if (power) return { unit: power[1] === '3' || power[1] === '³' ? '10³/µL' : '10⁶/µL', length: skipped + power[0].length };
  const token = /^[^\s()]+/.exec(s)?.[0];
  if (!token) return null;
  const key = token.replace(/[.,;:]+$/, '');
  const unit = UNIT_ALIASES[key] ?? UNIT_ALIASES[fixOcrUnit(key)];
  return unit ? { unit, length: skipped + key.length } : null;
}

/**
 * Trocas que o Apple Vision faz no denominador da unidade, vistas num laudo real: "mg/aL" (d→a),
 * "mg/dI"/"mg/d1" (l→I/1), "ng/mI". Só mexe depois da barra e só quando o resultado existe no catálogo.
 */
export function fixOcrUnit(key: string): string {
  return key.replace(/\/a(l)$/, '/d$1').replace(/\/([dm])[i1|]$/, '/$1l');
}

// ---------------------------------------------------------------- referência

interface Band { low: number | null; high: number | null; start: number; end: number; label: string | null }
const PREFERRED_LABEL = /^(normal|desejavel|otimo|ideal|adequado)$/;
const LABEL_WORDS = /(normal|desejavel|otimo|ideal|adequado|limitrofe|muito alto|alto|baixo|elevado|intermediario|pre-diabetes|diabetes|deficiencia|insuficiencia|suficiencia)\s*:?\s*$/;

const RANGE_RE = new RegExp(String.raw`(?:entre\s+)?${NUM}\s*(?:a|ate|e|-)\s*${NUM}`, 'g');
const UPPER_RE = new RegExp(String.raw`(?:<=?|<\s*ou\s*=|igual ou inferior a|inferior a|menor ou igual a|menor que|abaixo de|ate)\s*${NUM}`, 'g');
const LOWER_RE = new RegExp(String.raw`(?:>=?|>\s*ou\s*=|igual ou superior a|superior a|maior ou igual a|maior que|acima de)\s*${NUM}`, 'g');

const blank = (m: string) => ' '.repeat(m.length);

function findBands(folded: string, analyte: Analyte, factor: number): Band[] | null {
  // datas, unidades com dígitos e horas não são limites; apaga mantendo os índices
  let s = folded
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, blank)
    .replace(/ml\/min\/1[.,]73 ?m[2²]/g, blank)
    .replace(/x? ?10 ?\^? ?[3³6⁶] ?\/ ?[uµ]l/g, blank)
    .replace(/\d{1,2}:\d{2}/g, blank);
  const bands: Band[] = [];
  const take = (re: RegExp, make: (a: number, b?: number) => Pick<Band, 'low' | 'high'>, groups: number) => {
    for (const m of s.matchAll(re)) {
      const nums = m.slice(1, 1 + groups).map((g) => resolveNumber(g!, factor, [0, analyte.plausible[1] * 10]));
      if (nums.some((n) => n === null)) return false;
      const start = m.index!;
      const before = s.slice(Math.max(0, start - 30), start);
      bands.push({ ...make(nums[0]!.value, nums[1]?.value), start, end: start + m[0].length, label: LABEL_WORDS.exec(before)?.[1] ?? null });
      s = s.slice(0, start) + blank(m[0]) + s.slice(start + m[0].length);
    }
    return true;
  };
  if (!take(RANGE_RE, (a, b) => ({ low: a, high: b! }), 2)) return null;
  if (!take(UPPER_RE, (a) => ({ low: null, high: a }), 1)) return null;
  if (!take(LOWER_RE, (a) => ({ low: a, high: null }), 1)) return null;
  return bands.sort((x, y) => x.start - y.start);
}

export interface Reference { low: number | null; high: number | null; text: string | null }

/** `original` e `folded` têm o mesmo comprimento. `valueUnit` é a unidade lida no valor (null = ausente). */
export function parseReference(original: string, analyte: Analyte, factor: number, valueUnit: string | null, sex?: 'female' | 'male'): Reference {
  const folded = fold(original);
  const empty: Reference = { low: null, high: null, text: null };
  if (folded.trim() === '') return empty;

  const male = /\b(homens?|masculino)\b/.exec(folded);
  const female = /\b(mulher(es)?|feminino)\b/.exec(folded);
  if (male && female) {
    const span = original.slice(Math.min(male.index, female.index)).trim();
    if (!sex) return { low: null, high: null, text: clip(span, 200) };
    const [first, second] = male.index < female.index ? [male, female] : [female, male];
    const mine = (sex === 'male' ? male : female) === first ? [first.index, second.index] : [second.index, original.length];
    return parseReference(original.slice(mine[0], mine[1]).replace(/^[^:]*:\s*/, ''), analyte, factor, valueUnit, undefined);
  }

  // unidade diferente na referência: não converte nem compara
  const units = [...folded.matchAll(/[^\s()0-9,;]+/g)].map((m) => readUnit(m[0])?.unit).filter((u): u is string => !!u);
  if (units.some((u) => u !== (valueUnit ?? analyte.unit))) factor = Number.NaN;

  const bands = Number.isNaN(factor) ? null : findBands(folded, analyte, factor);
  if (!bands || bands.length === 0) return { low: null, high: null, text: clip(original.trim(), 200) || null };

  // texto exibido: do rótulo da primeira faixa ao fim da última (+ unidade e parênteses colados)
  let start = bands[0]!.start;
  const labelBefore = /([a-z][a-z -]*:\s*)$/.exec(folded.slice(Math.max(0, start - 30), start));
  if (labelBefore && LABEL_WORDS.test(labelBefore[1]!.trim())) start -= labelBefore[1]!.length;
  let end = bands[bands.length - 1]!.end;
  const unit = readUnit(folded.slice(end));
  if (unit) end += unit.length;
  const paren = /^\s*\([^)]{0,60}\)/.exec(folded.slice(end));
  if (paren) end += paren[0].length;
  const text = clip(original.slice(start, end).trim(), 200);

  const chosen = bands.length === 1 ? bands : bands.filter((b) => b.label !== null && PREFERRED_LABEL.test(b.label));
  if (chosen.length !== 1) return { low: null, high: null, text };
  return { low: chosen[0]!.low, high: chosen[0]!.high, text };
}

// ---------------------------------------------------------------- exames

const ALIAS_INDEX = ANALYTES.flatMap((a) => a.aliases.map((alias) => ({ alias, analyte: a }))).sort((x, y) => y.alias.length - x.alias.length);
const URINE_START = /^(urina tipo (i|1)|urina rotina|eas\b|sumario de urina|exame de urina|urinalise|parcial de urina)|material\s*:\s*urina/;
const BLOOD_START = /material\s*:\s*(sangue|soro|plasma)|^(hemograma|bioquimica|lipidograma|perfil lipidico|tireoide|hormonios)/;
const REF_MARKER = /^(valor(es)? de referencia|intervalo de referencia|referencia|ref\.?|vr)\b[^:]*:?\s*/;
const RESULT_MARKER = /^resultado\s*:?\s*/;

function matchAnalyte(folded: string, section: 'blood' | 'urine'): { analyte: Analyte; end: number } | null {
  const lead = /^[\s\-•*·]*/.exec(folded)![0].length;
  for (const { alias, analyte } of ALIAS_INDEX) {
    if ((analyte.section === 'urine') !== (section === 'urine')) continue;
    if (!folded.startsWith(alias, lead)) continue;
    const next = folded[lead + alias.length];
    if (next !== undefined && /[a-z0-9]/.test(next)) continue;
    if (analyte.exclude?.test(folded)) return null;
    return { analyte, end: lead + alias.length };
  }
  return null;
}

interface ValueRead { raw: string; rest: string; restOffset: number; censored: boolean; ocrFixed: boolean }

// O Vision, com correção de idioma, troca dígito por letra parecida dentro do decimal ("1,O", "l,0") e solta espaço
// na vírgula ("1 ,0"). Só vale com separador decimal e ao menos um dígito real: inteiro grudado em letra ("8O") segue ilegível (F1.8).
const OCR_DECIMAL = /^([\dilo]{1,4}) {0,2}([.,]) {0,2}([\dilo]{1,4})/;
function readOcrDecimal(f: string, at: number): { raw: string; after: number } | null {
  const m = OCR_DECIMAL.exec(f.slice(at));
  if (!m || !/\d/.test(m[1]! + m[3]!) || /^\d+[.,]\d+$/.test(m[0])) return null;
  const after = at + m[0].length;
  if (/^[a-z0-9]/.test(f.slice(after)) && !readUnit(f.slice(after))) return null;
  const digits = (s: string) => s.replace(/[il]/g, '1').replace(/o/g, '0');
  return { raw: digits(m[1]!) + m[2]! + digits(m[3]!), after };
}

/** Valor logo após o nome: só separadores, parênteses do próprio nome, material e "resultado:" podem vir antes. */
function readValue(original: string, from: number): ValueRead | 'unreadable' | null {
  const f = fold(original);
  const prefix = /^(?:[\s.:_|>\-…]|\([^)]{0,20}\)|\b(?:soro|plasma|sangue total|resultado)\b)*/.exec(f.slice(from))![0];
  const at = from + prefix.length;
  const censored = /^(<|>|inferior a|superior a)/.test(f.slice(at));
  if (censored) return { raw: '', rest: '', restOffset: at, censored: true, ocrFixed: false };
  const ocr = readOcrDecimal(f, at);
  if (ocr) return { raw: ocr.raw, rest: original.slice(ocr.after), restOffset: ocr.after, censored: false, ocrFixed: true };
  const m = new RegExp('^' + NUM).exec(f.slice(at));
  if (!m) return f.slice(at).trim() === '' ? null : /^[a-z]/.test(f.slice(at)) ? null : 'unreadable';
  const after = at + m[0].length;
  if (/^[a-z]/.test(f.slice(after)) && !readUnit(f.slice(after))) return 'unreadable';
  return { raw: m[1]!, rest: original.slice(after), restOffset: after, censored: false, ocrFixed: false };
}

function stripRefLabel(s: string): string {
  const t = s.trim();
  const unwrapped = t.startsWith('(') && t.endsWith(')') ? t.slice(1, -1) : t;
  const m = /^\s*(?:(?:valor(?:es)? de )?referencia|vr|ref\.?)?\s*:?\s*/.exec(fold(unwrapped))!;
  return unwrapped.slice(m[0].length);
}

function isReferenceLine(folded: string): boolean {
  return REF_MARKER.test(folded) || /^(\(|<|>|homens|mulheres|masculino|feminino|desejavel|normal|otimo|inferior|superior|ate\b|acima|abaixo|\d)/.test(folded);
}

function parseLabs(lines: string[], options: ParseOptions, warnings: ParseWarning[]): { results: LabResultSuggestion[]; groups: AnalyteGroup[] } {
  const results: LabResultSuggestion[] = [];
  // Um por código. Linha "Confira" (sem valor) cede o lugar à primeira leitura com valor do mesmo analito.
  const position = new Map<string, number>();
  const done = (code: string) => results[position.get(code) ?? -1]?.value != null;
  const put = (row: LabResultSuggestion) => {
    const at = position.get(row.code);
    if (at === undefined) {
      position.set(row.code, results.length);
      results.push(row);
    } else if (results[at]!.value === null && row.value !== null) {
      results[at] = row;
    }
  };
  /** F1.8: linha sem valor legível ou sem unidade aparece na revisão com "Confira" e sem valor preenchido. */
  const unchecked = (analyte: Analyte, rawName: string, line: string, ref: Reference | null): LabResultSuggestion => ({
    code: analyte.code, label: analyte.label, rawName, value: null, unit: null,
    referenceLow: ref?.low ?? null, referenceHigh: ref?.high ?? null, referenceText: ref?.text ?? null,
    flag: 'none', confidence: 'low', evidence: clip(line),
  });
  let section: 'blood' | 'urine' = 'blood';
  const foldedLines = lines.map(fold);
  const lineMatches = (i: number) => matchAnalyte(foldedLines[i]!, section) !== null;

  for (let i = 0; i < lines.length; i++) {
    const f = foldedLines[i]!;
    if (URINE_START.test(f)) section = 'urine';
    else if (BLOOD_START.test(f)) section = 'blood';
    const hit = matchAnalyte(f, section);
    if (!hit || done(hit.analyte.code)) continue;
    const { analyte } = hit;
    const line = lines[i]!;
    const rawName = line.slice(0, hit.end).replace(/^[\s\-•*·]+/, '').trim();

    // 1) valor na mesma linha; 2) bloco: "Resultado:" ou linha que começa com número nas próximas 6
    let read = readValue(line, hit.end);
    let valueLine = i;
    if (read === null) {
      for (let j = i + 1; j < Math.min(lines.length, i + 7) && !lineMatches(j); j++) {
        const fj = foldedLines[j]!;
        if (RESULT_MARKER.test(fj) || /^\d/.test(fj)) {
          const marker = RESULT_MARKER.exec(fj)?.[0].length ?? 0;
          // "Resultado:" sozinho na linha (coluna lida um pouco acima do valor): o número vem na próxima
          if (marker > 0 && fj.slice(marker).trim() === '') continue;
          read = readValue(lines[j]!, marker);
          valueLine = j;
          break;
        }
      }
    }
    if (read === null) continue;
    if (read === 'unreadable') {
      warnings.push({ code: 'value-unreadable', label: analyte.label, evidence: clip(line) });
      put(unchecked(analyte, rawName, line, null));
      continue;
    }
    if (read.censored) {
      warnings.push({ code: 'value-censored', label: analyte.label, evidence: clip(lines[valueLine]!) });
      put(unchecked(analyte, rawName, line, null));
      continue;
    }

    // unidade
    let rest = read.rest;
    let unit: string | null = null;
    // unidade sozinha na linha de baixo ("1,0" / "mg/dL"): o OCR quebrou a linha entre as colunas
    const below = rest.trim() === '' ? foldedLines[valueLine + 1] : undefined;
    const unitBelow = below === undefined ? null : readUnit(below);
    if (unitBelow && unitBelow.length === below!.length) {
      rest = lines[valueLine + 1]!;
      valueLine += 1;
    }
    const u = readUnit(fold(rest));
    if (u && !(analyte.unit === '' && u.unit !== '')) { unit = u.unit; rest = rest.slice(u.length); }
    let confidence: Confidence = 'high';
    let factor = 1;
    let shownUnit = analyte.unit;
    const unitMissing = unit === null && analyte.unit !== '';
    if (unitMissing) {
      warnings.push({ code: 'unit-missing', label: analyte.label, evidence: clip(lines[valueLine]!) });
    } else if (unit === null) {
      // adimensional (densidade, pH): segue com a unidade canônica ''
    } else if (unit in analyte.accepts) {
      factor = analyte.accepts[unit]!;
    } else {
      confidence = 'low'; shownUnit = unit;
      warnings.push({ code: 'unit-not-convertible', label: analyte.label, evidence: clip(lines[valueLine]!) });
    }
    const plausible: [number, number] = shownUnit === analyte.unit ? analyte.plausible : [0, Number.MAX_VALUE];
    const resolved = unitMissing ? null : resolveNumber(read.raw, factor, plausible);
    if (!unitMissing && !resolved) {
      warnings.push({ code: 'value-implausible', label: analyte.label, evidence: clip(lines[valueLine]!) });
      put(unchecked(analyte, rawName, line, null));
      continue;
    }
    if ((resolved?.ambiguous || read.ocrFixed) && confidence === 'high') confidence = 'medium';

    // referência: resto da linha ou linhas seguintes
    let refText = stripRefLabel(rest).trim();
    if (refText === '' || !/\d/.test(refText)) {
      const parts: string[] = [];
      let started = false;
      for (let j = valueLine + 1; j < Math.min(lines.length, valueLine + 7) && !lineMatches(j); j++) {
        const fj = foldedLines[j]!;
        if (RESULT_MARKER.test(fj)) break;
        if (!started) {
          if (/^(material|metodo|amostra)\b/.test(fj)) continue;
          if (!REF_MARKER.test(fj)) break;
          started = true;
          const body = lines[j]!.slice(REF_MARKER.exec(fj)![0].length).trim();
          if (body !== '') parts.push(body);
          continue;
        }
        if (!isReferenceLine(fj) && !/^[a-z -]+:\s*(<|>|\d|inferior|superior|igual|ate|acima)/.test(fj)) break;
        parts.push(lines[j]!.trim());
        if (parts.length >= 4) break;
      }
      refText = parts.join(' ');
    }
    const ref = parseReference(refText, analyte, factor, unit, options.sex);
    if (!resolved) {
      put(unchecked(analyte, rawName, line, ref));
      continue;
    }
    put({
      code: analyte.code, label: analyte.label, rawName,
      value: resolved.value, unit: shownUnit, referenceLow: ref.low, referenceHigh: ref.high, referenceText: ref.text,
      flag: computeFlag(resolved.value, ref.low, ref.high), confidence, evidence: clip(line),
    });
  }
  const groups: AnalyteGroup[] = [];
  for (const r of results) {
    const g = ANALYTES.find((a) => a.code === r.code)!.group;
    if (!groups.includes(g)) groups.push(g);
  }
  return { results, groups };
}

// ---------------------------------------------------------------- datas

const MONTHS: Record<string, number> = {
  janeiro: 1, jan: 1, fevereiro: 2, fev: 2, marco: 3, mar: 3, abril: 4, abr: 4, maio: 5, mai: 5, junho: 6, jun: 6,
  julho: 7, jul: 7, agosto: 8, ago: 8, setembro: 9, set: 9, outubro: 10, out: 10, novembro: 11, nov: 11, dezembro: 12, dez: 12,
};
const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const DATE_NUMERIC = /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g;
const DATE_LONG = new RegExp(String.raw`(?<!\d)(\d{1,2})(?:º|°)?\s*(?:de\s+)?(${MONTH_NAMES})\.?\s*(?:de\s+|/\s*)?(\d{4})(?!\d)`, 'g');

const pad = (n: number) => String(n).padStart(2, '0');
function isoDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
}

export interface FoundDate { iso: string; index: number }
/** Datas de uma linha dobrada (dd/mm/aaaa, dd.mm.aa, "12 de março de 2026"), em ordem. */
export function findDates(folded: string, today: string): FoundDate[] {
  const yy = Number(today.slice(2, 4));
  const out: FoundDate[] = [];
  for (const m of folded.matchAll(DATE_NUMERIC)) {
    const y = m[3]!.length === 2 ? (Number(m[3]) <= yy ? 2000 : 1900) + Number(m[3]) : Number(m[3]);
    const iso = isoDate(y, Number(m[2]), Number(m[1]));
    if (iso) out.push({ iso, index: m.index! });
  }
  for (const m of folded.matchAll(DATE_LONG)) {
    const iso = isoDate(Number(m[3]), MONTHS[m[2]!]!, Number(m[1]));
    if (iso) out.push({ iso, index: m.index! });
  }
  return out.sort((a, b) => a.index - b.index);
}

const COLLECTION_LABEL = /(data (da|de) coleta|coletad[oa] em|coleta\s*:|data do exame|realizad[oa] em|data de realizacao|data (do|de) atendimento|data da consulta|data de aplicacao|aplicad[oa] em)/;
const RELEASE_LABEL = /(liberad[oa] (eletronicamente )?em|data de liberacao|emitid[oa] em|data de emissao|impresso em|data do laudo|assinado em)/;
const BIRTH_LABEL = /(nascimento|nasc\.?|\bdn\b)/;
const GENERIC_LABEL = /\bdata\s*:/;

function documentDate(lines: string[], options: ParseOptions, warnings: ParseWarning[]): Suggestion<string> | null {
  const ranked: { iso: string; rank: number; evidence: string }[] = [];
  lines.forEach((line, i) => {
    const f = fold(line);
    for (const d of findDates(f, options.today)) {
      const before = f.slice(Math.max(0, d.index - 40), d.index);
      const label = before.split(/\s{2,}/).pop()!;
      if (BIRTH_LABEL.test(label)) continue;
      if (d.iso > options.today) { warnings.push({ code: 'date-in-future', label: null, evidence: clip(line) }); continue; }
      if (d.iso < '1900-01-01') continue;
      const prev = i > 0 && d.index === 0 ? fold(lines[i - 1]!) : '';
      const rank = COLLECTION_LABEL.test(label) || COLLECTION_LABEL.test(prev) ? 0 : RELEASE_LABEL.test(label) ? 1 : GENERIC_LABEL.test(label) ? 2 : 3;
      ranked.push({ iso: d.iso, rank, evidence: clip(line) });
    }
  });
  if (ranked.length === 0) return null;
  const best = Math.min(...ranked.map((r) => r.rank));
  const top = ranked.filter((r) => r.rank === best);
  if (best < 3) return { value: top[0]!.iso, confidence: best === 0 ? 'high' : 'medium', evidence: top[0]!.evidence };
  const distinct = [...new Set(top.map((r) => r.iso))].sort();
  const chosen = top.find((r) => r.iso === distinct[distinct.length - 1])!;
  return { value: chosen.iso, confidence: distinct.length === 1 ? 'medium' : 'low', evidence: chosen.evidence };
}

// ---------------------------------------------------------------- local e profissional

const PLACE_RE = /\b(laboratorio|clinica|hospital|centro (medico|de diagnostico|diagnostico)|medicina (diagnostica|laboratorial)|policlinica|ubs|unidade basica de saude|posto de saude|analises clinicas|instituto|maternidade|pronto[- ]socorro|upa)\b/;
const PLACE_LABEL = /^(local( de aplicacao| do atendimento)?|estabelecimento)\s*:\s*/;
const NOT_PLACE = /(crm|cro|coren|crf|paciente|nome\s*:|medic[oa]|dr\.|dra\.|responsavel|solicitante)/;

function cleanPlace(s: string): string {
  const cut = s.split(/\s+-\s+cnpj|\s+cnpj|\s+tel\.?\s|\s+telefone|\s+cep\s|\s+\|\s+|,\s*(rua|av\.|avenida)\b/i)[0]!;
  return clip(tidyCaps(cut.replace(/\s+/g, ' ').replace(/[\s.,;:-]+$/, '').trim()));
}

function documentLocation(lines: string[]): Suggestion<string> | null {
  for (const line of lines) {
    const m = PLACE_LABEL.exec(fold(line));
    if (m) return { value: cleanPlace(line.slice(m[0].length)), confidence: 'high', evidence: clip(line) };
  }
  for (const line of lines.slice(0, 10)) {
    const f = fold(line);
    if (PLACE_RE.test(f) && !NOT_PLACE.test(f)) return { value: cleanPlace(line), confidence: 'medium', evidence: clip(line) };
  }
  return null;
}

const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const CRM_RE = /\bCR([MO])\s*[-/:]?\s*([A-Z]{2})?\s*[-/:]?\s*(?:n[ºo°.]*\s*)?(\d{1,3}(?:\.\d{3})+|\d{3,7})(?:\s*[-/]\s*([A-Z]{2})\b)?/i;
// sem \p{L}: classe explícita, para não depender do suporte do motor de regex do Hermes
const NAME_WORD = String.raw`(?!CR[MO]\b|COREN\b)[A-ZÀ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'-]+`;
const NAME_RE = new RegExp(String.raw`\b(Dra?\.?|Dr\(a\)\.?) (${NAME_WORD}(?: (?:d[aeo]s? )?${NAME_WORD}){1,5})`);
const REQUESTER_LABEL = /^(medic[oa] solicitante|medic[oa] requisitante|solicitante|requisitante|medic[oa])\s*:\s*/;
const STAFF = /(responsavel tecnic|liberad[oa] por|assinado (eletronicamente )?por|bioquimic|biomedic|farmaceutic|\bcrf\b|crbm|crbio|coren|enf\.)/;

function council(text: string): string | null {
  const m = CRM_RE.exec(text);
  if (!m) return null;
  const uf = (m[2] ?? m[4] ?? '').toUpperCase();
  return UFS.has(uf) ? `CR${m[1]!.toUpperCase()}-${uf} ${m[3]!.replace(/\./g, '')}` : `CR${m[1]!.toUpperCase()} ${m[3]!.replace(/\./g, '')}`;
}

function documentProfessional(lines: string[], strongWithCouncil: boolean): Suggestion<string> | null {
  const near = (i: number) => council(lines[i]!) ?? (lines[i + 1] && !STAFF.test(fold(lines[i + 1]!)) ? council(lines[i + 1]!) : null);
  const compose = (name: string, crm: string | null) => clip(crm ? `${name} (${crm})` : name);
  for (let i = 0; i < lines.length; i++) {
    const f = fold(lines[i]!);
    const label = REQUESTER_LABEL.exec(f);
    if (!label || STAFF.test(f)) continue;
    const body = lines[i]!.slice(label[0].length);
    const named = NAME_RE.exec(body);
    const name = named ? `${named[1]} ${named[2]}` : body.split(/\s+-\s+|\s{2,}|\s+CR[MO]/)[0]!.trim();
    if (name) return { value: compose(name, near(i)), confidence: 'high', evidence: clip(lines[i]!) };
  }
  for (let i = 0; i < lines.length; i++) {
    if (STAFF.test(fold(lines[i]!))) continue;
    const named = NAME_RE.exec(lines[i]!);
    if (!named) continue;
    const crm = near(i);
    return { value: compose(`${named[1]} ${named[2]}`, crm), confidence: crm ? (strongWithCouncil ? 'high' : 'medium') : 'low', evidence: clip(lines[i]!) };
  }
  return null;
}

// ---------------------------------------------------------------- vacinas

const VACCINE_INDEX = VACCINE_ALIASES.flatMap((v) => v.aliases.map((alias) => ({ alias, vaccine: v }))).sort((a, b) => b.alias.length - a.alias.length);
const ORDINALS: Record<string, number> = { primeira: 1, segunda: 2, terceira: 3, quarta: 4, quinta: 5 };

const DOSE_KEYS: Record<number, DoseKey> = { 1: 'D1', 2: 'D2', 3: 'D3' };
const BOOSTER_KEYS: Record<number, DoseKey> = { 1: 'R1', 2: 'R2' };

/** Dose lida no bloco: rótulo como impresso e a chave do calendário ('OUTRA' quando não há chave própria). */
export function readDose(f: string): { key: DoseKey; label: string } | null {
  if (/dose unica|\bdu\b/.test(f)) return { key: 'DU', label: 'Dose única' };
  const ref = /(\d)?\s*(?:º|o)?\s*reforco/.exec(f);
  if (ref) return ref[1] ? { key: BOOSTER_KEYS[Number(ref[1])] ?? 'OUTRA', label: `${ref[1]}º reforço` } : { key: 'R', label: 'Reforço' };
  const n = /(\d)\s*(?:ª|a)?\s*dose|dose\s*(\d)\b|(primeira|segunda|terceira|quarta|quinta) dose/.exec(f);
  if (n) {
    const number = Number(n[1] ?? n[2] ?? ORDINALS[n[3]!]);
    return { key: DOSE_KEYS[number] ?? 'OUTRA', label: `${number}ª dose` };
  }
  if (/dose anual/.test(f)) return { key: 'ANUAL', label: 'Dose anual' };
  return null;
}

function findVaccine(f: string) {
  for (const { alias, vaccine } of VACCINE_INDEX) {
    const at = f.search(new RegExp(String.raw`(?<![a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`));
    if (at >= 0) return { vaccine, at, alias };
  }
  return null;
}

function parseVaccines(lines: string[], options: ParseOptions): VaccineSuggestion[] {
  if (!/vacin|imuniza|lote/.test(fold(lines.join('\n')))) return [];
  const out: VaccineSuggestion[] = [];
  for (let i = 0; i < lines.length; i++) {
    const hit = findVaccine(fold(lines[i]!));
    if (!hit) continue;
    const block = [lines[i]!];
    for (let j = i + 1; j < Math.min(lines.length, i + 4) && !findVaccine(fold(lines[j]!)); j++) block.push(lines[j]!);
    const text = block.join('  ');
    const f = fold(text);
    const dates = findDates(f, options.today).filter((d) => d.iso <= options.today);
    const lot = /lote\s*:?\s*([A-Z0-9][A-Z0-9/-]{2,19})/i.exec(text)?.[1] ?? null;
    const place = /(?:^|\s)(?:local|unidade|estabelecimento)\s*:\s*(.+?)(?:\s{2,}|$)/i.exec(text)?.[1] ?? null;
    const dose = readDose(f);
    const appliedOn = dates[0]?.iso ?? null;
    out.push({
      vaccineCode: hit.vaccine.code, name: hit.vaccine.label, rawName: lines[i]!.slice(hit.at, hit.at + hit.alias.length),
      doseKey: dose?.key ?? null, doseLabel: dose?.label ?? null, lot, appliedOn, location: place ? cleanPlace(place) : null,
      confidence: appliedOn && dose ? 'high' : appliedOn ? 'medium' : 'low', evidence: clip(lines[i]!),
    });
  }
  return out;
}

// ---------------------------------------------------------------- medicamentos

const RX_CONTEXT = /receit|uso oral|uso topico|uso externo|uso continuo|posologia|prescri/;
const STRENGTH = /(\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ml|ui|%)(?:\/(?:\d+(?:[.,]\d+)?\s*)?(?:ml|g|gota|dose))?)(?![a-z])/;
const ITEM_START = /^\s*(\d{1,2})\s*[).-]\s*/;
const RX_HEADER = /^(uso (oral|topico|externo|sublingual|nasal|oftalmico|inalatorio)|receit)/;
const WORD_NUMBERS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quatorze: 14, catorze: 14, quinze: 15, vinte: 20, trinta: 30 };

export function readDuration(f: string): MedicationDuration {
  if (/uso continuo|continuamente|uso cronico|sem interrupcao/.test(f)) return { kind: 'continuous' };
  const n = String.raw`(\d{1,3}|${Object.keys(WORD_NUMBERS).join('|')})`;
  const num = (s: string) => WORD_NUMBERS[s] ?? Number(s);
  let m = new RegExp(String.raw`(?:por|durante)\s+${n}\s*dias?\b`).exec(f);
  if (m) return { kind: 'days', days: num(m[1]!) };
  m = new RegExp(String.raw`(?:por|durante)\s+${n}\s*semanas?\b`).exec(f);
  if (m) return { kind: 'days', days: num(m[1]!) * 7 };
  m = new RegExp(String.raw`(?:por|durante)\s+${n}\s*(?:mes|meses)\b`).exec(f);
  if (m) return { kind: 'days', days: num(m[1]!) * 30 }; // "1 mês" = 30 dias: previsível e revisado pelo usuário
  return { kind: 'unknown' };
}

function parseMedications(lines: string[], startOn: string | null, options: ParseOptions): MedicationSuggestion[] {
  if (!RX_CONTEXT.test(fold(lines.join('\n')))) return [];
  const out: MedicationSuggestion[] = [];
  const isItem = (line: string) => {
    const f = fold(line);
    if (RX_HEADER.test(f) || /^(tomar|dar|aplicar|usar|pingar|inalar|ingerir|administrar|dissolver|mastigar|colocar|passar|instilar)\b/.test(f)) return false;
    return ITEM_START.test(line) || (/^[a-z]/.test(f) && STRENGTH.test(f));
  };
  const stop = (line: string) => {
    const f = fold(line);
    return isItem(line) || RX_HEADER.test(f) || findDates(f, options.today).length > 0 || NAME_RE.test(line) || /\bcr[mo]\b/.test(f);
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!isItem(line)) continue;
    const body = line.replace(ITEM_START, '');
    const fb = fold(body);
    const s = STRENGTH.exec(fb);
    const name = clip((s ? body.slice(0, s.index) : body.split(/\s*\.{3,}|\s{2,}|\s+-\s+/)[0]!).replace(/[\s.,;:-]+$/, '').trim());
    if (!name || !/[a-z]{3}/.test(fold(name))) continue;
    const dosage = s ? body.slice(s.index, s.index + s[1]!.length).replace(/\s+/g, ' ') : null;
    const instructions: string[] = [];
    for (let j = i + 1; j < lines.length && !stop(lines[j]!); j++) instructions.push(lines[j]!);
    const instr = instructions.length > 0 ? clip(instructions.join(' '), 300) : null;
    out.push({
      name, dosage, instructions: instr, duration: readDuration(fold([body, ...instructions].join(' '))), startOn,
      confidence: dosage && instr ? 'high' : dosage ? 'medium' : 'low', evidence: clip(line),
    });
  }
  return out;
}

// ---------------------------------------------------------------- tipo e título

const IMAGING = /(ultrassonografia|ultrassom|ecografia|tomografia|ressonancia|radiografia|raio[- ]?x|mamografia|ecocardiograma|eletrocardiograma|densitometria|endoscopia|colonoscopia|cintilografia)/;

function classify(all: string, labs: number, meds: number, vaccines: number): Suggestion<RecordType> | null {
  const ev = (re: RegExp) => clip(all.split('\n').find((l) => re.test(l)) ?? '');
  if (labs >= 3) return { value: 'result', confidence: 'high', evidence: `${labs} resultados de exame` };
  if (meds >= 1) return { value: 'prescription', confidence: 'high', evidence: `${meds} medicamento(s)` };
  if (vaccines >= 1) return { value: 'vaccine', confidence: 'high', evidence: `${vaccines} dose(s) de vacina` };
  if (labs >= 1) return { value: 'result', confidence: 'medium', evidence: `${labs} resultado(s) de exame` };
  if (/laudo|impressao diagnostica|conclusao|opiniao/.test(all) && IMAGING.test(all)) return { value: 'report', confidence: 'medium', evidence: ev(IMAGING) };
  if (/solicito|solicitacao de exame|pedido de exame|requisicao de exame/.test(all)) return { value: 'exam', confidence: 'medium', evidence: ev(/solicit|pedido|requisi/) };
  if (/receit/.test(all)) return { value: 'prescription', confidence: 'low', evidence: ev(/receit/) };
  if (/vacin/.test(all)) return { value: 'vaccine', confidence: 'low', evidence: ev(/vacin/) };
  return null;
}

// Sigla ("PSA") fica como está.
const lowerFirst = (s: string) => (/^[A-ZÀ-Ý]{2}/.test(s) ? s : s[0]!.toLowerCase() + s.slice(1));
const listTitle = (prefix: string, names: string[]) =>
  `${prefix} - ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` e mais ${names.length - 2}` : ''}`;

function suggestTitle(type: RecordType | undefined, lines: string[], labs: LabResultSuggestion[], groups: AnalyteGroup[], meds: MedicationSuggestion[], vaccines: VaccineSuggestion[]): Suggestion<string> | null {
  if (type === 'result' && groups.length > 0) {
    const hemogramOnly = groups.length === 1 && groups[0] === 'hemograma' && labs.length >= 5;
    const titles = groups.map((g) => GROUP_TITLES[g]);
    const value = hemogramOnly ? 'Hemograma completo' : groups.length === 1 ? titles[0]! : groups.length === 2 ? `${titles[0]} e ${lowerFirst(titles[1]!)}` : 'Exames laboratoriais';
    return { value, confidence: 'medium', evidence: `${labs.length} resultados` };
  }
  if (type === 'prescription') return meds.length > 0 ? { value: clip(listTitle('Receita', meds.map((m) => m.name))), confidence: 'medium', evidence: meds[0]!.evidence } : { value: 'Receita médica', confidence: 'low', evidence: '' };
  if (type === 'vaccine' && vaccines.length > 0) {
    const names = [...new Set(vaccines.map((v) => v.name))];
    return { value: clip(names.length === 1 ? `Vacina - ${names[0]}` : listTitle('Vacinas', names)), confidence: 'medium', evidence: vaccines[0]!.evidence };
  }
  if (type === 'report') {
    const line = lines.find((l) => IMAGING.test(fold(l)));
    return line ? { value: clip(tidyCaps(line)), confidence: 'medium', evidence: clip(line) } : null;
  }
  if (type === 'exam') return { value: 'Pedido de exames', confidence: 'low', evidence: '' };
  return null;
}

// ---------------------------------------------------------------- paciente (A11)

const PATIENT_LABEL = /^(?:nome do paciente|nome completo|paciente|nome|cliente)\s*:\s*|^paciente\s{2,}/;

/** Nome em "Paciente:"/"Nome:" para a checagem A11. Só em memória; nunca é salvo (P4). */
function documentPatient(lines: string[]): Suggestion<string> | null {
  for (const line of lines) {
    const label = PATIENT_LABEL.exec(fold(line));
    if (!label) continue;
    const name = line
      .slice(label[0].length)
      .split(/\s{2,}|\s+[-|]\s+|\s*\(|\s*,/)[0]!
      .replace(/[\s.;:]+$/, '')
      .trim();
    if (!/[a-z]{2}/.test(fold(name))) continue;
    return { value: clip(name), confidence: label[0].includes(':') ? 'high' : 'medium', evidence: clip(line) };
  }
  return null;
}

// ---------------------------------------------------------------- entrada

/** Puro e síncrono: texto extraído → sugestões para a tela de revisão. Nunca diagnostica. */
export function parseHealthDocument(text: string, options: ParseOptions): HealthDocumentSuggestions {
  const lines = prepareLines(text);
  const warnings: ParseWarning[] = [];
  const all = fold(lines.join('\n'));
  const { results: labResults, groups } = parseLabs(lines, options, warnings);
  const vaccines = labResults.length >= 3 ? [] : parseVaccines(lines, options);
  let date = documentDate(lines, options, warnings);
  const medications = labResults.length >= 3 ? [] : parseMedications(lines, date?.value ?? null, options);
  const recordType = classify(all, labResults.length, medications.length, vaccines.length);
  if (recordType?.value === 'vaccine') {
    const latest = vaccines.map((v) => v.appliedOn).filter((d): d is string => !!d).sort().pop();
    if (latest) date = { value: latest, confidence: 'medium', evidence: 'dose mais recente' };
  }
  const strong = recordType?.value === 'prescription' || recordType?.value === 'report';
  return {
    patientName: documentPatient(lines),
    recordType,
    title: suggestTitle(recordType?.value, lines, labResults, groups, medications, vaccines),
    date,
    location: documentLocation(lines),
    professional: documentProfessional(lines, strong),
    labResults,
    vaccines,
    medications,
    warnings,
  };
}
