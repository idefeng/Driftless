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
    // v2: bumped to a fresh id because the original channel was created at
    // IMPORTANCE_LOW (a "silent" notification), which many OEMs hide from the
    // lock screen. A channel's importance can't be raised after creation, so we
    // migrate to a new id at IMPORTANCE_DEFAULT with explicit PUBLIC lock-screen
    // visibility — still silent (no channel sound), but shown on the lock screen.
    const val CHANNEL_ID = "driftless_cadence_v2"
    const val OLD_CHANNEL_ID = "driftless_cadence"
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
  private var phaseProgressText = ""
  private var skipActionLabel = "Skip phase"
  private var channelName = "Run cadence"
  private var channelDescription = "Active cadence and controls"

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
    if (intent.hasExtra("phaseProgressText")) phaseProgressText = intent.getStringExtra("phaseProgressText") ?: phaseProgressText
    if (intent.hasExtra("skipActionLabel")) skipActionLabel = intent.getStringExtra("skipActionLabel") ?: skipActionLabel
    if (intent.hasExtra("channelName")) channelName = intent.getStringExtra("channelName") ?: channelName
    if (intent.hasExtra("channelDescription")) channelDescription = intent.getStringExtra("channelDescription") ?: channelDescription
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    // Drop the old LOW-importance channel so it doesn't linger in app settings.
    mgr.deleteNotificationChannel(OLD_CHANNEL_ID)
    val existing = mgr.getNotificationChannel(CHANNEL_ID)
    if (existing != null) {
      existing.setName(channelName)
      existing.setDescription(channelDescription)
      mgr.createNotificationChannel(existing)
      return
    }
    val channel = NotificationChannel(
      CHANNEL_ID,
      channelName,
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = channelDescription
      setShowBadge(false)
      setSound(null, null)
      enableVibration(false)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    mgr.createNotificationChannel(channel)
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
    val isWorkout = phaseCount > 1
    val title = if (phaseName.isEmpty()) "Driftless" else "Driftless · $phaseName"
    val sub = if (isWorkout && phaseProgressText.isNotEmpty()) "$bpm SPM · $phaseProgressText" else "$bpm SPM"

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(title)
      .setContentText(sub)
      .setOngoing(true)
      .setColorized(true)
      .setColor(0xFFFF8C2B.toInt())
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)
      .addAction(0, "−1", servicePending(ACTION_DEC))
    // 只有结构化训练才展示“跳过阶段”控制。
    if (isWorkout) builder.addAction(0, skipActionLabel, servicePending(ACTION_SKIP))
    builder.addAction(0, "+1", servicePending(ACTION_INC))

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
