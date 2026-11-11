# Plano de testes — Prontuário da Família (MVP v0.1)

> v0.1.5 · dono: QA Prontuário · criado em 11/11/2026 · Fase A (plano) concluída; Fase B (execução no simulador) aguarda o commit do reskin (v0.1.7).

## 1. Escopo, ambiente e critérios

| Item | Valor |
|---|---|
| Dispositivo de referência | iPhone 17 Pro, iOS 26.5 (simulador) |
| Android | Só se houver emulador; senão, registrar como "não verificado" |
| Modos | **Demo** (sem backend; código OTP `123456`) e **Servidor local** (`npm run db:start`) |
| Aparências | Claro e escuro, em todos os casos de UI |
| Automático | `npm run typecheck`, `npm run lint`, `npm test` (Jest/RNTL), `npm run db:test` (pgTAP) |
| Manual | Roteiro abaixo (Fase B). Maestro: candidato a automatizar os fluxos P0 depois do reskin estabilizar |
| Pronto para loja quando | Todos os P0 passam, nenhum bug "bloqueia"/"alta" aberto, `STORE_READINESS.md` sem ❌ do lado do código |

Prioridade: **P0** = bloqueia a loja/segurança/dados; **P1** = fluxo principal; **P2** = acabamento.
Cada caso: passos → resultado esperado. Resultado da execução fica na coluna **Res.** (— = não executado).

## 2. Casos por risco

### A. Onboarding e consentimento (LGPD art. 11) — P0
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| ONB-01 | Primeiro uso, app limpo | 3 telas curtas de boas-vindas, avançar e pular funcionam | — |
| ONB-02 | Chegar ao consentimento sem marcar nada | Botão "Aceitar e continuar" desabilitado | — |
| ONB-03 | Marcar só "Termos e Política" | Continua desabilitado (as duas caixas são necessárias) | — |
| ONB-04 | Marcar as duas e continuar | Segue para login; consentimento gravado com versão atual | — |
| ONB-05 | Os Termos/Política são legíveis/abrem a partir da tela | Texto ou link acessível (**risco conhecido: não há link**, ver STORE_READINESS) | — |
| ONB-06 | Fechar e reabrir o app após aceitar | Não pede o aceite de novo; sessão restaurada | — |
| ONB-07 | Subir a versão dos termos (`CURRENT_TERMS_VERSION`) | Pede novo aceite | — |

### B. Login — P0
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| AUTH-01 | E-mail inválido ("abc") | Mensagem de erro em pt-BR, sem travar | — |
| AUTH-02 | E-mail válido → código `123456` (demo) | Entra; vai para criar família (conta nova) | — |
| AUTH-03 | Código errado | Erro claro; permite tentar de novo | — |
| AUTH-04 | Código com menos de 6 dígitos / colar com espaços | Validação; colar funciona | — |
| AUTH-05 | Reenviar código; trocar e-mail | Funciona; sem duplicar estado | — |
| AUTH-06 | Servidor local: pedir código, ler no Mailpit (http://127.0.0.1:54324) e digitar | Entra; e-mail em pt-BR | — |
| AUTH-07 | Apple: botão visível só no iOS com Apple disponível; cancelar | Cancelar volta ao login sem erro | — |
| AUTH-08 | Google: com `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=0` | Botão **não** aparece; com `=1` aparece e cancelar volta sem erro | — |
| AUTH-09 | Deep link `prontuariofamilia://auth/callback` sem código | Não quebra o app | — |
| AUTH-10 | Sair da conta | Volta ao login; dados não ficam visíveis | — |
| AUTH-11 | Abrir rota protegida deslogado (deep link para registro) | Redireciona ao login | — |

### C. Família e pessoas — P1
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| FAM-01 | Criar família com nome de 1 e de 61 caracteres | Rejeita (2–60) com mensagem | — |
| FAM-02 | Criar "Família Silva" | Avança para adicionar pessoas | — |
| FAM-03 | Adicionar membros (eu, cônjuge, filho, pai) com nascimento, parentesco, sexo | Aparecem na tela inicial | — |
| FAM-04 | Nome vazio / nascimento no futuro | Validação | — |
| FAM-05 | Editar membro | Alterações refletem em lista e linha do tempo | — |
| FAM-06 | Excluir membro com registros e anexos | Confirmação; registros e arquivos somem junto | — |
| FAM-07 | Reabrir app | Família e membros persistem | — |

### D. Novo registro com anexo — P0
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| REC-01 | Novo registro sem título / sem membro | Validação; não salva | — |
| REC-02 | Criar cada um dos 7 tipos (consulta, exame, resultado, laudo, receita, vacina, outro) | Salva; ícone/cor corretos; data, local, profissional, notas | — |
| REC-03 | Data futura / muito antiga | Comportamento definido e coerente | — |
| REC-04 | Anexar por **galeria** (foto JPG/HEIC) | Pede permissão com o texto pt-BR; miniatura aparece | — |
| REC-05 | Anexar por **câmera** (simulador não tem câmera: validar mensagem; em aparelho real, só na Fase B se houver) | Texto de permissão pt-BR; negar → mensagem útil com atalho para Ajustes | — |
| REC-06 | Anexar **PDF** pelo seletor de arquivos | Aparece com nome/tamanho | — |
| REC-07 | Vários anexos; remover um antes de salvar | Só os mantidos são salvos | — |
| REC-08 | Arquivo > 20 MiB e tipo não aceito (ex.: .docx) | Recusado com mensagem clara | — |
| REC-09 | Cancelar o seletor | Sem erro; formulário preservado | — |
| REC-10 | Salvar e conferir tempo | Meta < 30 s do toque em "Adicionar" ao salvo | — |
| REC-11 | Salvar sem rede (servidor) | Erro amigável; formulário e anexos preservados | — |
| REC-12 | Toque duplo em "Salvar" | Um único registro | — |

### E. Linha do tempo e filtros — P1
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| TL-01 | Abrir membro com registros de datas variadas | Agrupado por mês, mais recente primeiro | — |
| TL-02 | Filtrar por cada um dos **7 tipos** | Só aquele tipo; contagem coerente; limpar filtro volta tudo | — |
| TL-03 | Membro sem registros | Estado vazio com chamada para adicionar | — |
| TL-04 | Lista grande (50+ registros) | Rolagem fluida, sem travar | — |
| TL-05 | Puxar para atualizar | Atualiza sem duplicar | — |

### F. Busca — P1
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| BUS-01 | "hemograma", "Dr. Paulo", "Fleury" | Acha por título, profissional e local, em todos os membros | — |
| BUS-02 | Sem acento ("acao" → "Ação"); prefixo ("hemogr") | Encontra | — |
| BUS-03 | Sem resultado | Estado vazio claro | — |
| BUS-04 | Caracteres especiais (`'`, `%`, `;`, `&`, `:`) | Não quebra nem erra | — |
| BUS-05 | Toque no resultado | Abre o detalhe correto | — |

### G. Detalhe e visualizador — P0/P1
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| DET-01 | Abrir detalhe | Todos os campos e anexos | — |
| DET-02 | Abrir foto | Tela cheia; zoom/arrastar; fechar | — |
| DET-03 | Abrir PDF | Renderiza; multipágina rola; fechar | — |
| DET-04 | Compartilhar/abrir em outro app | Folha de compartilhamento nativa | — |
| DET-05 | Servidor: URL assinada expira (300 s) | Reabrir depois de 5 min gera nova URL; link antigo recusado | — |
| DET-06 | Editar registro | Reflete na linha do tempo | — |

### H. Excluir registro — P0
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| DEL-01 | Excluir registro: cancelar na confirmação | Nada muda | — |
| DEL-02 | Excluir registro: confirmar | Some da linha do tempo e da busca; volta à tela anterior | — |
| DEL-03 | Servidor: após excluir | Arquivos do bucket removidos (conferir no Storage local) | — |

### I. Ajustes e direitos do titular (LGPD art. 18) — P0
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| SET-01 | Exportar meus dados | JSON gerado e compartilhável; contém perfil, membros, registros, consentimentos | — |
| SET-02 | Servidor: export traz `download_url` que abre o anexo e expira em 1 h | Conforme BACKEND.md | — |
| SET-03 | Revogar consentimento: cancelar / confirmar | Confirmar → redireciona ao consentimento; não acessa dados sem novo aceite | — |
| SET-04 | Revogar e aceitar de novo | Histórico de consentimentos preserva as duas linhas | — |
| SET-05 | Excluir conta: 1ª confirmação e 2ª ("Tem certeza absoluta?") | Dupla confirmação; cancelar em qualquer uma não apaga | — |
| SET-06 | Excluir conta (confirmar) | Volta ao onboarding/login; reentrar com o mesmo e-mail cria conta vazia | — |
| SET-07 | Servidor: após excluir | `auth.users`, famílias e arquivos do bucket zerados | — |
| SET-08 | Indicador "Modo demonstração" / "Conectado ao servidor" correto | Coerente com o modo | — |
| SET-09 | Excluir conta sem rede | Erro amigável; nada pela metade; pode repetir | — |

### J. Acessibilidade — P1 (parte P0 para saúde)
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| A11Y-01 | **VoiceOver** em onboarding, login, família, novo registro, linha do tempo, detalhe, ajustes | Todo controle com rótulo; ordem lógica; botões ícone-apenas com nome; estados (selecionado, desabilitado) falados | — |
| A11Y-02 | VoiceOver: sheets e alertas de confirmação | Foco entra na sheet; fechar devolve o foco | — |
| A11Y-03 | **Dynamic Type** no maior tamanho, incl. acessibilidade (AX5) | Nada cortado ou sobreposto; botões continuam tocáveis; rolagem disponível | — |
| A11Y-04 | **Reduzir transparência** + **Aumentar contraste** | Liquid Glass vira fundo opaco legível; textos contrastam | — |
| A11Y-05 | **Reduzir movimento** | Sem animações bruscas | — |
| A11Y-06 | Alvos de toque ≥ 44 pt | Conferido em ícones/chips/filtros | — |
| A11Y-07 | Contraste (WCAG AA) em claro e escuro | Texto secundário e chips legíveis | — |
| A11Y-08 | Não depender só de cor (tipo de registro) | Ícone + texto além da cor | — |

### K. Modo escuro, rotação, offline — P1/P2
| ID | Passos | Esperado | Res. |
|---|---|---|---|
| DARK-01 | Repetir telas-chave no escuro; alternar o tema com o app aberto | Sem texto ilegível, sem fundo claro "vazando", sheets corretas | — |
| ROT-01 | Girar o aparelho (app é `portrait`) | Fica em retrato; nada quebra (iPad não é suportado) | — |
| OFF-01 | Demo em modo avião | Tudo funciona (dados locais) | — |
| OFF-02 | Servidor em modo avião: abrir app, listar, salvar, excluir | Mensagens amigáveis; sem crash; sem dado duplicado ao voltar a rede (offline completo está **fora** do MVP) | — |
| OFF-03 | Perder rede durante upload | Erro claro; registro não fica "meio salvo" | — |
| LIFE-01 | Ir para segundo plano 5 min e voltar; matar e reabrir | Sessão e tela coerentes | — |
| LIFE-02 | Teclado cobrindo campos nos formulários | Campo focado visível | — |

### L. Backend (automático — Fase A)
| ID | Verificação | Como | Res. |
|---|---|---|---|
| BE-01 | Migrations aplicam do zero | `npm run db:reset` | ✅ 11/11 |
| BE-02 | pgTAP: RLS nas 8 tabelas, isolamento entre famílias, storage, busca | `npm run db:test` | ✅ 118/118 |
| BE-03 | Bucket `health-files` privado, 20 MiB, MIMEs restritos | consulta a `storage.buckets` | ✅ |
| BE-04 | URLs assinadas com TTL | código: 300 s (visualizador), 3600 s (exportação) | ✅ no código; expiração real = DET-05/SET-02 |
| BE-05 | Edge Functions `delete-account`/`export-my-data` ponta a ponta | `functions serve` + app | — (Fase B) |

## 3. Automação existente (Fase A)
- 51 suítes / 350 testes Jest, typecheck e lint limpos (ver STORE_READINESS §0 e a resposta do QA).
- Lacunas: nenhum teste E2E; fluxos de câmera/seletor nativos e URL assinada real só no simulador. Maestro: recomendar para ONB, AUTH-02, REC-02/06, DEL-02, SET-03/06 após o reskin congelar.

## 4. Fora do escopo desta rodada
Convites de responsáveis, OCR, lembretes, offline com sincronização, iPad, publicação nas lojas.
