import Foundation
import ImageIO
import PDFKit
import UIKit
import Vision

/// Página extraída. `source`: "pdf-text" (camada de texto do PDF) ou "ocr" (Vision).
struct DocumentTextPage {
  let index: Int
  let text: String
  let source: String
}

struct DocumentTextResult {
  let pages: [DocumentTextPage]
  let pageCount: Int
  let truncated: Bool
}

/// Falhas técnicas. Nunca carregam o conteúdo do documento.
enum DocumentTextFailure: Error {
  case fileNotFound
  case unsupportedType
  case tooLarge
  case pdfLocked
  case unreadable
  case cancelled
  case ocrFailed
}

/// Motor sem dependência do Expo: PDF com camada de texto → PDFKit; PDF escaneado ou imagem → Vision.
/// Síncrono e bloqueante: chame fora da thread principal e fora da fila padrão do Expo.
final class DocumentTextEngine {
  static let maxFileBytes = 20 * 1024 * 1024
  static let defaultMaxPages = 10
  static let hardMaxPages = 20
  /// Abaixo disso a camada de texto da página é considerada vazia (PDF escaneado) e a página vai para o OCR.
  static let minPdfTextChars = 30
  static let maxImagePixelSide = 3000
  static let pdfRenderLongSide: CGFloat = 2200
  static let maxTotalChars = 200_000

  private static let imageTypes: Set<String> = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]
  private static let customWords = [
    "Hemoglobina", "Hematócrito", "Leucócitos", "Plaquetas", "Creatinina", "Triglicerídeos",
    "Ferritina", "Glicada", "HbA1c", "TSH", "Posologia", "Comprimido", "Lote",
  ]

  func extract(url: URL, mimeType: String, maxPages: Int, isCancelled: () -> Bool) throws -> DocumentTextResult {
    let mime = mimeType.lowercased()
    guard mime == "application/pdf" || Self.imageTypes.contains(mime) else { throw DocumentTextFailure.unsupportedType }
    guard url.isFileURL,
          let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
          let size = (attributes[.size] as? NSNumber)?.intValue
    else { throw DocumentTextFailure.fileNotFound }
    guard size > 0 else { throw DocumentTextFailure.unreadable }
    guard size <= Self.maxFileBytes else { throw DocumentTextFailure.tooLarge }

    if mime == "application/pdf" {
      return try extractPdf(url: url, limit: max(1, min(maxPages, Self.hardMaxPages)), isCancelled: isCancelled)
    }
    if isCancelled() { throw DocumentTextFailure.cancelled }
    let text = try autoreleasepool { try recognize(loadImage(url)) }
    let (clipped, truncated) = Self.clip(text, budget: Self.maxTotalChars)
    return DocumentTextResult(pages: [DocumentTextPage(index: 0, text: clipped, source: "ocr")], pageCount: 1, truncated: truncated)
  }

  // MARK: - PDF

  private func extractPdf(url: URL, limit: Int, isCancelled: () -> Bool) throws -> DocumentTextResult {
    guard let document = PDFDocument(url: url) else { throw DocumentTextFailure.unreadable }
    if document.isLocked && !document.unlock(withPassword: "") { throw DocumentTextFailure.pdfLocked }
    let pageCount = document.pageCount
    guard pageCount > 0 else { throw DocumentTextFailure.unreadable }

    var pages: [DocumentTextPage] = []
    var budget = Self.maxTotalChars
    var truncated = pageCount > limit
    for index in 0..<min(pageCount, limit) {
      if isCancelled() { throw DocumentTextFailure.cancelled }
      guard let page = document.page(at: index) else { continue }
      let layer = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      let usesLayer = layer.count >= Self.minPdfTextChars
      let text = usesLayer ? layer : try autoreleasepool { try recognize(render(page)) }
      let (clipped, cut) = Self.clip(text, budget: budget)
      pages.append(DocumentTextPage(index: index, text: clipped, source: usesLayer ? "pdf-text" : "ocr"))
      budget -= clipped.count
      if cut || budget <= 0 {
        truncated = true
        break
      }
    }
    return DocumentTextResult(pages: pages, pageCount: pageCount, truncated: truncated)
  }

  /// Rasteriza a página com fundo branco (sem alfa: texto preto sobre transparente vira preto sobre preto no OCR).
  private func render(_ page: PDFPage) throws -> CGImage {
    guard let cgPage = page.pageRef else { throw DocumentTextFailure.unreadable }
    let box = cgPage.getBoxRect(.mediaBox)
    let quarterTurn = cgPage.rotationAngle % 180 != 0
    let pageSize = quarterTurn ? CGSize(width: box.height, height: box.width) : box.size
    guard pageSize.width > 0, pageSize.height > 0 else { throw DocumentTextFailure.unreadable }
    // getDrawingTransform não amplia; a escala vem antes, e o transform só aplica rotação e origem.
    let scale = Self.pdfRenderLongSide / max(pageSize.width, pageSize.height)
    let pixelSize = CGSize(width: (pageSize.width * scale).rounded(), height: (pageSize.height * scale).rounded())
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let image = UIGraphicsImageRenderer(size: pixelSize, format: format).image { context in
      UIColor.white.setFill()
      context.fill(CGRect(origin: .zero, size: pixelSize))
      let cg = context.cgContext
      cg.translateBy(x: 0, y: pixelSize.height)
      cg.scaleBy(x: scale, y: -scale)
      cg.concatenate(cgPage.getDrawingTransform(.mediaBox, rect: CGRect(origin: .zero, size: pageSize), rotate: 0, preserveAspectRatio: true))
      cg.drawPDFPage(cgPage)
    }
    guard let cgImage = image.cgImage else { throw DocumentTextFailure.unreadable }
    return cgImage
  }

  // MARK: - Imagem

  /// Decodifica já reduzida (lado maior ≤ 3000 px) e com a orientação EXIF aplicada.
  private func loadImage(_ url: URL) throws -> CGImage {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { throw DocumentTextFailure.unreadable }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: Self.maxImagePixelSide,
      kCGImageSourceShouldCacheImmediately: true,
    ]
    guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
      throw DocumentTextFailure.unreadable
    }
    return image
  }

  // MARK: - OCR

  private func recognize(_ image: CGImage) throws -> String {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["pt-BR", "en-US"]
    request.usesLanguageCorrection = true
    request.customWords = Self.customWords
    do {
      try VNImageRequestHandler(cgImage: image, orientation: .up, options: [:]).perform([request])
    } catch {
      throw DocumentTextFailure.ocrFailed
    }
    let fragments: [TextFragment] = (request.results ?? []).compactMap { observation in
      guard let candidate = observation.topCandidates(1).first else { return nil }
      let box = observation.boundingBox // normalizado, origem embaixo à esquerda
      return TextFragment(text: candidate.string, x: box.minX, centerY: 1 - box.midY, height: box.height)
    }
    return Self.joinInReadingOrder(fragments)
  }

  struct TextFragment {
    let text: String
    let x: CGFloat
    let centerY: CGFloat // de cima para baixo
    let height: CGFloat
  }

  /// Monta linhas: fragmentos com centro vertical a até meia altura do primeiro da linha ficam juntos,
  /// ordenados da esquerda para a direita e separados por dois espaços (colunas de laudo).
  static func joinInReadingOrder(_ fragments: [TextFragment]) -> String {
    var rows: [[TextFragment]] = []
    for fragment in fragments.sorted(by: { $0.centerY < $1.centerY }) {
      if let anchor = rows.last?.first,
         abs(fragment.centerY - anchor.centerY) <= min(fragment.height, anchor.height) * 0.5 {
        rows[rows.count - 1].append(fragment)
      } else {
        rows.append([fragment])
      }
    }
    return rows
      .map { $0.sorted(by: { $0.x < $1.x }).map(\.text).joined(separator: "  ") }
      .joined(separator: "\n")
  }

  static func clip(_ text: String, budget: Int) -> (String, Bool) {
    guard budget > 0 else { return ("", true) }
    return text.count > budget ? (String(text.prefix(budget)), true) : (text, false)
  }
}

/// Pedidos cancelados pelo JS. Thread-safe: `cancel` roda na thread do JS, `isCancelled` na fila do módulo.
final class CancellationRegistry: @unchecked Sendable {
  private let lock = NSLock()
  private var ids = Set<String>()

  func cancel(_ id: String) {
    lock.lock(); defer { lock.unlock() }
    ids.insert(id)
  }

  func isCancelled(_ id: String?) -> Bool {
    guard let id else { return false }
    lock.lock(); defer { lock.unlock() }
    return ids.contains(id)
  }

  func clear(_ id: String?) {
    guard let id else { return }
    lock.lock(); defer { lock.unlock() }
    ids.remove(id)
  }
}
