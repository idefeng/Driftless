package expo.modules.cadenceaudio

import android.content.Context
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
import kotlin.math.sin
import kotlin.random.Random

// Order matters: index === position in this list.
private val SOUND_IDS = listOf("beep", "woodfish", "click")
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
 * We never request audio focus, so beats mix on top of any music/podcast/video
 * (PRD §3.2 coexist). USAGE_ASSISTANCE_SONIFICATION marks them as cues so the
 * system won't arbitrarily duck them.
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

  // Audio focus is only held while ducking; otherwise we deliberately request
  // none so beats mix on top of other audio (PRD §3.2 coexist).
  private var focusRequest: AudioFocusRequest? = null

  private var sampleRate = 48000
  private var track: AudioTrack? = null
  private var renderThread: Thread? = null
  @Volatile private var threadAlive = false
  private var prepared = false

  private var clickBuffers: Array<FloatArray> = arrayOf()

  // ── Render-thread-owned state ────────────────────────────────────────────
  @Volatile private var samplesUntilNextBeat = 0
  private val voiceCount = 8
  private val voiceActive = BooleanArray(voiceCount)
  private val voiceSound = IntArray(voiceCount)
  private val voicePos = IntArray(voiceCount)

  private val mainHandler = Handler(Looper.getMainLooper())
  private var lastEmittedBeat = 0
  @Volatile private var polling = false

  override fun definition() = ModuleDefinition {
    Name("CadenceAudio")

    Events("onBeat")

    Property("isRunning") { running }

    Function("prepare") { mix: Boolean -> prepare(mix) }

    Function("start") { bpm: Double ->
      intervalSamples = intervalSamplesFor(bpm)
      if (!prepared) prepare(mixWithOthers)
      samplesUntilNextBeat = 0 // first beat fires immediately
      beatCounter = 0
      lastEmittedBeat = 0
      running = true
      ensurePlaying()
    }

    Function("stop") { running = false }

    Function("setBpm") { bpm: Double -> intervalSamples = intervalSamplesFor(bpm) }

    Function("setVolume") { v: Double -> volume = min(1.0, max(0.0, v)).toFloat() }

    Function("setSound") { id: String -> selectedSound = soundIndex(id) }

    Function("setMixWithOthers") { mix: Boolean -> mixWithOthers = mix }

    Function("setDucking") { duck: Boolean ->
      ducking = duck
      if (duck) requestDuckFocus() else abandonFocus()
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

    startBeatPoll()
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
          samplesUntilNextBeat -= 1
          if (samplesUntilNextBeat <= 0) {
            val si = selectedSound
            for (v in 0 until voiceCount) {
              if (!voiceActive[v]) {
                voiceActive[v] = true
                voiceSound[v] = si
                voicePos[v] = 0
                break
              }
            }
            samplesUntilNextBeat += max(1, interval) // re-rate at the boundary
            beatCounter += 1
          }
        }

        s *= vol
        val o = i * channels
        out[o] = s
        out[o + 1] = s
      }

      val written = t.write(out, 0, out.size, AudioTrack.WRITE_BLOCKING)
      if (written < 0) break
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
    )
    clickBuffers = Array(grains.size) { synth(grains[it][0], grains[it][1], grains[it][2], grains[it][3]) }
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

  // MARK: - Beat events (off the render thread)

  private fun startBeatPoll() {
    if (polling) return
    polling = true
    val poll = object : Runnable {
      override fun run() {
        if (!polling) return
        val c = beatCounter
        if (c != lastEmittedBeat) {
          lastEmittedBeat = c
          sendEvent("onBeat", mapOf("beatIndex" to c))
        }
        mainHandler.postDelayed(this, 30)
      }
    }
    mainHandler.post(poll)
  }

  // MARK: - Audio focus (only held while ducking)

  private fun audioManager(): AudioManager? =
    appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  private fun requestDuckFocus() {
    val am = audioManager() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (focusRequest != null) return
      val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        )
        // We synthesize beats ourselves and never pause; ignore focus changes.
        .setWillPauseWhenDucked(false)
        .build()
      focusRequest = req
      am.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(
        null,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
      )
    }
  }

  private fun abandonFocus() {
    val am = audioManager() ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
      focusRequest = null
    } else {
      @Suppress("DEPRECATION")
      am.abandonAudioFocus(null)
    }
  }

  // MARK: - Teardown

  private fun teardown() {
    running = false
    threadAlive = false
    polling = false
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
