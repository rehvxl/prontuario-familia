# ADR 0001 — Leitura de documentos (OCR) no aparelho, com módulo Expo local

- **Status:** aceito (decisão do Douglas em 11/11/2026; este registro documenta e avalia)
- **Data:** 11/11/2026
- **Decisores:** Douglas (dono do produto); Head de Produto clínico (persona líder, critérios de aceite)
- **Revisão:** 11/11/2026, consistência com a spec v0.2 (termo v2, vocabulário da faixa, Q7).
- **Detalhe técnico:** [docs/features/ocr-tecnico.md](../features/ocr-tecnico.md) · Dados: [docs/features/dados-saude-backend.md](../features/dados-saude-backend.md)

## Contexto

O Prontuário da Família guarda documentos de saúde que a própria família junta: laudos de laboratório, receitas, carteiras de vacina e laudos de imagem. Hoje o usuário digita tipo, título, data, local e profissional, e os valores dos exames ficam presos no PDF ou na foto. A rodada de 11/11/2026 pede duas coisas:

1. ler o documento para **sugerir** os campos do registro;
2. alimentar o acompanhamento de saúde (exames com tendência, vacinas, medicamentos em uso).

Restrições que pesam na escolha:

- **Dado sensível** (LGPD art. 5º, II e art. 11). A arquitetura já promete dados no Brasil (Supabase sa-east-1), nenhum visualizador de terceiros (ARCHITECTURE §1, decisão 11) e nenhum analytics com dado de saúde.
- **Expo SDK 58, RN 0.88, New Architecture, CNG**. Não há `ios/`/`android/` versionados; código nativo entra por módulo Expo e autolinking.
- **Entrada em PDF**, com ou sem camada de texto, além de foto. Laudo brasileiro é tabela, com vírgula decimal e ponto de milhar.
- **Português do Brasil**, offline (consultório, laboratório sem sinal), custo zero por leitura.
- **Expo Go continua útil** para o resto do app e precisa funcionar sem o leitor.

## Decisão

1. **Extrair o texto no próprio aparelho**, com as APIs do sistema:
   - iOS: **PDFKit** (`PDFPage.string`) quando o PDF tem texto; **Vision** (`VNRecognizeTextRequest`, `.accurate`, `pt-BR`) para página escaneada e foto.
   - Android: **`PdfRenderer`** (`getTextContents()` no Android 15+, senão rasteriza) e **ML Kit Text Recognition v2** com o **modelo latino embutido** (`com.google.mlkit:text-recognition:16.0.1`).
2. Empacotar isso num **módulo Expo local**, `modules/document-text` (`npx create-expo-module@latest --local`), descoberto pelo autolinking. Sem config plugin, sem permissão nova.
3. Transformar texto em sugestões com um **parser TypeScript puro e determinístico** (`features/read-document`). Ele só sugere: o usuário revisa e confirma antes de salvar. Faixa "fora da referência" usa só a faixa **impressa no laudo**; na dúvida, `none` ("Sem faixa no laudo").
4. **Sem leitor** (Expo Go, web): `requireOptionalNativeModule` devolve `null` e a tela fica no preenchimento manual. **Modo demo sem módulo**: texto fictício escolhido pelo nome do arquivo. Dev build em modo demo usa o leitor real.
5. **O texto completo não é persistido** nesta rodada. Só os campos confirmados vão para o banco.

## Alternativas avaliadas

Pacotes conferidos no registro npm em 11/11/2026; README e páginas oficiais lidos na mesma data.

| Alternativa | Prós | Contras | Veredito |
|---|---|---|---|
| **Nuvem com IA** (Google Document AI/Vision API, AWS Textract, Azure Document Intelligence, LLM multimodal) | Melhor acerto em layout difícil e manuscrito; extração estruturada pronta | O documento de saúde sai do aparelho: transferência a operador e muitas vezes internacional (LGPD art. 33), contrato de operador, revisão do consentimento, DPO. Não funciona offline. Custo por página. Contradiz a promessa "nada sai do celular". Exige backend (chave nunca no app) | Descartada nesta rodada. Pode voltar como **opt-in explícito**, com consentimento próprio, se a QA mostrar que o OCR local não basta |
| **Tesseract** (tesseract.js ou nativo) | Aberto, offline | tesseract.js depende de WebAssembly/Web Worker, que o Hermes não oferece. O nativo exige compilar C++ nas duas plataformas e carregar `por.traineddata` (dezenas de MB). Acerto pior que Vision/ML Kit em foto de celular | Descartada |
| **`expo-text-extractor`** 2.0.0 (npm modificado em 28/02/2026) | Mesma dupla Vision + ML Kit, API mínima (`extractTextFromImage(uri) → string[]`), Expo Module | Só imagem (**sem PDF**); sem configuração de idioma documentada (pt-BR); devolve linhas sem posição (sem controle da ordem de colunas); um mantenedor, 72 estrelas, 15 PRs abertos; README fala em "SDK 52+" com peer `expo: *`, sem compatibilidade com o SDK 58 declarada | Descartada: PDF e ordem de leitura exigiriam código nativo de qualquer jeito |
| **`@react-native-ml-kit/text-recognition`** 2.0.0 (publicado em 01/09/2025) | ML Kit nas duas plataformas | ML Kit também no iOS (pods do Google, mais tamanho, sem a qualidade do Vision); sem PDF; módulo no estilo bridge antigo; sem atividade desde set/2025 | Descartada |
| **`@infinitered/react-native-mlkit-text-recognition`** 5.0.1 (nov/2025) | Família mantida por empresa, Expo Module | A tabela de compatibilidade do README vai até o SDK 56 (sem linha para 58); "MLKit is not supported in the iOS simulator"; "Android support … under active development"; sem PDF | Descartada |
| `rn-mlkit-ocr`, `expo-mlkit-ocr`, `react-native-text-recognition` | — | Mantenedor único, pouco uso, sem PDF; o último sem publicação desde 2024 | Descartadas |
| `react-native-vision-camera-ocr-plus` | Ativo (nov/2026) | Feito para quadro de câmera em tempo real (exige vision-camera 5, worklets e nitro); nós lemos arquivos | Fora do caso de uso |
| **Inline modules** do Expo (experimental, SDK 56+) | Sem pasta de módulo | API "sujeita a mudanças"; a doc não diz se aceita dependência Gradle/CocoaPods (precisamos do ML Kit) | Descartada; módulo local em `modules/` é estável |
| **ML Kit via Play Services** (`play-services-mlkit-text-recognition`) | ~260 KB em vez de ~4 MB por ABI | Baixa o modelo no primeiro uso (sem resultado até baixar); depende do Google Play; envia identificador de dispositivo | Descartada; o embutido é previsível e funciona offline desde o início |

## Consequências

**Positivas**
- Privacidade forte e fácil de explicar: o documento não sai do aparelho. Não há operador novo nem transferência internacional. O termo sobe para a v2 com novo aceite (decisão da Head de Produto, spec P1), por causa dos dados estruturados de saúde, não por causa do OCR. ~~Consentimento igual, só texto atualizado.~~
- Funciona offline, sem custo por leitura e sem backend novo.
- Controle total sobre o que importa no Brasil: PDF com e sem texto, `pt-BR`, ordem de colunas de laudo, limites e cancelamento.
- Parser puro e testado com textos fictícios: cada laudo real problemático vira fixture e teste.

**Negativas e custos**
- **Código nativo próprio** em Swift e Kotlin para manter a cada SDK. Mitigação: motor separado da DSL do Expo, sem dependência além do ML Kit.
- **Testar exige development build** (`npx expo run:ios|android` ou EAS). Expo Go só exercita o caminho demo.
- **Android abaixo do 15** não lê a camada de texto do PDF: a página passa pelo OCR (mais lento e menos fiel).
- **ML Kit envia métricas técnicas** ao Google (aparelho, versão do app, latência, tamanho e formato da imagem; não envia imagem nem texto): declarar no *Data safety* e na política de privacidade. A métrica de privacidade da spec trata isso como exceção conhecida (questão Q7, decisão do Douglas).
- Android +~4 MB por ABI. Alinhamento de 16 KB das bibliotecas do ML Kit a conferir no AAB (notas de versão dizem que sim; a issue googlesamples/mlkit#975 diz que não).
- **Sem manuscrito confiável** e com heurísticas de parser que precisam de manutenção; a revisão obrigatória limita o dano.
- Busca não encontra palavras que estão só dentro do PDF (consequência de não persistir o texto).

**Revisitar quando**
- A QA com laudos reais (autorizados, nunca versionados) mostrar acerto por campo abaixo do aceitável para a Head de Produto clínico; ou
- o produto quiser leitura de manuscrito ou extração livre de evolução clínica. Nesse caso, avaliar nuvem como **opt-in** em ADR próprio.
