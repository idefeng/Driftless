package expo.modules.cadencelive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Foreground service that carries the run-cadence "live" notification (PRD §3.3).
 *
 * In coexist mode the system media controls belong to the music app, so Driftless
 * presents its own ongoing notification with the BPM, phase, a live countdown, and
 * −1 / skip / +1 actions. Button taps are forwarded to the JS module via
 * [actionListener] which the module wires to the `onAction` event.
 */
class CadenceLiveService : Service() {

  companion object {
    const val CHANNEL_ID = "driftless_cadence"
    const val NOTIF_ID = 4201

    const val ACTION_START = "expo.modules.cadencelive.START"
    const val ACTION_UPDATE = "expo.modules.cadencelive.UPDATE"
    const val ACTION_STOP = "expo.modules.cadencelive.STOP"
    const val ACTION_INC = "expo.modules.cadencelive.INC"
    const val ACTION_DEC = "expo.modules.cadencelive.DEC"
    const val ACTION_SKIP = "expo.modules.cadencelive.SKIP"

    /** Set by the module while it is alive; receives "inc" | "dec" | "skip". */
    @Volatile
    var actionListener: ((String) -> Unit)? = null
  }

  private var bpm = 180
  private var phaseName = ""
  private var phaseIndex = 0
  private var phaseCount = 1
  private var endTimeMs = 0.0

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_INC -> actionListener?.invoke("inc")
      ACTION_DEC -> actionListener?.invoke("dec")
      ACTION_SKIP -> actionListener?.invoke("skip")
      ACTION_STOP -> {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
        return START_NOT_STICKY
      }
      else -> readState(intent)
    }

    // Refresh state from any extras carried by action intents too.
    if (intent?.action == ACTION_INC || intent?.action == ACTION_DEC || intent?.action == ACTION_SKIP) {
      readState(intent)
    }

    ensureChannel()
    val notification = buildNotification()
    ServiceCompat.startForeground(
      this,
      NOTIF_ID,
      notification,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
      else 0,
    )
    return START_STICKY
  }

  private fun readState(intent: Intent?) {
    intent ?: return
    if (intent.hasExtra("bpm")) bpm = intent.getIntExtra("bpm", bpm)
    if (intent.hasExtra("phaseName")) phaseName = intent.getStringExtra("phaseName") ?: phaseName
    if (intent.hasExtra("phaseIndex")) phaseIndex = intent.getIntExtra("phaseIndex", phaseIndex)
    if (intent.hasExtra("phaseCount")) phaseCount = intent.getIntExtra("phaseCount", phaseCount)
    if (intent.hasExtra("endTimeMs")) endTimeMs = intent.getDoubleExtra("endTimeMs", endTimeMs)
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "跑步节拍",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "运行中的步频与控制"
        setShowBadge(false)
        setSound(null, null)
      }
      mgr.createNotificationChannel(channel)
    }
  }

  private fun servicePending(action: String): PendingIntent {
    val intent = Intent(this, CadenceLiveService::class.java).setAction(action)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getService(this, action.hashCode(), intent, flags)
  }

  private fun contentPending(): PendingIntent? {
    val launch = packageManager.getLaunchIntentForPackage(packageName) ?: return null
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(this, 0, launch, flags)
  }

  private fun buildNotification(): Notification {
    val title = if (phaseName.isEmpty()) "Driftless" else "Driftless · $phaseName"
    val sub = "$bpm SPM · 第 ${phaseIndex + 1}/$phaseCount 段"

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(title)
      .setContentText(sub)
      .setOngoing(true)
      .setSilent(true)
      .setColorized(true)
      .setColor(0xFFFF8C2B.toInt())
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)
      .addAction(0, "−1", servicePending(ACTION_DEC))
      .addAction(0, "跳过本段", servicePending(ACTION_SKIP))
      .addAction(0, "+1", servicePending(ACTION_INC))

    contentPending()?.let { builder.setContentIntent(it) }

    // Live countdown without per-second updates.
    if (endTimeMs > 0) {
      builder.setWhen(endTimeMs.toLong())
      builder.setUsesChronometer(true)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        builder.setChronometerCountDown(true)
      }
    } else {
      builder.setShowWhen(false)
    }

    return builder.build()
  }

  override fun onDestroy() {
    super.onDestroy()
  }
}
