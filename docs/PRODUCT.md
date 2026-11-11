# Prontuário da Família — Produto

> Versão do documento: MVP v0.1 · novembro/2026 · dono: Tech Lead Prontuário

## Problema

Cada atendimento de saúde gera documentos — pedido de exame, resultado, laudo, receita, carteira de vacina — que ficam espalhados entre clínicas, laboratórios, hospitais e planos. Quase tudo já chega em formato digital (PDF por e-mail, portal do laboratório, foto do papel), mas ninguém consegue achar "aquele hemograma de 2024 da minha filha" na hora da consulta. Quem cuida da saúde da família (normalmente uma pessoa) vira o arquivo vivo de todo mundo.

## Proposta de valor

**Todo o histórico de saúde da sua família, num lugar só, achado em segundos.**

1. **Reunir** — importar PDF, foto (câmera/galeria) ou arquivo em menos de 30 segundos.
2. **Organizar** — cada documento vira um registro com tipo, data, local e profissional, ligado a um membro da família.
3. **Encontrar** — linha do tempo por pessoa, filtro por tipo e busca por texto.
4. **Proteger** — dados de saúde são sensíveis (LGPD art. 11): acesso só da família, arquivos privados, consentimento explícito, exclusão e exportação a qualquer momento.

## Personas

| Persona | Contexto | O que precisa |
|---|---|---|
| **Ana, 38, "cuidadora da família"** (principal) | Mãe de 2 filhos, cuida também da mãe idosa. Recebe resultados por e-mail e WhatsApp, guarda papéis numa pasta. | Juntar tudo rápido, achar o exame certo na frente do médico, saber quando foi a última vacina. |
| **Carlos, 67, paciente crônico** | Hipertenso e diabético, várias especialidades. Os médicos pedem "os últimos exames". | Mostrar a sequência de resultados e as receitas em uso, com letra grande e poucos toques. |
| **Júlia, 29, cônjuge colaboradora** (pós-MVP) | Divide os cuidados com o parceiro. | Ver e adicionar documentos na mesma família (convite de segundo responsável — v0.3). |

## Jornadas principais (MVP)

1. **Primeiro uso** — boas-vindas (3 telas curtas) → aceite destacado do termo e do tratamento de dados de saúde → login por e-mail com código (ou Apple/Google) → criar família ("Família Silva") → adicionar membros (eu, cônjuge, filhos, pais).
2. **Guardar um documento** — botão "Adicionar" → escolher membro → tipo (consulta, exame, resultado, laudo, receita, vacina, outro) → data, local, profissional, notas → anexar PDF/foto (câmera, galeria ou arquivo) → salvar. Meta: < 30 s.
3. **Encontrar na consulta** — abrir membro → linha do tempo agrupada por mês → filtrar por "Resultado" → abrir detalhe → ver o anexo em tela cheia.
4. **Buscar** — busca global por texto ("hemograma", "Dr. Paulo", "Fleury") em todos os membros.
5. **Controle dos dados** — Ajustes → exportar meus dados · revogar consentimento · excluir conta (confirmação dupla, apaga tudo).

## Escopo do MVP v0.1

**Dentro**
- Onboarding + consentimento LGPD (termos + tratamento de dado sensível, versionados).
- Contas: e-mail com código de 6 dígitos (sem senha); Sign in with Apple (iOS) e Google preparados.
- 1 família por conta; membros com nome, nascimento, parentesco, sexo.
- Registros de saúde: tipo, título, data, local, profissional, notas, 0..n anexos (PDF, JPG, PNG, HEIC).
- Linha do tempo por membro com filtro por tipo; busca global; detalhe com visualização do anexo.
- Ajustes: sair, excluir conta, exportar dados (JSON), revogar consentimento.
- Modo demonstração local (sem backend) para desenvolvimento e testes.

**Fora (próximas versões — ver ROADMAP.md)**
- Convite de outros responsáveis para a mesma família.
- OCR / extração automática de dados do PDF; leitura de resultados com IA.
- Lembretes de vacinas e retornos; carteira de vacinação estruturada.
- Compartilhamento temporário com médico (link expirável).
- Uso offline completo e sincronização.
- Integração com laboratórios/RNDS/Open Health.

## Métricas de sucesso (MVP)

- Ativação: ≥ 60% dos cadastros criam família e ≥ 1 registro no primeiro dia.
- Tempo para adicionar um registro com anexo: mediana < 30 s.
- Retenção D30 ≥ 25% (uso esporádico é natural; medimos "voltou para consultar").
- Zero incidente de acesso indevido entre famílias (RLS testada em CI).

## Princípios

- **Calma e clareza** — saúde já gera ansiedade; a interface é sóbria, legível e acessível (fonte grande, alto contraste, VoiceOver/TalkBack).
- **Privacidade por padrão** — nada público, nada sem consentimento, coletar o mínimo.
- **Velocidade de captura** — adicionar um documento nunca pode ser trabalhoso.
