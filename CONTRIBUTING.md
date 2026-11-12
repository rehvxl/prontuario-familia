# Como contribuir

Obrigado por querer ajudar o Prontuário da Família. Este guia explica como propor mudanças sem surpresas para você nem para quem revisa.

## Antes de começar

- **Procure uma issue.** Para algo pequeno (um bug, um texto), abra o PR direto. Para uma funcionalidade nova, abra uma issue de sugestão antes, para combinar o escopo. Issues com `good first issue` são um bom ponto de partida.
- **Nunca use dados de saúde reais.** Nem em issues, nem em capturas, nem em testes. Use pessoas fictícias, como a família de exemplo do modo demonstração.
- **Segurança vai por canal privado.** Veja [SECURITY.md](SECURITY.md).

## Ambiente

```bash
npm ci
npx expo run:ios       # ou: npx expo run:android (development build)
```

Detalhes no [README](README.md#como-rodar). Sem `.env`, o app abre no modo demonstração, que basta para a maior parte das mudanças de interface.

## Regras do projeto

- **Dependências:** instale com `npx expo install <pacote>`, que escolhe a versão compatível com o SDK. Prefira os módulos do Expo a bibliotecas de terceiros.
- **Nativo:** as pastas `ios/` e `android/` são geradas (Continuous Native Generation). Não as edite; configure o comportamento nativo em `app.json` ou num config plugin.
- **Arquitetura:** o código segue Feature-Sliced Design (`app → screens → widgets → features → entities → shared`). Uma camada só importa as de baixo, e de fora de um slice só pela API pública (`index.ts`). O lint aponta as violações. Veja [ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Rotas:** ficam em `src/app/` (Expo Router). Componentes, hooks e lógica ficam fora dessa pasta.
- **Interface:** siga [DESIGN.md](DESIGN.md) e [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Todo estado clínico leva ícone e texto, nunca só cor. Teste com texto grande, tema escuro e leitor de tela.
- **Texto do app:** em português do Brasil, calmo e sem diagnóstico. O app compara com a faixa do laudo; não diz "normal", "grave" nem "alerta".
- **Testes:** lógica nova leva teste. Rode `npm run check` antes de abrir o PR; a CI roda o mesmo comando.

## Commits e PRs

- Mensagens no formato `tipo(escopo): resumo`, em português: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`. Exemplo: `fix(ocr): corrige unidade lida como mg/aL`.
- Um PR por assunto. Descreva o que muda para quem usa o app e como você verificou (testes, simulador, aparelho).
- Mudança visual leva captura de antes e depois.
- A `main` é protegida: o PR precisa da CI verde e de uma revisão.

## Licença das contribuições

Ao enviar uma contribuição, você concorda que ela seja distribuída sob a [Licença Apache 2.0](LICENSE), como o resto do projeto.
