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
  @Field var phaseProgressText: String = ""
  @Field var remainingLabel: String = "Left"
  @Field var skipActionLabel: String = "Skip phase"
  @Field var channelName: String = "Run cadence"
  @Field var channelDescription: String = "Active cadence and controls"
}

class CadenceLiveModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  // 服务是否已被我们以 START/UPDATE 拉起；决定 update 用哪种方式下发。
  private var serviceRunning = false

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
      serviceRunning = false
      sendServiceIntent(CadenceLiveService.ACTION_STOP, null)
    }

    Function("isSupported") {
      val ctx = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.from(ctx).areNotificationsEnabled()
    }

    Function("start") { state: LiveSessionRecord ->
      serviceRunning = true
      startForegroundWith(CadenceLiveService.ACTION_START, state)
    }

    Function("update") { state: LiveSessionRecord ->
      if (serviceRunning) {
        // 服务已是前台服务时，普通 startService 即可送达 UPDATE 并刷新通知。
        // 从后台/锁屏（±1 按钮链路）调 startForegroundService 在 Android 12+
        // 会抛 ForegroundServiceStartNotAllowedException。
        sendServiceIntent(CadenceLiveService.ACTION_UPDATE, state)
      } else {
        serviceRunning = true
        startForegroundWith(CadenceLiveService.ACTION_UPDATE, state)
      }
    }

    Function("stop") {
      serviceRunning = false
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
        putExtra("phaseProgressText", it.phaseProgressText)
        putExtra("remainingLabel", it.remainingLabel)
        putExtra("skipActionLabel", it.skipActionLabel)
        putExtra("channelName", it.channelName)
        putExtra("channelDescription", it.channelDescription)
      }
    }
  }

  private fun startForegroundWith(action: String, s: LiveSessionRecord) {
    val ctx = appContext.reactContext ?: return
    val intent = intentFor(action, s) ?: return
    try {
      ContextCompat.startForegroundService(ctx, intent)
    } catch (_: Exception) {
      // 后台启动前台服务在 Android 12+ 会抛
      // ForegroundServiceStartNotAllowedException；宁可丢一次通知也不崩溃。
      serviceRunning = false
    }
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
