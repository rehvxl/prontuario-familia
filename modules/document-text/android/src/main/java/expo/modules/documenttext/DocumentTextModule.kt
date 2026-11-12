package expo.modules.documenttext

import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.ConcurrentHashMap

class ExtractTextOptions : Record {
  @Field var maxPages: Int = DocumentTextEngine.DEFAULT_MAX_PAGES
  @Field var requestId: String? = null
}

class DocumentTextModule : Module() {
  private val cancelled: MutableSet<String> = ConcurrentHashMap.newKeySet()

  @Volatile private var engine: DocumentTextEngine? = null

  private fun engine(): DocumentTextEngine =
    engine ?: synchronized(this) {
      engine ?: DocumentTextEngine(
        (appContext.reactContext ?: throw Exceptions.ReactContextLost()).applicationContext,
      ).also { engine = it }
    }

  override fun definition() = ModuleDefinition {
    Name("DocumentText")

    // Coroutine + Dispatchers.Default: a fila padrão de AsyncFunction é UMA thread compartilhada por todos os módulos.
    AsyncFunction("extractText") Coroutine { uri: String, mimeType: String, options: ExtractTextOptions ->
      val requestId = options.requestId
      try {
        val result = withContext(Dispatchers.Default) {
          engine().extract(parseUri(uri), mimeType, options.maxPages) { requestId != null && requestId in cancelled }
        }
        mapOf(
          "engine" to "mlkit-latin",
          "pageCount" to result.pageCount,
          "truncated" to result.truncated,
          "pages" to result.pages.map { mapOf("index" to it.index, "text" to it.text, "source" to it.source) },
        )
      } finally {
        if (requestId != null) cancelled.remove(requestId)
      }
    }

    Function("cancel") { requestId: String ->
      cancelled.add(requestId)
      Unit
    }

    OnDestroy {
      engine?.close()
    }
  }

  private fun parseUri(value: String): Uri {
    val uri = Uri.parse(value)
    return if (uri.scheme.isNullOrEmpty()) Uri.fromFile(File(value)) else uri
  }
}
