package expo.modules.cadencelive

import android.content.Intent
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class LiveSessionRecord : Record {
  @Field var bpm: Int = 180
  @Field var phaseName: String = ""
  @Field var phaseIndex: Int = 0
  @Field var phaseCount: Int = 1
  @Field var endTimeMs: Double = 0.0
  @Field var running: Boolean = false
}

class CadenceLiveModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("CadenceLive")

    Events("onAction")

    OnCreate {
      CadenceLiveService.actionListener = { action ->
        mainHandler.post { sendEvent("onAction", mapOf("action" to action)) }
      }
    }

    OnDestroy {
      CadenceLiveService.actionListener = null
      sendServiceIntent(CadenceLiveService.ACTION_STOP, null)
    }

    Function("isSupported") {
      val ctx = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    Function("start") { state: LiveSessionRecord ->
      startForegroundWith(CadenceLiveService.ACTION_START, state)
    }

    Function("update") { state: LiveSessionRecord ->
      startForegroundWith(CadenceLiveService.ACTION_UPDATE, state)
    }

    Function("stop") {
      sendServiceIntent(CadenceLiveService.ACTION_STOP, null)
    }
  }

  private fun intentFor(action: String, s: LiveSessionRecord?): Intent? {
    val ctx = appContext.reactContext ?: return null
    return Intent(ctx, CadenceLiveService::class.java).apply {
      this.action = action
      s?.let {
        putExtra("bpm", it.bpm)
        putExtra("phaseName", it.phaseName)
        putExtra("phaseIndex", it.phaseIndex)
        putExtra("phaseCount", it.phaseCount)
        putExtra("endTimeMs", it.endTimeMs)
        putExtra("running", it.running)
      }
    }
  }

  private fun startForegroundWith(action: String, s: LiveSessionRecord) {
    val ctx = appContext.reactContext ?: return
    val intent = intentFor(action, s) ?: return
    ContextCompat.startForegroundService(ctx, intent)
  }

  private fun sendServiceIntent(action: String, s: LiveSessionRecord?) {
    val ctx = appContext.reactContext ?: return
    val intent = intentFor(action, s) ?: return
    try {
      ctx.startService(intent)
    } catch (_: Exception) {
      // Service may already be stopped/in background; safe to ignore.
    }
  }
}
