// Aliases de vacina para o parser do OCR: Apêndice B.2 de docs/features/ocr-tecnico.md.
// Os códigos são os de docs/features/calendario-vacinal-pni.md §2; o teste confere cada um.
// VPC13/VPC15 (rede privada) ficam sem alias: viram 'other' na revisão.

export interface VaccineAlias {
  code: string;
  label: string;
  /** Normalizados: minúsculas, sem acento. */
  aliases: string[];
}

export const VACCINE_ALIASES: VaccineAlias[] = [
  { code: 'bcg', label: 'BCG', aliases: ['bcg'] },
  { code: 'hepatitis_b', label: 'Hepatite B', aliases: ['hepatite b', 'hep b', 'hepb'] },
  { code: 'penta', label: 'Pentavalente (DTP/Hib/HB)', aliases: ['pentavalente', 'penta', 'dtp/hib/hb', 'dtp+hib+hb'] },
  { code: 'ipv', label: 'Poliomielite inativada (VIP)', aliases: ['vip', 'poliomielite inativada', 'polio inativada', 'poliomielite 1, 2 e 3 (inativada)'] },
  { code: 'rotavirus', label: 'Rotavírus', aliases: ['rotavirus humano', 'rotavirus', 'vrh'] },
  { code: 'pcv10', label: 'Pneumocócica 10-valente', aliases: ['pneumo 10', 'vpc10', 'pneumococica 10'] },
  // Sem valência no texto: sugere a VPC20 (a do calendário atual) com confiança baixa; a pessoa confere.
  { code: 'pcv20', label: 'Pneumocócica 20-valente', aliases: ['pneumo 20', 'vpc20', 'pneumococica 20', 'pneumococica conjugada', 'pneumococica'] },
  { code: 'menc', label: 'Meningocócica C', aliases: ['meningococica c', 'meningo c', 'menc'] },
  { code: 'menacwy', label: 'Meningocócica ACWY', aliases: ['meningococica acwy', 'meningo acwy', 'menacwy', 'acwy'] },
  { code: 'yellow_fever', label: 'Febre amarela', aliases: ['febre amarela', 'vfa'] },
  { code: 'mmr', label: 'Tríplice viral (SCR)', aliases: ['triplice viral', 'scr', 'sarampo, caxumba e rubeola'] },
  { code: 'mmrv', label: 'Tetra viral (SCRV)', aliases: ['tetra viral', 'scrv'] },
  { code: 'varicella', label: 'Varicela', aliases: ['varicela', 'catapora'] },
  { code: 'hepatitis_a', label: 'Hepatite A', aliases: ['hepatite a', 'hep a', 'hepa'] },
  { code: 'dtp', label: 'Tríplice bacteriana (DTP)', aliases: ['triplice bacteriana', 'dtp'] },
  { code: 'dtpa', label: 'dTpa (tríplice acelular adulto)', aliases: ['triplice bacteriana acelular', 'dtpa'] },
  { code: 'dt', label: 'Dupla adulto (dT)', aliases: ['dupla adulto', 'dt (dupla adulto)'] },
  { code: 'hpv4', label: 'HPV', aliases: ['hpv', 'papilomavirus'] },
  { code: 'influenza', label: 'Influenza', aliases: ['influenza', 'gripe'] },
  { code: 'covid19', label: 'Covid-19', aliases: ['covid-19', 'covid 19', 'covid', 'sars-cov-2'] },
  { code: 'dengue', label: 'Dengue', aliases: ['dengue', 'qdenga'] },
  { code: 'rsv', label: 'Vírus sincicial respiratório (VSR)', aliases: ['virus sincicial respiratorio', 'vsr', 'vvsr'] },
];
