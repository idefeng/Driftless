package expo.modules.cadencesteps

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 上报节流：步伐检测器每步一个事件（跑步约 3 步/秒），合并到最多每秒一次再过桥。
private const val EMIT_INTERVAL_MS = 1000L

/**
 * 实测步频数据源（v1.2）：只上报「本次 start() 以来的累计步数 + 最后一步的墙钟时间」，
 * 步频由 JS 侧滑动窗口统一推导（与 iOS CMPedometer 路径同构）。
 *
 * 优先使用 TYPE_STEP_DETECTOR（逐步事件、延迟低）；设备没有时退回 TYPE_STEP_COUNTER
 * （开机以来累计值，取与首个读数的差）。maxReportLatency = 0 要求不批量缓存，
 * 锁屏时进程由 cadence-live 前台服务 + 音频播放保持唤醒，事件照常送达。
 *
 * ACTIVITY_RECOGNITION 运行时授权由 JS（PermissionsAndroid）在用户开启功能时申请；
 * 未授权时 registerListener 不会收到事件，这里不额外报错。
 */
class CadenceStepsModule : Module() {
  private var sensorManager: SensorManager? = null
  private var listener: SensorEventListener? = null

  private var steps = 0
  private var counterBase = -1f
  private var lastStepWallMs = 0L
  private var lastEmitMs = 0L

  override fun definition() = ModuleDefinition {
    Name("CadenceSteps")

    Events("onSteps")

    Function("isSupported") {
      val sm = manager() ?: return@Function false
      sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR) != null ||
        sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    Function("start") { begin() }

    Function("stop") { end() }

    OnDestroy { end() }
  }

  private fun manager(): SensorManager? {
    sensorManager?.let { return it }
    val ctx = appContext.reactContext ?: return null
    return (ctx.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)?.also { sensorManager = it }
  }

  private fun begin() {
    end()
    val sm = manager() ?: return
    val detector = sm.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
    val sensor = detector ?: sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return
    steps = 0
    counterBase = -1f
    lastStepWallMs = 0L
    lastEmitMs = 0L

    val l = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
          steps += 1
        } else {
          val total = event.values.firstOrNull() ?: return
          if (counterBase < 0f) {
            counterBase = total
            return
          }
          steps = (total - counterBase).toInt().coerceAtLeast(0)
        }
        // event.timestamp 基于 elapsedRealtimeNanos，换算成墙钟时间与 JS 的 Date.now() 对齐。
        val ageMs = (SystemClock.elapsedRealtimeNanos() - event.timestamp) / 1_000_000L
        lastStepWallMs = System.currentTimeMillis() - ageMs.coerceAtLeast(0L)
        val now = SystemClock.elapsedRealtime()
        if (now - lastEmitMs >= EMIT_INTERVAL_MS) {
          lastEmitMs = now
          sendEvent("onSteps", mapOf("steps" to steps, "timestampMs" to lastStepWallMs.toDouble()))
        }
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }
    sm.registerListener(l, sensor, SensorManager.SENSOR_DELAY_FASTEST, 0)
    listener = l
  }

  private fun end() {
    val l = listener ?: return
    sensorManager?.unregisterListener(l)
    listener = null
  }
}
