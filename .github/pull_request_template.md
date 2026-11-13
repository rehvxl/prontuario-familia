## O que muda

<!-- O que muda para quem usa o app, em uma ou duas frases. Ligue a issue: "Fecha #123". -->

## Spec, design e tech

<!--
  As pastas do time não estão neste repositório. Preencha o link (ou o caminho) de cada arquivo.
  O padrão é specs/<slug>.md, design/<slug>.md e tech/<slug>.md.
  Escreva "não se aplica" quando a mudança não tiver spec, design ou nota técnica.
-->

- Spec: <!-- specs/<slug>.md -->
- Design: <!-- design/<slug>.md -->
- Tech: <!-- tech/<slug>.md -->

## Critérios de aceite

<!--
  Copie a lista da spec (EARS, com valores concretos).
  Cada critério fica com a evidência que o demonstra: teste, print, log ou vídeo.
  Apague as linhas de exemplo e deixe só os critérios desta entrega.
  Sem dado de saúde real na evidência: use o modo demo.
-->

- [ ] <!-- critério, com valores concretos --> — evidência: <!-- teste, print, log ou vídeo -->
- [ ] <!-- critério --> — evidência: <!-- teste, print, log ou vídeo -->

## Como verifiquei

- [ ] `npm run check` passa (typecheck, lint e testes)
- [ ] Testei no simulador ou aparelho: <!-- iOS / Android, versão -->
- [ ] Mudança visual: capturas de antes e depois, no claro e no escuro
- [ ] Com texto grande e leitor de tela, quando mexe em interface

## Banco

<!--
  Marque a primeira caixa quando o PR não cria nem altera tabela, policy, grant, função ou teste de banco.
  Nesse caso, o restante desta seção não se aplica.
-->

- [ ] Não mexe no banco
- [ ] Há migração nova (ou alteração de schema) e o restante desta lista está preenchido
- [ ] RLS ligado na tabela nova, em todas as operações (select, insert, update, delete)
- [ ] Policies por família, no padrão `is_family_member(family_id)` das tabelas atuais
- [ ] Grants só para os papéis que precisam (em geral `authenticated`, com colunas explícitas)
- [ ] pgTAP novo cobrindo o isolamento entre famílias
- [ ] CHECKs conferidos e exclusão em cascata (apagar pessoa e apagar conta removem o dado novo)
- [ ] `npm run db:test` passa
- [ ] `supabase db lint` passa

## LGPD (art. 11, dado de saúde)

<!--
  Dado de saúde é dado pessoal sensível (LGPD, art. 11).
  Marque a primeira caixa só quando o PR não cria, lê, envia, exporta nem apaga dado de saúde ou outro dado pessoal.
-->

- [ ] Não trata dado de saúde nem outro dado pessoal
- [ ] Dado de saúde novo está descrito, com a finalidade
- [ ] Nenhum dado pessoal sai para terceiros (analytics, crash report, notificação ou serviço externo)
- [ ] Nada clínico em logs nem na auditoria: a auditoria registra a ação e os ids, sem o valor
- [ ] Coberto pelo termo de consentimento vigente, ou a versão do termo sobe
- [ ] Exportar inclui o dado novo
- [ ] Apagar conta e apagar pessoa cobrem o dado novo

## Custo

<!-- O esperado é não. Se entrar serviço, cota ou dependência paga, pare e descreva o que é, o motivo e quem aprova o custo (Douglas). -->

- [ ] Confirmo que não entra serviço pago, cota paga nem dependência paga

## Evidências

<!--
  Cole a saída dos testes, os prints do modo demo (um por critério, só com dados fictícios) e o link do run da CI.
  Quando a evidência for log, cole o trecho sem dado pessoal.
-->

- Saída dos testes: <!-- cole ou resuma; inclua `npm run db:test` quando mexer no banco -->
- Prints do modo demo, por critério: <!-- um por critério de aceite -->
- Log: <!-- trecho sem dado pessoal, quando a evidência for log -->
- Run da CI: <!-- link do run -->

## Cuidados

- [ ] Nenhum dado de saúde real em código, testes ou capturas
- [ ] Textos do app em português, sem diagnóstico ("normal", "grave", "alerta")
- [ ] Sem edição em `ios/` ou `android/` (gerados pelo Expo)
