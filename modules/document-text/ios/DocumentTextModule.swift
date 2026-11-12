import ExpoModulesCore
import Foundation

struct ExtractTextOptions: Record {
  @Field var maxPages: Int = DocumentTextEngine.defaultMaxPages
  @Field var requestId: String?
}

public class DocumentTextModule: Module {
  private let engine = DocumentTextEngine()
  private let cancellations = CancellationRegistry()
  // Fila própria: a fila padrão de AsyncFunction do Expo é serial e compartilhada por todos os módulos.
  private let queue = DispatchQueue(label: "br.com.prontuariofamilia.document-text", qos: .userInitiated)

  public func definition() -> ModuleDefinition {
    Name("DocumentText")

    AsyncFunction("extractText") { (uri: URL, mimeType: String, options: ExtractTextOptions) throws -> [String: Any] in
      let requestId = options.requestId
      defer { self.cancellations.clear(requestId) }
      let result: DocumentTextResult
      do {
        result = try self.engine.extract(url: uri, mimeType: mimeType, maxPages: options.maxPages) {
          self.cancellations.isCancelled(requestId)
        }
      } catch let failure as DocumentTextFailure {
        throw failure.exception
      }
      return [
        "engine": "apple-vision",
        "pageCount": result.pageCount,
        "truncated": result.truncated,
        "pages": result.pages.map { ["index": $0.index, "text": $0.text, "source": $0.source] },
      ]
    }.runOnQueue(queue)

    Function("cancel") { (requestId: String) in
      self.cancellations.cancel(requestId)
    }
  }
}

extension DocumentTextFailure {
  /// Código estável para o JS; a descrição é técnica e nunca contém texto do documento.
  var exception: Exception {
    switch self {
    case .fileNotFound: return Exception(name: "DocumentTextFileNotFound", description: "Arquivo não encontrado.", code: "ERR_DOCUMENT_TEXT_FILE_NOT_FOUND")
    case .unsupportedType: return Exception(name: "DocumentTextUnsupportedType", description: "Tipo de arquivo não suportado.", code: "ERR_DOCUMENT_TEXT_UNSUPPORTED_TYPE")
    case .tooLarge: return Exception(name: "DocumentTextTooLarge", description: "Arquivo maior que 20 MB.", code: "ERR_DOCUMENT_TEXT_TOO_LARGE")
    case .pdfLocked: return Exception(name: "DocumentTextPdfLocked", description: "PDF protegido por senha.", code: "ERR_DOCUMENT_TEXT_PDF_LOCKED")
    case .unreadable: return Exception(name: "DocumentTextUnreadable", description: "Arquivo ilegível.", code: "ERR_DOCUMENT_TEXT_UNREADABLE")
    case .cancelled: return Exception(name: "DocumentTextCancelled", description: "Leitura cancelada.", code: "ERR_DOCUMENT_TEXT_CANCELLED")
    case .ocrFailed: return Exception(name: "DocumentTextOcrFailed", description: "Falha no reconhecimento de texto.", code: "ERR_DOCUMENT_TEXT_OCR_FAILED")
    }
  }
}
