# Prontuário da Família — Produto

<!-- impeccable:product-schema 1 -->

> Versão do documento: v0.2 · 11/11/2026 · dona: **Head de Produto clínico** (`docs/team/HEAD_DE_PRODUTO.md`), que decide escopo, prioridade e critérios de aceite. Até a v0.1, o dono era o Tech Lead Prontuário.
> Revisão de 11/11/2026, a pedido do Douglas: OCR e acompanhamento de saúde saem de "Fora" e entram na v0.2 "Saúde da família" (`docs/features/v0.2-saude-da-familia.md`).

## Problema

Cada atendimento de saúde gera documentos — pedido de exame, resultado, laudo, receita, carteira de vacina — que ficam espalhados entre clínicas, laboratórios, hospitais e planos. Quase tudo já chega em formato digital (PDF por e-mail, portal do laboratório, foto do papel), mas ninguém consegue achar "aquele hemograma de 2024 da minha filha" na hora da consulta. Quem cuida da saúde da família (normalmente uma pessoa) vira o arquivo vivo de todo mundo.

## Proposta de valor

**Todo o histórico de saúde da sua família, num lugar só, achado em segundos.**

1. **Reunir** — importar PDF, foto (câmera/galeria) ou arquivo em menos de 30 segundos.
2. **Organizar** — cada documento vira um registro com tipo, data, local e profissional, ligado a um membro da família.
3. **Encontrar** — linha do tempo por pessoa, filtro por tipo e busca por texto.
4. **Acompanhar** (v0.2) — exames com tendência, vacinas e pendências pelo calendário público, medicamentos em uso e sinais vitais, por pessoa e para a família toda.
5. **Proteger** — dados de saúde são sensíveis (LGPD art. 11): acesso só da família, arquivos privados, consentimento explícito, exclusão e exportação a qualquer momento.

## Personas

| Persona | Contexto | O que precisa |
|---|---|---|
| **Ana, 38, "cuidadora da família"** (principal) | Mãe de 2 filhos, cuida também da mãe idosa. Recebe resultados por e-mail e WhatsApp, guarda papéis numa pasta. | Juntar tudo rápido, achar o exame certo na frente do médico, saber quando foi a última vacina. |
| **Carlos, 67, paciente crônico** | Hipertenso e diabético, várias especialidades. Os médicos pedem "os últimos exames". | Mostrar a sequência de resultados e as receitas em uso, com letra grande e poucos toques. |
| **Júlia, 29, cônjuge colaboradora** (pós-MVP) | Divide os cuidados com o parceiro. | Ver e adicionar documentos na mesma família (convite de segundo responsável — v0.4; era v0.3 antes da renumeração de 11/11/2026). |

## Jornadas principais (MVP)

1. **Primeiro uso** — boas-vindas (3 telas curtas) → aceite destacado do termo e do tratamento de dados de saúde → login por e-mail com código (ou Apple/Google) → criar família ("Família Silva") → adicionar membros (eu, cônjuge, filhos, pais).
2. **Guardar um documento** — botão "Adicionar" → escolher membro → tipo (consulta, exame, resultado, laudo, receita, vacina, outro) → data, local, profissional, notas → anexar PDF/foto (câmera, galeria ou arquivo) → salvar. Meta: < 30 s.
3. **Encontrar na consulta** — abrir membro → linha do tempo agrupada por mês → filtrar por "Resultado" → abrir detalhe → ver o anexo em tela cheia.
4. **Buscar** — busca global por texto ("hemograma", "Dr. Paulo", "Fleury") em todos os membros.
5. **Controle dos dados** — Ajustes → exportar meus dados · revogar consentimento · excluir conta (confirmação dupla, apaga tudo).

## Platform

adaptive

iOS 26 e Android a partir do mesmo código. Cada plataforma usa os controles do sistema (Liquid Glass na tab bar e no header do iOS 26, Material 3 no Android). A direção visual fica no `DESIGN.md`; em 11/11/2026 o Douglas reabriu a direção "Cuidado sereno" por achá-la parecida com outras entregas de IA. Na web e no Expo Go, recursos nativos como o OCR caem para o preenchimento manual.

## Positioning

O prontuário é do paciente, não da clínica: a família junta, num lugar só, o que hoje está espalhado entre laboratórios, clínicas, médicos, planos e o SUS. O documento original é a fonte da verdade. Os valores estruturados (exames, vacinas, medicamentos, sinais vitais) saem dele por leitura feita no próprio aparelho, sempre revisada pela pessoa, e cada valor fica na faixa de referência impressa no próprio laudo, nunca numa interpretação do app.

## Operating Context

- Quem usa é a cuidadora (Ana) no celular: na sala de espera, na frente do médico ("me mostra os últimos exames"), na mesa da cozinha com a pasta de papéis, ou quando o resultado chega por e-mail ou WhatsApp.
- Os documentos reais são brasileiros: laudo de laboratório em PDF ou foto, receita médica, pedido de exame, a Caderneta de Saúde da Criança e o cartão de vacina (papel, com carimbo e lote), e o calendário vacinal do PNI.
- O Carlos (67 anos, crônico) mostra a sequência de resultados ao médico, com letra grande e poucos toques.

## Capabilities and Constraints

- Leitura do documento no aparelho (Apple Vision/PDFKit no iOS, ML Kit no Android), até 5 páginas e 20 s; nada extraído é salvo sem revisão.
- Dados de saúde são sensíveis (LGPD art. 11): consentimento destacado e versionado, exportação e exclusão pelo titular; dados no Brasil (Supabase sa-east-1).
- O app nunca diagnostica: "acima/abaixo da faixa do laudo", sem vermelho alarmista, sem faixa em sinais vitais.
- Modo demonstração local com a família fictícia Souza.

## Evidence on Hand

- Família de demonstração Souza (Ana, Carlos, Lia, Dirce) com documentos, exames, vacinas e medicamentos fictícios (`src/application/demo-seed.ts`).
- 20 textos de laudo fictícios do corpus de OCR (`docs/features/ocr-tecnico.md`).
- Não há usuários reais, depoimentos, marca registrada, logo nem fotografia própria; nada disso pode ser inventado.

## Accessibility & Inclusion

Público com idosos e pessoas ansiosas: corpo de 17 pt, nada legível abaixo de 13 pt, Dynamic Type até AX5, WCAG AA, VoiceOver e TalkBack, cor nunca sozinha (sempre ícone e texto).

## Escopo do MVP v0.1

**Dentro**
- Onboarding + consentimento LGPD (termos + tratamento de dado sensível, versionados).
- Contas: e-mail com código de 6 dígitos (sem senha); Sign in with Apple (iOS) e Google preparados.
- 1 família por conta; membros com nome, nascimento, parentesco, sexo.
- Registros de saúde: tipo, título, data, local, profissional, notas, 0..n anexos (PDF, JPG, PNG, HEIC).
- Linha do tempo por membro com filtro por tipo; busca global; detalhe com visualização do anexo.
- Ajustes: sair, excluir conta, exportar dados (JSON), revogar consentimento.
- Modo demonstração local (sem backend) para desenvolvimento e testes.

## Escopo da v0.2 — Saúde da família

Spec completa, com critérios de aceite: `docs/features/v0.2-saude-da-familia.md`. Calendário vacinal de referência: `docs/features/calendario-vacinal-pni.md`.

**Dentro**
- **Captura inteligente**: OCR **no aparelho** (Apple Vision/PDFKit no iOS, ML Kit no Android) sugere tipo, título, data, local, profissional, exames, vacinas e medicamentos. A pessoa revisa e marca o que salvar; nada é salvo sem revisão, e o texto lido não é guardado. No Expo Go e na web, o preenchimento é manual; no modo demo, o texto é simulado.
- **Exames com tendência**: valor, unidade, faixa de referência do laudo, "fora da faixa do laudo" e gráfico por pessoa.
- **Vacinas e pendências**: carteira por pessoa e pendências pelo calendário PNI conforme a idade, rotuladas como referência pública.
- **Medicamentos em uso**, a partir de receitas ou manualmente.
- **Sinais vitais manuais**: pressão, glicemia capilar, peso e altura, sem avaliação de faixa.
- **Resumo de saúde da pessoa** e **painel da família** ("Para acompanhar").
- Termo de tratamento de dados de saúde em nova versão, cobrindo os dados estruturados.

**Regras de segurança clínica**: o app nunca diagnostica; "fora da faixa" usa só a faixa impressa no laudo; sem alarmismo nem vermelho em resultado de saúde.

**Fora (próximas versões — ver ROADMAP.md)**
- Convite de outros responsáveis para a mesma família.
- Leitura ou interpretação de resultados com IA generativa; OCR na nuvem; escrita à mão.
- Lembretes de vacinas, retornos e renovação de receita.
- Compartilhamento temporário com médico (link expirável).
- Uso offline completo e sincronização.
- Integração com laboratórios/RNDS/Open Health.

## Métricas de sucesso (MVP)

- Ativação: ≥ 60% dos cadastros criam família e ≥ 1 registro no primeiro dia.
- Tempo para adicionar um registro com anexo: mediana < 30 s.
- Retenção D30 ≥ 25% (uso esporádico é natural; medimos "voltou para consultar").
- Zero incidente de acesso indevido entre famílias (RLS testada em CI).

Métricas da v0.2 (medidas em teste moderado e no corpus da QA, nunca por analytics com dado de saúde): `docs/features/v0.2-saude-da-familia.md` §2.

## Princípios

- **Calma e clareza** — saúde já gera ansiedade; a interface é sóbria, legível e acessível (fonte grande, alto contraste, VoiceOver/TalkBack).
- **Privacidade por padrão** — nada público, nada sem consentimento, coletar o mínimo.
- **Velocidade de captura** — adicionar um documento nunca pode ser trabalhoso.
- **O app organiza; quem interpreta é o profissional de saúde** — o documento original é a fonte da verdade, todo dado estruturado mostra de onde veio e nada extraído automaticamente é salvo sem revisão (v0.2).
