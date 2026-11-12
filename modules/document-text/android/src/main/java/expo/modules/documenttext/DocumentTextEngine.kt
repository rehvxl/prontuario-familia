package expo.modules.documenttext

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.os.ParcelFileDescriptor
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.CodedException
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.FileNotFoundException
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Código estável para o JS; a mensagem é técnica e nunca contém texto do documento. */
class DocumentTextException(code: String, message: String, cause: Throwable? = null) :
  CodedException("ERR_DOCUMENT_TEXT_$code", message, cause)

data class ExtractedPage(val index: Int, val text: String, val source: String)

data class ExtractionResult(val pages: List<ExtractedPage>, val pageCount: Int, val truncated: Boolean)

/**
 * PDF com camada de texto (Android 15+) → PdfRenderer.Page.getTextContents(); PDF escaneado,
 * Android < 15 ou imagem → ML Kit Text Recognition v2 (modelo latino embutido). Nada sai do aparelho.
 */
class DocumentTextEngine(private val context: Context) {
  companion object {
    const val MAX_FILE_BYTES = 20L * 1024 * 1024
    const val DEFAULT_MAX_PAGES = 10
    const val HARD_MAX_PAGES = 20
    /** Abaixo disso a camada de texto é considerada vazia (PDF escaneado) e a página vai para o OCR. */
    const val MIN_PDF_TEXT_CHARS = 30
    const val MAX_IMAGE_SIDE = 3000
    const val PDF_RENDER_LONG_SIDE = 2200f
    const val MAX_TOTAL_CHARS = 200_000
    private const val PDF = "application/pdf"
    private val IMAGE_TYPES = setOf("image/jpeg", "image/png", "image/heic", "image/heif", "image/webp")
  }

  private val recognizerLazy = lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }
  private val recognizer: TextRecognizer by recognizerLazy

  fun close() {
    if (recognizerLazy.isInitialized()) recognizer.close()
  }

  suspend fun extract(uri: Uri, mimeType: String, maxPages: Int, isCancelled: () -> Boolean): ExtractionResult {
    val mime = mimeType.lowercase()
    if (mime != PDF && mime !in IMAGE_TYPES) throw DocumentTextException("UNSUPPORTED_TYPE", "Tipo de arquivo não suportado.")
    val descriptor = open(uri)
    try {
      val size = descriptor.statSize // -1 quando o provedor não informa o tamanho
      if (size == 0L) throw DocumentTextException("UNREADABLE", "Arquivo vazio.")
      if (size > MAX_FILE_BYTES) throw DocumentTextException("TOO_LARGE", "Arquivo maior que 20 MB.")
    } catch (e: Throwable) {
      descriptor.close()
      throw e
    }
    if (mime == PDF) return extractPdf(descriptor, maxPages.coerceIn(1, HARD_MAX_PAGES), isCancelled)

    descriptor.close()
    if (isCancelled()) throw DocumentTextException("CANCELLED", "Leitura cancelada.")
    val text = recognize(loadImage(uri))
    val clipped = text.take(MAX_TOTAL_CHARS)
    return ExtractionResult(listOf(ExtractedPage(0, clipped, "ocr")), 1, clipped.length < text.length)
  }

  private fun open(uri: Uri): ParcelFileDescriptor =
    try {
      context.contentResolver.openFileDescriptor(uri, "r") // aceita file:// e content://
    } catch (e: FileNotFoundException) {
      null
    } catch (e: SecurityException) {
      null
    } ?: throw DocumentTextException("FILE_NOT_FOUND", "Arquivo não encontrado.")

  // ---------------------------------------------------------------- PDF

  private suspend fun extractPdf(descriptor: ParcelFileDescriptor, limit: Int, isCancelled: () -> Boolean): ExtractionResult {
    // O PdfRenderer assume o descriptor e o fecha no close().
    val renderer = try {
      PdfRenderer(descriptor)
    } catch (e: SecurityException) {
      descriptor.close()
      throw DocumentTextException("PDF_LOCKED", "PDF protegido por senha.", e)
    } catch (e: IOException) {
      descriptor.close()
      throw DocumentTextException("UNREADABLE", "PDF corrompido ou inválido.", e)
    }
    renderer.use {
      val pageCount = renderer.pageCount
      if (pageCount == 0) throw DocumentTextException("UNREADABLE", "PDF sem páginas.")
      val pages = mutableListOf<ExtractedPage>()
      var budget = MAX_TOTAL_CHARS
      var truncated = pageCount > limit
      for (index in 0 until min(pageCount, limit)) {
        if (isCancelled()) throw DocumentTextException("CANCELLED", "Leitura cancelada.")
        // Só uma página aberta por vez: lê a camada de texto ou rasteriza, fecha a página e só então roda o OCR.
        val (layer, bitmap) = renderer.openPage(index).use { page ->
          val found = textLayer(page)
          found to (if (found.length >= MIN_PDF_TEXT_CHARS) null else render(page))
        }
        val text = if (bitmap == null) layer else recognize(bitmap)
        val clipped = text.take(budget)
        pages += ExtractedPage(index, clipped, if (bitmap == null) "pdf-text" else "ocr")
        budget -= clipped.length
        if (clipped.length < text.length || budget <= 0) {
          truncated = true
          break
        }
      }
      return ExtractionResult(pages, pageCount, truncated)
    }
  }

  private fun textLayer(page: PdfRenderer.Page): String =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      page.textContents.joinToString("\n") { it.text }.trim()
    } else {
      "" // antes do Android 15 o PdfRenderer não expõe texto: a página vai para o OCR
    }

  /** Fundo branco obrigatório: sem ele o texto vira preto sobre transparente e o OCR não enxerga. */
  private fun render(page: PdfRenderer.Page): Bitmap {
    val scale = PDF_RENDER_LONG_SIDE / max(page.width, page.height)
    val bitmap = Bitmap.createBitmap(
      (page.width * scale).roundToInt().coerceAtLeast(1),
      (page.height * scale).roundToInt().coerceAtLeast(1),
      Bitmap.Config.ARGB_8888,
    )
    bitmap.eraseColor(Color.WHITE)
    page.render(bitmap, null, Matrix().apply { setScale(scale, scale) }, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
    return bitmap
  }

  // ---------------------------------------------------------------- imagem

  /** Decodifica reduzida (lado maior ≤ ~3000 px, potência de 2) e aplica a rotação EXIF. */
  private fun loadImage(uri: Uri): Bitmap {
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw DocumentTextException("UNREADABLE", "Imagem ilegível.")
    var sample = 1
    while (max(bounds.outWidth, bounds.outHeight) / sample > MAX_IMAGE_SIDE) sample *= 2
    val options = BitmapFactory.Options().apply {
      inSampleSize = sample
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }
    val decoded = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
      ?: throw DocumentTextException("UNREADABLE", "Imagem ilegível.")
    val degrees = exifRotation(uri)
    if (degrees == 0) return decoded
    return Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, Matrix().apply { postRotate(degrees.toFloat()) }, true)
  }

  private fun exifRotation(uri: Uri): Int =
    try {
      context.contentResolver.openInputStream(uri)?.use { stream ->
        when (ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
          ExifInterface.ORIENTATION_ROTATE_90 -> 90
          ExifInterface.ORIENTATION_ROTATE_180 -> 180
          ExifInterface.ORIENTATION_ROTATE_270 -> 270
          else -> 0
        }
      } ?: 0
    } catch (e: IOException) {
      0
    }

  // ---------------------------------------------------------------- OCR

  // Sem bitmap.recycle(): se a corrotina for cancelada com o ML Kit ainda lendo o bitmap, reciclar derruba o app.
  // A memória do Bitmap (heap nativo, Android 8+) é liberada pelo GC.
  private suspend fun recognize(bitmap: Bitmap): String =
    joinInReadingOrder(recognizer.process(InputImage.fromBitmap(bitmap, 0)).await())

  private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { continuation ->
    addOnSuccessListener { continuation.resume(it) }
    addOnFailureListener { continuation.resumeWithException(DocumentTextException("OCR_FAILED", "Falha no reconhecimento de texto.", it)) }
    addOnCanceledListener { continuation.cancel() }
  }

  private class Fragment(val text: String, val x: Int, val centerY: Int, val height: Int)

  /** Mesmo algoritmo do iOS: linhas com centro a até meia altura da primeira da fila ficam juntas, ordenadas por x. */
  private fun joinInReadingOrder(result: Text): String {
    val lines = result.textBlocks.flatMap { it.lines }
    if (lines.any { it.boundingBox == null }) return result.text
    val rows = mutableListOf<MutableList<Fragment>>()
    lines
      .map { line -> line.boundingBox!!.let { Fragment(line.text, it.left, it.centerY(), it.height()) } }
      .sortedBy { it.centerY }
      .forEach { fragment ->
        val anchor = rows.lastOrNull()?.first()
        if (anchor != null && abs(fragment.centerY - anchor.centerY) * 2 <= min(fragment.height, anchor.height)) {
          rows.last().add(fragment)
        } else {
          rows.add(mutableListOf(fragment))
        }
      }
    return rows.joinToString("\n") { row -> row.sortedBy { it.x }.joinToString("  ") { it.text } }
  }
}
