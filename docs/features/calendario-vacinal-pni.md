# Calendário vacinal de referência (PNI 2026)

> Levantado em 11/11/2026 pela Head de Produto (docs/team/HEAD_DE_PRODUTO.md) para a F3 da v0.2 (`docs/features/v0.2-saude-da-familia.md`).
> Este arquivo vira dado no app (catálogo `vaccine-schedule`). **Precisão importa mais que completude**: o que não foi confirmado na fonte oficial está marcado com ⚠️ e não deve virar regra automática.
> No app, toda recomendação aparece com o rótulo **"Referência do calendário público. Confirme com o profissional de saúde."**

## 1. Fonte e versão

| Documento | Versão / data | URL | Uso aqui |
|---|---|---|---|
| **Instrução Normativa do Calendário Nacional de Vacinação, Ano 2026** (MS/SVSA/DPNI/CGICI) | "4ª edição da Instrução Normativa do CNV Ano 2026, atualizada em 08.10.2026" (texto da última página). Página publicada em 06/07/2026 e atualizada em 26/10/2026. PDF de 60 páginas, SHA-256 `3395abd5bc0659aec19149a3f6df815ceeebb58f81ebbc125e73daba3f290fc8` | https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf (página: …`.pdf/view`) | **Fonte primária.** Idades, janelas e intervalos. |
| Calendários por faixa etária 2026 (criança, adolescente e jovem, adulto, idoso, gestante) | PDFs com título "Calendário Nacional de Vacinação 2026"; metadado de modificação 28/10/2026. A página não mostra data. | https://www.gov.br/saude/pt-br/vacinacao/calendario → `…/vacinacao/arquivos/calendario-nacional-de-vacinacao-{crianca,adolescentes-jovens,adulto,idoso,gestante}` | Conferência cruzada e reforços de dT aos 24 e 34 anos. |

Consultadas e **descartadas** como fonte: notícias da SBIm e de blogs de residência médica, e o quadro estadual do Espírito Santo de fevereiro de 2026. Esse quadro traz a tetraviral aos 15 meses, que diverge da IN de outubro. Servem só de pista.

Acesso em 11/11/2026. **Revisar a cada nova edição da IN.** Quando o MS publicar uma edição nova, o catálogo sobe de versão (`PNI-2026-ed4` → próxima) e a mudança é registrada neste arquivo.

## 2. Convenções para virar dado

- **Idade** em meses (`m`) ou anos (`a`) completos, contada a partir de `Member.birthDate`. "Até 4 anos, 11 meses e 29 dias" vira `< 5a`, ou seja, até a véspera do 5º aniversário.
- **Recomendada** é a idade da agenda oportuna. **Janela** é o intervalo em que o calendário ainda indica aplicar (atualização do cartão). Fora da janela, o app não cria pendência.
- **Série** agrupa doses que contam juntas. Uma dose conta para a série se o `vaccineCode` registrado estiver na coluna "Conta como".
- **Automática** = o app pode calcular a pendência só com a idade. "Não" = depende de condição que o app não conhece (gestação, profissão, etnia, comorbidade, área de risco). Essas linhas aparecem só como referência.
- Intervalos "mínimos em situação excepcional" da IN não são usados pelo app. Ele mostra o intervalo recomendado.
- `doseKey` usa só os valores da spec §6 (`D1`…`OUTRA`). A dose de hepatite B ao nascer é `DU` com rótulo "Dose ao nascer" (revisão de 11/11/2026; a tabela dizia `RN`, fora da lista).
- Os códigos desta seção são os únicos aceitos em `vaccineCode`; os aliases do OCR (`ocr-tecnico.md` Apêndice B.2) foram alinhados a eles em 11/11/2026. VPC13 e VPC15 da rede privada não têm código: são registradas como `other` e não contam para a série `pcv` (⚠️ a confirmar com a Head de Produto).

### Códigos de vacina sugeridos

| Código | Vacina (nome na IN) | Sigla |
|---|---|---|
| `hepatitis_b` | Hepatite B (recombinante) | HB |
| `bcg` | BCG (atenuada) | BCG |
| `penta` | Penta: difteria, tétano, pertussis, hepatite B e *H. influenzae* b | DTP+HB+Hib |
| `ipv` | Poliomielite 1, 2 e 3 (inativada) | VIP |
| `rotavirus` | Rotavírus humano G1P[8] (atenuada) | VRH |
| `pcv20` | Pneumocócica 20-valente (conjugada) | VPC20 |
| `pcv10` | Pneumocócica 10-valente (conjugada) | VPC10 |
| `menc` | Meningocócica C (conjugada) | men C |
| `menacwy` | Meningocócica ACWY (conjugada) | men ACWY |
| `influenza` | Influenza trivalente (fragmentada, inativada) | INF3 |
| `covid19` | Covid-19 (RNAm) | covid-19 |
| `yellow_fever` | Febre amarela (atenuada) | VFA |
| `mmr` | Sarampo, caxumba e rubéola (tríplice viral) | SCR |
| `mmrv` | Tetraviral (sarampo, caxumba, rubéola e varicela). Não está entre as 21 da IN. Aparece como substituta da varicela monovalente quando falta estoque, e da tríplice viral em criança alérgica à proteína do leite quando falta SCR sem lactoalbumina (D1 e D2 com tetraviral completam SCR e varicela) | SCRV |
| `dtp` | Difteria, tétano e pertussis (tríplice bacteriana) | DTP |
| `varicella` | Varicela monovalente (atenuada) | VZ |
| `hepatitis_a` | Hepatite A (inativada) | HA |
| `hpv4` | Papilomavírus humano 6, 11, 16 e 18 (recombinante) | HPV4 |
| `dengue` | Dengue 1, 2, 3 e 4 (recombinante e atenuada) | DNG4 |
| `dt` | Dupla adulto (difteria e tétano) | dT |
| `dtpa` | Tríplice bacteriana acelular adulto | dTpa |
| `rsv` | Vírus sincicial respiratório A e B (recombinante) | VVSR |
| `other` | Vacina fora do calendário (ex.: rede privada). Exige `vaccineName` | — |

## 3. Criança (0 a 9 anos)

| Vacina | Código | Série / dose (`doseKey`) | Recomendada | Janela | Intervalo | Conta como | Autom. | Observações |
|---|---|---|---|---|---|---|---|---|
| Hepatite B | `hepatitis_b` | `hb_birth` / DU (dose ao nascer) | ao nascer (até 12 h) | 0 a < 1 m | — | `hepatitis_b` | Sim | "Somente deverá ser administrada até 1 mês de vida." Depois disso, as doses seguem pela penta. |
| BCG | `bcg` | `bcg` / DU | ao nascer | 0 a < 5a | — | `bcg` | Sim | De 1 m a < 5a, a IN exige avaliação do serviço (criança assintomática e sem imunodepressão). Copy da pendência: "Confirme com a unidade de saúde". |
| Penta | `penta` | `dtp_series` / D1, D2, D3 | 2 m, 4 m, 6 m | 2 m a < 7a | 60 dias | `penta` | Sim | Contraindicada a partir de 7 anos. Na atualização em atraso, a D3 não deve ser aplicada antes dos 6 meses de idade, e a D1 e a D3 precisam de pelo menos 4 meses entre elas (componente hepatite B). |
| Poliomielite inativada | `ipv` | `polio` / D1, D2, D3 | 2 m, 4 m, 6 m | 2 m a < 5a | 60 dias | `ipv` | Sim | A VOP ("gotinha") não está entre as 21 vacinas da IN 2026. |
| Poliomielite inativada | `ipv` | `polio` / R1, R2 | 15 m, 4a | até < 5a | R1 ≥ 6 meses após D3; R2 ≥ 6 meses após R1 | `ipv` | Sim | Reforços com VIP (Nota Técnica nº 64/2026 citada na IN). |
| Rotavírus | `rotavirus` | `rotavirus` / D1 | 2 m | 1 m 15 d a < 12 m | 60 dias | `rotavirus` | Sim | Fora da janela, "perde-se a oportunidade". Sem D1 até 11 m 29 d, a D2 também não se aplica. |
| Rotavírus | `rotavirus` | `rotavirus` / D2 | 4 m | 3 m 15 d a < 24 m | 60 dias após D1 | `rotavirus` | Sim | Limite de 23 m 29 d confirmado na IN e no PDF da criança. |
| Pneumocócica | `pcv20` | `pcv` / D1 | 2 m | 2 m a < 12 m | 60 dias | `pcv20`, `pcv10` | Sim | Esquema básico (D1, D2) só antes dos 12 m. A partir de 12 m, a criança sem histórico recebe dose única (ver linha R). |
| Pneumocócica | `pcv10` | `pcv` / D2 | 4 m | até < 12 m | 60 dias | `pcv10`, `pcv20` | Sim | "Durante o período de transição", a D2 é com VPC10. De 5 a 10 m com 1 dose prévia de VPC10, a D2 é com VPC20. Aos 11 m sem histórico: 1 dose + reforço, sem D2. Sem VPC10 no estoque, a IN manda completar com VPC20. ⚠️ A data de fim da transição não foi publicada. |
| Pneumocócica | `pcv20` | `pcv` / R | 12 m | 12 m a < 5a | 60 dias após a última dose do esquema básico | `pcv20`, `pcv10` | Sim | De 13 m a < 5a: sem histórico, dose única de VPC20; com 1 ou 2 doses antes dos 12 m, 1 reforço de VPC20; com 1 dose de VPC10 a partir dos 12 m, "considerar vacinado". Quem recebeu 2 doses + reforço de VPC10 também é considerado vacinado. Regra para o app: uma dose a partir dos 12 m completa a série. |
| Meningocócica C | `menc` | `mening` / D1, D2 | 3 m, 5 m | 3 m a < 12 m | 60 dias | `menc` | Sim | ⚠️ Conflito interno: "Idade para vacinação" diz 3 m a 11 m 29 d, e "Atualização" diz "até os 4 anos, 11 meses e 29 dias". De 12 m a < 5a a IN indica dose única de ACWY. Use `< 12 m`. Aos 11 m sem histórico: 1 dose de men C + reforço de ACWY após 60 dias, sem D2. |
| Meningocócica ACWY | `menacwy` | `mening` / R | 12 m | 12 m a < 5a | 60 dias após D2 de men C | `menacwy`, `menc` | Sim | De 12 m a < 5a sem histórico: dose única ACWY. Com men C nessa faixa: "considerar vacinado". |
| Influenza | `influenza` | `influenza` / anual | a partir de 6 m | 6 m a < 6a | Primeira vez: 2 doses com 30 dias. Depois, 1 dose por ano | `influenza` | Sim | ⚠️ A "temporada" é tratada como ano civil. É uma regra do app, não da IN. |
| Covid-19 | `covid19` | `covid_infant` / D1, D2, D3 | 6 m, 7 m, 9 m | 6 m a < 5a | ≥ 4 semanas entre D1 e D2; ≥ 8 semanas entre D2 e D3 | `covid19` | Sim | Pfizer/Comirnaty. Doses anuais ou semestrais para grupos especiais: não automático. |
| Febre amarela | `yellow_fever` | `yf` / D1 | 9 m | 9 m a < 60a | — | `yellow_fever` | Sim | Recomendada em todo o país de 9 m a 59 a. De 6 a 8 m, só em exceção (não automático). |
| Febre amarela | `yellow_fever` | `yf` / R | 4a | até < 5a | ≥ 30 dias após D1 | `yellow_fever` | Sim | Só se D1 foi antes dos 5 anos. Dose única a partir de 5 anos completa o esquema. |
| Tríplice viral | `mmr` | `mmr` / D1, D2 | 12 m, 15 m | 12 m a < 30a | 30 dias | `mmr`, `mmrv` | Sim | Em menores de 2 anos, não aplicar junto com febre amarela (intervalo de 30 dias). Não vira regra: só aparece como observação. |
| DTP | `dtp` | `dtp_series` / R1, R2 | 15 m, 4a | até < 7a | ≥ 6 meses após D3 de penta; ≥ 6 meses entre R1 e R2 | `dtp` | Sim | Se não der para fazer o R2 antes dos 7 anos, a criança fica dispensada dele e o próximo reforço é 1 dT 10 anos após o R1. |
| Varicela | `varicella` | `varicella` / D1, D2 | 15 m, 4a | 15 m a < 7a | 3 meses (1 a 12 anos); 8 semanas a partir de 13 anos | `varicella`, `mmrv` | Sim | Só para quem não teve a doença. Copy: "Se já teve catapora, informe ao profissional." A tetraviral substitui a monovalente quando falta estoque. |
| Hepatite A | `hepatitis_a` | `hepatitis_a` / DU | 15 m | 15 m a < 5a | — | `hepatitis_a` | Sim | |
| HPV4 | `hpv4` | `hpv` / DU | 9a | 9a a < 15a | — | `hpv4` | Sim | Meninas e meninos, dose única. Resgate de 15 a 19 anos "conforme a organização do estado": não automático. |
| Pneumocócica 20 | `pcv20` | — / DU | 5a | — | — | — | Não | Só para povos indígenas sem pneumo conjugada. |

## 4. Adolescente (10 a 19 anos) e jovem (20 a 24 anos)

| Vacina | Código | Série / dose | Recomendada | Janela | Intervalo | Conta como | Autom. | Observações |
|---|---|---|---|---|---|---|---|---|
| Dengue | `dengue` | `dengue` / D1, D2 | 10a | 10a a < 15a | 3 meses | `dengue` | Sim ⚠️ | A IN lista "população com idade entre 10 anos e 14 anos, 11 meses e 29 dias". ⚠️ Não foi confirmado se a oferta é universal em todos os municípios. Copy: "Confirme a oferta na sua unidade de saúde." Usar vacinas do mesmo laboratório. |
| Meningocócica ACWY | `menacwy` | `menacwy_teen` / DU | 11a | 11a a < 15a | — | `menacwy` | Sim | "Dose ou reforço conforme situação vacinal encontrada." |
| dT | `dt` | `dt_booster` / R | 14a | — | 10 anos após R2 de DTP (4a) | `dt`, `dtpa`, `dtp`, `penta` | Sim | Depois, 1 dose a cada 10 anos (24a, 34a…). Antecipar para 5 anos após exposição de risco: não automático. |
| HPV4 | `hpv4` | `hpv` / DU | — | 15a a < 20a | — | `hpv4` | Não | Resgate estadual para não vacinados. |
| Hepatite B | `hepatitis_b` | `hb_adult` / 3 doses | conforme histórico | ≥ 7a | 0, 1 e 6 meses | `hepatitis_b`, `penta` | Sim (confirmar) | Sem 3 doses registradas, o status é "Confirmar na carteira". Não reiniciar o esquema. |
| Tríplice viral | `mmr` | `mmr` / 2 doses | conforme histórico | < 30a | 30 dias | `mmr`, `mmrv` | Sim (confirmar) | |
| Febre amarela | `yellow_fever` | `yf` / 1 dose | conforme histórico | 5a a < 60a | — | `yellow_fever` | Sim (confirmar) | Tem dose a partir de 5a, ou 2 doses antes dos 5a: completo. 1 dose antes dos 5a: falta 1 reforço. |
| Varicela, pneumo 20 | — | — | — | — | — | — | Não | Só para trabalhadores da saúde ou povos indígenas. |

## 5. Adulto (25 a 59 anos)

| Vacina | Código | Série / dose | Regra | Conta como | Autom. | Observações |
|---|---|---|---|---|---|---|
| Hepatite B | `hepatitis_b` | `hb_adult` | 3 doses (0, 1 e 6 meses) conforme histórico | `hepatitis_b`, `penta` | Sim (confirmar) | |
| dT | `dt` | `dt_basic` + `dt_booster` | Sem 3 doses com toxoide diftérico e tetânico: completar 3 doses (60 dias). Depois, reforço a cada 10 anos após a última dose | `dt`, `dtpa`, `dtp`, `penta` | Sim | PDF do adulto: "1 dose de reforço aos 34 anos e, na sequência, 1 dose a cada 10 anos". O app calcula pela última dose registrada. Sem nenhuma dose registrada: "Confirmar na carteira". |
| Febre amarela | `yellow_fever` | `yf` | 1 dose se não vacinado (até < 60a) | `yellow_fever` | Sim (confirmar) | |
| Tríplice viral | `mmr` | `mmr` | Até 29a: 2 doses. De 30 a 59a: 1 dose | `mmr`, `mmrv` | Sim (confirmar) | Trabalhador da saúde: 2 doses em qualquer idade (não automático). |
| Varicela, pneumo 20 | — | — | Só para trabalhadores da saúde ou povos indígenas | — | Não | |
| dTpa | `dtpa` | — | Profissionais de saúde de qualquer área, parteiras tradicionais e estagiários da saúde que atuam em maternidade ou internação neonatal | — | Não | Nesse grupo, a dTpa também substitui a dT nos reforços a cada 10 anos. |

## 6. Idoso (60 anos ou mais)

| Vacina | Código | Série / dose | Regra | Conta como | Autom. | Observações |
|---|---|---|---|---|---|---|
| Influenza | `influenza` | `influenza` / anual | 1 dose a cada temporada | `influenza` | Sim | ⚠️ Temporada tratada como ano civil (regra do app). |
| Covid-19 | `covid19` | `covid_periodic` | 1 dose a cada 6 meses, com mínimo de 6 meses desde a última | `covid19` | Sim | "Independentemente do número de doses previamente recebidas." |
| Pneumocócica 20 | `pcv20` | `pcv_elder` / DU | A partir de 85a: todos os não vacinados | `pcv20` | Sim | De 60 a 84a, só para acamados ou institucionalizados: não automático. |
| Hepatite B, dT | — | como no adulto | como no adulto | — | Sim | |
| Febre amarela | `yellow_fever` | — | Só em casos excepcionais (área com circulação), com avaliação caso a caso | — | Não | |
| Tríplice viral | `mmr` | — | Só para trabalhador da saúde | — | Não | |
| Varicela | `varicella` | — | Só para trabalhadores da saúde e povos indígenas, com avaliação | — | Não | |

## 7. Gestante (não automático na v0.2)

O app não sabe quem está grávida. A v0.2 mostra estas linhas só como referência, sem pendência. O status "gestação" fica para depois (P2 na spec).

| Vacina | Código | Quando | Dose | Observações |
|---|---|---|---|---|
| dTpa | `dtpa` | a partir da 20ª semana | 1 dose em cada gestação | Puérpera até 45 dias pós-parto, se não vacinada na gestação. Esquema incompleto: combinar dT + dTpa, conforme a IN. |
| VSR (VVSR A e B) | `rsv` | a partir da 28ª semana | 1 dose em cada gestação | Sem limite de idade materna nem limite superior de idade gestacional, exceto em trabalho de parto ativo. |
| Hepatite B | `hepatitis_b` | ao saber da gravidez | 3 doses conforme histórico | Concluir até 45 dias do puerpério se não der na gestação. Não reiniciar o esquema. |
| dT | `dt` | ao saber da gravidez | 3 doses conforme histórico | |
| Influenza | `influenza` | qualquer fase | 1 dose por temporada | Pós-parto até 45 dias se não vacinada. |
| Covid-19 | `covid19` | qualquer idade gestacional | 1 dose em cada gestação | Mínimo de 6 meses desde a última dose. |
| Febre amarela | `yellow_fever` | só em exceção | 1 dose | Só em área com circulação confirmada, com avaliação de risco e benefício. |

## 8. O que não foi confirmado ou ficou fora

- ⚠️ **Men C, idade máxima.** Há conflito dentro da IN (11 m 29 d × 4 a 11 m 29 d). O app usa `< 12 m` porque, a partir de 12 m, a IN indica ACWY em dose única.
- ⚠️ **Pneumo, fim da transição VPC10 → VPC20** para a D2: sem data na fonte. Por isso o app aceita as duas vacinas em qualquer dose da série `pcv`.
- ⚠️ **Dengue:** não confirmamos se a oferta de 10 a 14 anos é universal em todos os municípios em 2026.
- ⚠️ **Temporada de influenza:** a IN fala em "temporada", e as campanhas variam por região. O app usa o ano civil como aproximação e deixa isso explícito na copy.
- ⚠️ **Tolerância de 30 dias** antes de chamar uma dose de "atrasada": é regra de produto (spec F3), não do PNI.
- Não levantados: grupos especiais do CRIE (imunodeprimidos, comorbidades, transplantados), profilaxia pós-exposição, BCG para contatos de hanseníase, doses fracionadas de febre amarela de 2018, condutas de bloqueio de surto e vacinas da rede privada sem equivalente no SUS. Nada disso vira regra automática.
- O PDF da IN foi lido por extração de texto. Os PDFs por faixa etária são imagem e foram lidos visualmente. Se o texto e a imagem divergirem, vale a IN.

## 9. Forma sugerida do dado (para o Mobile)

```ts
// entities/vaccine/domain/schedule.ts: catálogo puro, versionado
interface VaccineScheduleRule {
  id: string;                 // 'penta_d1'
  catalogVersion: 'PNI-2026-ed4';
  series: string;             // 'dtp_series'
  ordinal: number;            // posição na série (1 = D1). Conta doses registradas de `countsAs`
  doseKey: DoseKey;           // 'D1' | 'D2' | 'D3' | 'R1' | 'R2' | 'R' | 'DU' | 'ANUAL' | 'PERIODICA' (o 'OUTRA' da spec só existe na dose registrada)
  vaccineCode: string;        // vacina indicada nesta dose
  countsAs: string[];         // códigos que contam para a série
  recommended: Age | null;    // agenda oportuna; null = "conforme histórico"
  windowStart: Age;
  windowEnd: Age | null;      // exclusivo (véspera do aniversário); null = sem limite
  repeatEveryMonths?: number; // dT 120; covid idoso 6; influenza = ano civil (tratado à parte)
  minIntervalFromPreviousDays?: number; // intervalo recomendado da IN (ex.: 60)
  automatic: boolean;
  note?: string;              // texto calmo exibido na carteira
}
type Age = { months: number; days?: number }; // 1 m 15 d = { months: 1, days: 15 }; 5a = { months: 60 }
```

Idade por calendário: `birthDate + months + days`, nunca `N × 30` dias. "< 5a" quer dizer antes do 5º aniversário. Os valores entram em `schedule.test.ts` com os limites desta tabela (véspera e dia exato).

## 10. Revisão independente

Feita em 11/11/2026 por um verificador independente, sem partir do texto acima. Baixei de novo e li as fontes oficiais:

- IN do CNV 2026, 4ª edição (08/10/2026): https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf. O SHA-256 bate com o da seção 1 (`3395abd5…90fc8`). A página `…pdf/view` mostra "Publicado em 06/07/2026" e "Atualizado em 26/10/2026". Li o texto extraído das 60 páginas.
- PDFs por faixa etária: https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-{crianca,adolescentes-jovens,adulto,idoso,gestante}. O metadado de modificação de todos é 28/10/2026. Vi a imagem do adulto (reforço de dT aos 34 anos) e a primeira página do adolescente (dT aos 14 e aos 24 anos).
- Calendários técnicos (PDF, com data de 30/01/2026 e 04/02/2026, anteriores à IN): https://www.gov.br/saude/pt-br/composicao/svsa/pni/calendario-tecnico/calendario-tecnico-nacional-de-vacinacao-{crianca,adolescentes-jovens,adulto}. Usados só para conferir intervalos. Se divergirem, vale a IN.

### Correções feitas no arquivo

| Item | Antes | Depois | Fonte (IN 2026) |
|---|---|---|---|
| Pneumocócica D1 e D2, janela | `2 m a < 5a` / `até < 5a` | `< 12 m` nas duas | VPC 10 indicada "de 4 meses até 11 meses e 29 dias". De 13 m a < 5a sem histórico: "dose única com VPC 20". Uma dose de VPC 10 a partir dos 12 m: "considerar vacinado". Com a janela antiga, o app cobraria D1 + D2 + R de uma criança de 2 anos, que só precisa de 1 dose. |
| Pneumocócica R, janela e intervalo | `até < 5a`, 60 dias após D2 | `12 m a < 5a`, 60 dias após a última dose do esquema básico, com as regras de atualização de 12 m a < 5a | Itens "Criança aos 12 meses" e "Criança entre 13 meses e 4 anos, 11 meses e 29 dias". |
| Pneumocócica D2, observação | — | De 5 a 10 m com 1 VPC 10, a D2 é com VPC 20. Aos 11 m sem histórico, 1 dose + reforço. Sem VPC 10 no estoque, completar com VPC 20 | Atualização da VPC 20 e precauções da VPC 10/VPC 20. |
| Varicela, intervalo | `—` | 3 meses (1 a 12 anos); 8 semanas a partir de 13 anos | "Intervalos recomendados para vacinação contra varicela (2 doses)". |
| Men C aos 11 m | não citado | 1 dose de men C + reforço de ACWY, sem D2 | Item "Criança aos 11 meses de idade" da men C. |
| DTP R2 perdido | não citado | Sem R2 antes dos 7 anos: dispensado, e 1 dT 10 anos após o R1 | Atualização da DTP. |
| Penta, atraso | não citado | D3 não antes dos 6 meses; pelo menos 4 meses entre D1 e D3 | Atualização da penta. |
| Nome da dengue | "(atenuada)" | "(recombinante e atenuada)" | Lista das 21 vacinas, item 20. |
| Tetraviral | só substituta da varicela | também substituta da SCR em alérgicos à proteína do leite | Contraindicações da SCR (NT nº 49/2025) e nota da varicela. |
| dTpa no adulto, grupo | "profissionais de saúde, parteiras e estagiários com recém-nascidos" | profissionais de saúde de qualquer área, parteiras tradicionais e estagiários de maternidade ou internação neonatal, com dTpa também nos reforços | Item 1 (dTpa), "Idade para vacinação e/ou grupo recomendado". |

### Conferido sem mudança

Hepatite B ao nascer (até 1 mês), BCG (até 4 a 11 m 29 d), VIP (2, 4 e 6 m; reforços aos 15 m e 4 a, com 6 meses de intervalo, até < 5a), rotavírus (limites do Quadro 1), men ACWY (12 m; 11 a 14 anos), influenza (6 m a 5 a 11 m 29 d; 2 doses com 30 dias na primovacinação; idoso anual; gestante), covid-19 (6, 7 e 9 m, Pfizer; 4 e 8 semanas; idoso a cada 6 meses; gestante 1 dose por gestação, com 6 meses desde a última), febre amarela (Quadro 2), SCR (12 e 15 m; 2 doses até 29 anos, 1 dose de 30 a 59), hepatite A, HPV4 (9 a 14 anos; resgate de 15 a 19), dengue (10 a 14 anos, 2 doses com 3 meses), dT (14 anos; a cada 10 anos), PCV20 no idoso e em indígenas, dTpa e VSR na gestante. O conflito da men C (11 m 29 d na idade × 4 a 11 m 29 d na atualização) existe no texto da IN, como o arquivo diz.

### Não confirmado

- Os PDFs-imagem da criança, do idoso e da gestante não foram conferidos visualmente nesta revisão. As linhas dessas faixas foram conferidas só contra a IN.
- Não sei se a oferta de dengue de 10 a 14 anos é universal em todos os municípios. A IN lista a faixa sem restrição territorial, mas isso não comprova a oferta local.
- O quadro estadual do Espírito Santo, citado na seção 1, não foi consultado.
- A data de fim da transição VPC 10 → VPC 20 não aparece na IN.
