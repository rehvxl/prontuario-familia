# Política de segurança

O Prontuário da Família guarda dados de saúde, que estão entre os dados pessoais mais sensíveis (LGPD, art. 11). Levamos qualquer falha que os exponha a sério.

## Como relatar uma vulnerabilidade

**Não abra uma issue pública.** Use o relato privado do GitHub: aba **Security** → **Report a vulnerability** neste repositório. Só os mantenedores veem o relato.

Inclua, se puder:

- o que a falha permite (ler, alterar ou apagar dados de outra família, contornar o login, vazar documentos etc.);
- os passos para reproduzir, com dados fictícios;
- a versão ou o commit afetado.

## O que esperar

- Confirmação de recebimento em até 5 dias úteis.
- Uma avaliação inicial e o plano de correção em até 15 dias úteis.
- Crédito no aviso de segurança, se você quiser.

## Escopo

Entram no escopo o app (`src/`, `modules/`) e o backend (`supabase/`: políticas de RLS, funções e migrações). Ficam fora do escopo os serviços de terceiros (Supabase, Apple e Google), que têm programas próprios.

## Versões com suporte

O projeto está em desenvolvimento ativo; só a `main` recebe correções.
