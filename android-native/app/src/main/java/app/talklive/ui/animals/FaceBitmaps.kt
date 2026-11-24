package app.talklive.ui.animals

import android.content.Context
import android.util.LruCache
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.layout.Box
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Plus portraits as ready-made bitmaps. Drawing a detailed vector is costly, and a list or
 * picker used to redraw one each time a row scrolled into view - the cause of the stutter.
 * Each face is drawn once per size, off the main thread, and every copy on screen reuses it.
 * The cache is capped (an eighth of the app's memory, at most 24 MB) and drops the
 * least-recently-shown faces first.
 */
object FaceBitmaps {
    private val cache = object : LruCache<String, ImageBitmap>(
        (Runtime.getRuntime().maxMemory() / 8).coerceAtMost(24L * 1024 * 1024).toInt(),
    ) {
        override fun sizeOf(key: String, value: ImageBitmap) = value.width * value.height * 4
    }

    /**
     * Sizes are rounded up to steps of 32 px: a tile a pixel or two different from its
     * neighbour reuses the same image instead of drawing another, and a warm-up can draw ahead
     * for the size a grid will ask for.
     */
    fun bucket(px: Int): Int = ((px + 31) / 32) * 32

    fun peek(res: Int, px: Int): ImageBitmap? = cache.get("$res@${bucket(px)}")

    // One drawing at a time, on a background thread: never competes with scrolling for the CPU.
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    private val drawer = Dispatchers.Default.limitedParallelism(1)

    suspend fun load(context: Context, res: Int, px: Int): ImageBitmap? {
        val b = bucket(px)
        peek(res, b)?.let { return it }
        return withContext(drawer) {
            peek(res, b) ?: runCatching {
                val d = ContextCompat.getDrawable(context, res) ?: return@runCatching null
                d.toBitmap(b, b).asImageBitmap().also { it.prepareToDraw(); cache.put("$res@$b", it) }
            }.getOrNull()
        }
    }

    /** Draws these faces ahead, for a grid about to show them at [px]. */
    suspend fun prewarm(context: Context, resIds: List<Int>, px: Int) {
        for (res in resIds.distinct()) load(context.applicationContext, res, px)
    }
}

/** A face as a cached bitmap at exactly the size it is shown (see [FaceBitmaps]). */
@Composable
fun FaceImage(res: Int, description: String?, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    var px by remember { mutableStateOf(0) }
    var bmp by remember(res, px) { mutableStateOf(if (px > 0) FaceBitmaps.peek(res, px) else null) }
    if (px > 0 && bmp == null) LaunchedEffect(res, px) { bmp = FaceBitmaps.load(context, res, px) }
    Box(modifier.onSizeChanged { if (it.width > 0 && FaceBitmaps.bucket(it.width) != FaceBitmaps.bucket(px)) px = it.width }) {
        bmp?.let { Image(it, description, Modifier.matchParentSize(), filterQuality = androidx.compose.ui.graphics.FilterQuality.Medium) }
    }
}
