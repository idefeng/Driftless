package expo.modules.cadenceaudio

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

// Order matters: index === position in this list.
private val SOUND_IDS = listOf("beep", "woodfish", "click", "bubble", "droplet")
// Click buffer layout: [0, N) normal timbres, [N, 2N) accent variants (same
// grain, pitched up a fifth), then one phase-change cue chirp.
private val SOUND_COUNT = SOUND_IDS.size
private val CUE_INDEX = SOUND_COUNT * 2
private fun soundIndex(id: String): Int = SOUND_IDS.indexOf(id).let { if (it < 0) 1 else it }
private fun clampBpm(b: Double): Double = min(250.0, max(100.0, Math.round(b).toDouble()))

/**
 * Sample-accurate cadence engine on AudioTrack (ENCODING_PCM_FLOAT, streaming).
 *
 * A high-priority render thread fills fixed PCM blocks, placing each click at an
 * exact sample offset via a `samplesUntilNextBeat` counter that re-reads the live
 * interval at every beat — zero accumulating drift, sub-sample jitter. The blocking
 * `AudioTrack.write` paces the loop to the hardware clock.
 *
 * Accent beats (every N-th) swap in a pitched-up variant of the same grain; a
 * phase-change cue is layered onto the next beat so it can never land off-grid.
 * `rampTo` linearly glides the BPM (PRD §3.4 Ramp): each beat boundary re-derives
 * its interval from the ramp progress counted in samples, so ramps add no drift.
 *
 * Beats route through USAGE_MEDIA so hardware volume keys control them like
 * music. Audio focus is applied per mode: no focus for mix, GAIN for exclusive,
 * and TRANSIENT_MAY_DUCK when the user opts into ducking.
 */
class CadenceAudioModule : Module() {
  // ── Control state (written by JS thread, read by render thread) ──────────
  @Volatile private var intervalSamples = 16000
  @Volatile private var volume = 0.72f
  @Volatile private var running = false
  @Volatile private var selectedSound = 1 // woodfish
  @Volatile private var beatCounter = 0
  @Volatile private var mixWithOthers = true
  @Volatile private var ducking = false
  @Volatile private var currentBpm = 180.0
  // 0 = no accent; N = every N-th beat (counted from start) is accented.
  @Volatile private var accentEvery = 0
  // Set by cue(); consumed by the render thread at the next beat boundary.
  @Volatile private var cuePending = false

  // Linear BPM ramp. rampTo() writes the target into intervalSamples up front,
  // so when the ramp finishes (or is cancelled by setBpm) the plain interval is
  // already correct; while active, each beat interpolates from→to by progress.
  @Volatile private var rampActive = false
  @Volatile private var rampFromBpm = 180.0
  @Volatile private var rampToBpm = 180.0
  @Volatile private var rampTotalSamples = 1
  @Volatile private var rampElapsed = 0

  // Audio focus reflects the playback mode (see applyFocus): GAIN for exclusive
  // (others pause), TRANSIENT_MAY_DUCK for coexist+ducking (others lower), and
  // none for plain coexist so beats mix on top (PRD §3.2).
  private var focusRequest: AudioFocusRequest? = null
  @Volatile private var currentFocusGain = 0 // 0 = no focus held
  // 短暂失焦（AUDIOFOCUS_LOSS_TRANSIENT）前是否在播；AUDIOFOCUS_GAIN 时据此恢复。
  @Volatile private var wasPlayingBeforeFocusLoss = false
  // 焦点被夺走（来电、其他播放器抢占等）时暂停引擎并上报 JS，保持播放按钮与
  // 锁屏通知同步；短暂中断在焦点归还时自动恢复。
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS -> {
        // 永久失焦：焦点不会自动归还，放弃恢复并释放焦点申请。
        wasPlayingBeforeFocusLoss = false
        if (running) {
          running = false
          applyFocus()
          sendEvent("onInterrupted", mapOf("reason" to "audioFocusLoss"))
        }
      }
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
        // 短暂失焦：暂停但保留焦点申请，等 AUDIOFOCUS_GAIN 时恢复播放。
        if (running) {
          wasPlayingBeforeFocusLoss = true
          running = false
          sendEvent("onInterrupted", mapOf("reason" to "audioFocusLoss"))
        }
      }
      AudioManager.AUDIOFOCUS_GAIN -> {
        // 焦点归还：仅当中断前确实在播时才重启节拍，下一拍立即发声。
        if (wasPlayingBeforeFocusLoss && !running) {
          wasPlayingBeforeFocusLoss = false
          samplesUntilNextBeat = 0
          running = true
          ensurePlaying()
        }
      }
      // AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK：对方允许我们压低音量继续播，保持现状。
    }
  }

  private var sampleRate = 48000
  private var track: AudioTrack? = null
  private var renderThread: Thread? = null
  @Volatile private var threadAlive = false
  private var prepared = false

  private var clickBuffers: Array<FloatArray> = arrayOf()

  // Headphone unplug / Bluetooth disconnect (PRD §4.1 — default pause, avoid
  // suddenly blasting through the speaker). JS didn't initiate this stop, so
  // it's told via "onInterrupted" to keep the play button / notification in sync.
  private var noisyReceiver: BroadcastReceiver? = null

  // ── Render-thread-owned state ────────────────────────────────────────────
  @Volatile private var samplesUntilNextBeat = 0
  private val voiceCount = 8
  private val voiceActive = BooleanArray(voiceCount)
  private val voiceSound = IntArray(voiceCount)
  private val voicePos = IntArray(voiceCount)

  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("CadenceAudio")

    Events("onBeat", "onInterrupted")

    Property("isRunning") { running }

    Function("prepare") { mix: Boolean -> prepare(mix) }

    Function("start") { bpm: Double ->
      // prepare first: it resolves the device sample rate the interval depends on.
      if (!prepared) prepare(mixWithOthers)
      rampActive = false
      cuePending = false
      currentBpm = clampBpm(bpm)
      intervalSamples = intervalSamplesFor(bpm)
      samplesUntilNextBeat = 0 // first beat fires immediately
      beatCounter = 0
      running = true
      ensurePlaying()
      applyFocus()
    }

    Function("stop") {
      running = false
      applyFocus()
    }

    Function("setBpm") { bpm: Double ->
      rampActive = false // an explicit rate always wins over an in-flight ramp
      currentBpm = clampBpm(bpm)
      intervalSamples = intervalSamplesFor(bpm)
    }

    Function("rampTo") { bpm: Double, durationMs: Double ->
      val target = clampBpm(bpm)
      val total = (durationMs / 1000.0 * sampleRate).toInt()
      rampActive = false
      if (running && total > 0 && target != currentBpm) {
        rampFromBpm = currentBpm
        rampToBpm = target
        rampTotalSamples = total
        rampElapsed = 0
        rampActive = true
      }
      currentBpm = target
      intervalSamples = intervalSamplesFor(target)
    }

    Function("setAccent") { every: Int -> accentEvery = max(0, every) }

    Function("cue") {
      // 停止时不挂起提示，避免下次 start 的第一拍误响。
      if (running) {
        cuePending = true
      }
      Unit
    }

    Function("setVolume") { v: Double -> volume = min(1.0, max(0.0, v)).toFloat() }

    Function("setSound") { id: String -> selectedSound = soundIndex(id) }

    Function("setMixWithOthers") { mix: Boolean ->
      mixWithOthers = mix
      applyFocus()
    }

    Function("setDucking") { duck: Boolean ->
      ducking = duck
      applyFocus()
    }

    OnDestroy { teardown() }
  }

  private fun intervalSamplesFor(bpm: Double): Int {
    val b = clampBpm(bpm)
    return max(1, Math.round(sampleRate * 60.0 / b).toInt())
  }

  // MARK: - Setup

  private fun prepare(mix: Boolean) {
    mixWithOthers = mix
    if (prepared) return

    val native = AudioTrack.getNativeOutputSampleRate(AudioManager.STREAM_MUSIC)
    sampleRate = if (native > 0) native else 48000
    synthesize()

    val channelMask = AudioFormat.CHANNEL_OUT_STEREO
    val minBuf = AudioTrack.getMinBufferSize(sampleRate, channelMask, AudioFormat.ENCODING_PCM_FLOAT)
    val bufBytes = max(minBuf, 4 /*bytes*/ * 2 /*ch*/ * 1024)

    // USAGE_MEDIA routes to the music stream (the volume the user controls with
    // the volume keys), so beats are reliably audible. We still never request
    // audio focus, so they mix on top of any playing music (PRD §3.2 coexist).
    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build()
    val fmt = AudioFormat.Builder()
      .setSampleRate(sampleRate)
      .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
      .setChannelMask(channelMask)
      .build()

    val builder = AudioTrack.Builder()
      .setAudioAttributes(attrs)
      .setAudioFormat(fmt)
      .setBufferSizeInBytes(bufBytes)
      .setTransferMode(AudioTrack.MODE_STREAM)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
    }
    track = builder.build()

    registerNoisyReceiver()
    prepared = true
  }

  private fun ensurePlaying() {
    val t = track ?: return
    if (t.playState != AudioTrack.PLAYSTATE_PLAYING) t.play()
    if (renderThread?.isAlive != true) {
      threadAlive = true
      renderThread = thread(name = "cadence-render", priority = Thread.MAX_PRIORITY) { renderLoop() }
    }
  }

  // MARK: - Render loop

  private fun renderLoop() {
    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
    val t = track ?: return
    val blockFrames = 256
    val channels = 2
    val out = FloatArray(blockFrames * channels)

    while (threadAlive) {
      val interval = intervalSamples
      val vol = volume
      val isRun = running

      for (i in 0 until blockFrames) {
        var s = 0f

        for (v in 0 until voiceCount) {
          if (voiceActive[v]) {
            val buf = clickBuffers[voiceSound[v]]
            val pos = voicePos[v]
            s += buf[pos]
            val next = pos + 1
            if (next >= buf.size) voiceActive[v] = false else voicePos[v] = next
          }
        }

        if (isRun) {
          if (rampActive) rampElapsed += 1
          samplesUntilNextBeat -= 1
          if (samplesUntilNextBeat <= 0) {
            val acc = accentEvery
            val accented = acc > 0 && beatCounter % acc == 0
            startVoice(if (accented) selectedSound + SOUND_COUNT else selectedSound)
            if (cuePending) {
              cuePending = false
              startVoice(CUE_INDEX)
            }
            var next = interval
            if (rampActive) {
              val p = min(1.0, rampElapsed.toDouble() / max(1, rampTotalSamples))
              val b = rampFromBpm + (rampToBpm - rampFromBpm) * p
              next = (sampleRate * 60.0 / b).roundToInt()
              if (p >= 1.0) rampActive = false
            }
            samplesUntilNextBeat += max(1, next) // re-rate at the boundary
            beatCounter += 1
          }
        }

        // Cue + click can overlap; hard-limit so the sum never wraps/clips harshly.
        s = (s * vol).coerceIn(-1f, 1f)
        val o = i * channels
        out[o] = s
        out[o + 1] = s
      }

      val written = t.write(out, 0, out.size, AudioTrack.WRITE_BLOCKING)
      if (written < 0) break
    }
  }

  private fun startVoice(bufferIndex: Int) {
    for (v in 0 until voiceCount) {
      if (!voiceActive[v]) {
        voiceActive[v] = true
        voiceSound[v] = bufferIndex
        voicePos[v] = 0
        return
      }
    }
  }

  // MARK: - Click synthesis (short, normalized, zero-silence edges)

  private fun synthesize() {
    if (clickBuffers.isNotEmpty()) return
    // freq, decay(s), dur(s), noise
    val grains = arrayOf(
      doubleArrayOf(1900.0, 0.012, 0.035, 0.0),  // beep
      doubleArrayOf(720.0, 0.018, 0.055, 0.06),  // woodfish
      doubleArrayOf(3000.0, 0.004, 0.014, 0.15), // click
      doubleArrayOf(480.0, 0.025, 0.075, 0.22),  // bubble
      doubleArrayOf(2600.0, 0.02, 0.05, 0.03),   // droplet
    )
    val normal = Array(grains.size) { synth(grains[it][0], grains[it][1], grains[it][2], grains[it][3]) }
    // Accent: same grain a fifth higher — clearly distinct, equally loud.
    val accent = Array(grains.size) { synth(grains[it][0] * 1.5, grains[it][1], grains[it][2], grains[it][3]) }
    clickBuffers = normal + accent + arrayOf(synthCue())
  }

  /** Rising two-note chirp (B5 → E6) marking an upcoming phase change. */
  private fun synthCue(): FloatArray {
    val len = (0.17 * sampleRate).toInt()
    val split = (0.075 * sampleRate).toInt()
    val fadeOut = max(1, (0.002 * sampleRate).toInt())
    val data = FloatArray(len)
    var peak = 0f
    for (i in 0 until len) {
      val first = i < split
      val local = if (first) i else i - split
      val t = local.toDouble() / sampleRate
      val freq = if (first) 988.0 else 1319.0
      val decay = if (first) 0.03 else 0.045
      var s = (sin(2.0 * PI * freq * t) * exp(-t / decay)).toFloat()
      if (local < 32) s *= local / 32f // zero-edge attack on both notes
      if (first && i > split - fadeOut) s *= (split - i).toFloat() / fadeOut
      if (i > len - fadeOut) s *= (len - i).toFloat() / fadeOut
      data[i] = s
      if (abs(s) > peak) peak = abs(s)
    }
    if (peak > 0) {
      val norm = 0.6f / peak
      for (i in 0 until len) data[i] *= norm
    }
    return data
  }

  private fun synth(freq: Double, decay: Double, dur: Double, noise: Double): FloatArray {
    val len = max(1, (dur * sampleRate).toInt())
    val fadeOut = max(1, (0.002 * sampleRate).toInt())
    val data = FloatArray(len)
    var peak = 0f
    for (i in 0 until len) {
      val t = i.toDouble() / sampleRate
      val env = exp(-t / decay)
      val tone = sin(2.0 * PI * freq * t)
      val n = if (noise > 0) Random.nextDouble(-1.0, 1.0) * noise else 0.0
      var s = ((tone + n) * env).toFloat()
      if (i < 32) s *= i / 32f                 // sub-ms attack from zero
      if (i > len - fadeOut) s *= (len - i).toFloat() / fadeOut
      data[i] = s
      if (abs(s) > peak) peak = abs(s)
    }
    if (peak > 0) {
      val norm = 0.9f / peak
      for (i in 0 until len) data[i] *= norm
    }
    return data
  }

  // MARK: - Route changes (headphone unplug / Bluetooth disconnect)

  private fun registerNoisyReceiver() {
    if (noisyReceiver != null) return
    val ctx = appContext.reactContext ?: return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != AudioManager.ACTION_AUDIO_BECOMING_NOISY) return
        if (!running) return
        running = false
        applyFocus()
        sendEvent("onInterrupted", mapOf("reason" to "routeChanged"))
      }
    }
    val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      // API 33+ requires an explicit exported flag for context-registered receivers.
      ctx.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      ctx.registerReceiver(receiver, filter)
    }
    noisyReceiver = receiver
  }

  private fun unregisterNoisyReceiver() {
    val receiver = noisyReceiver ?: return
    try {
      appContext.reactContext?.unregisterReceiver(receiver)
    } catch (_: IllegalArgumentException) {
      // Already unregistered (e.g. context torn down first) — safe to ignore.
    }
    noisyReceiver = null
  }

  // MARK: - Audio focus (matches the coexist / exclusive / ducking mode)

  private fun audioManager(): AudioManager? =
    appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  /**
   * Reconcile the held audio focus with the current mode:
   *  - exclusive (mixWithOthers == false) → AUDIOFOCUS_GAIN, so other apps pause
   *  - coexist + ducking → AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK, so others lower
   *  - plain coexist, or not playing → no focus, so beats just mix on top
   *
   * 注意：ducking 模式在整个会话期间长期持有 TRANSIENT_MAY_DUCK，尽管 transient
   * 类焦点按设计只用于短暂打断——但 Android 没有长期有效的 “may duck” 增益类型，
   * 而逐拍重新申请会让音乐流反复压低/恢复。其他应用仍可能抢走完整焦点，由
   * focusListener 负责暂停/恢复我们。
   */
  private fun applyFocus() {
    val desired = when {
      !running -> 0
      !mixWithOthers -> AudioManager.AUDIOFOCUS_GAIN
      ducking -> AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
      else -> 0
    }
    if (desired == currentFocusGain) return
    abandonFocus()
    if (desired != 0) requestFocus(desired)
  }

  private fun requestFocus(gain: Int) {
    val am = audioManager() ?: return
    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val req = AudioFocusRequest.Builder(gain)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        )
        .setOnAudioFocusChangeListener(focusListener, mainHandler)
        .setWillPauseWhenDucked(false)
        .build()
      focusRequest = req
      am.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, gain)
    }
    // 只在真正拿到焦点时置位，否则 currentFocusGain 会骗过 applyFocus 的
    // “已持有”判断，导致 stop 时漏掉 abandonFocus。
    if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
      currentFocusGain = gain
    } else {
      focusRequest = null
    }
  }

  private fun abandonFocus() {
    if (currentFocusGain == 0) return
    val am = audioManager()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am?.abandonAudioFocusRequest(it) }
      focusRequest = null
    } else {
      @Suppress("DEPRECATION")
      am?.abandonAudioFocus(focusListener)
    }
    currentFocusGain = 0
  }

  // MARK: - Teardown

  private fun teardown() {
    running = false
    threadAlive = false
    unregisterNoisyReceiver()
    abandonFocus()
    try {
      renderThread?.join(200)
    } catch (_: InterruptedException) {
    }
    renderThread = null
    track?.let {
      try {
        it.stop()
      } catch (_: Exception) {
      }
      it.release()
    }
    track = null
    prepared = false
  }
}
