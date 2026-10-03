import CoreMotion
import ExpoModulesCore

/**
 * 实测步频数据源（v1.2），与 Android 同构：只上报「本次 start() 以来的累计步数 +
 * 最后更新的墙钟时间」，步频由 JS 侧滑动窗口统一推导。
 *
 * CMPedometer 首次 startUpdates 时系统自动弹「运动与健身」授权（文案来自
 * Info.plist 的 NSMotionUsageDescription）；拒绝后 handler 收到错误，不再上报。
 * 更新节奏由系统决定（约每 1–3 秒一次批量步数）。
 */
public class CadenceStepsModule: Module {
  private let pedometer = CMPedometer()
  private var active = false

  public func definition() -> ModuleDefinition {
    Name("CadenceSteps")

    Events("onSteps")

    Function("isSupported") { () -> Bool in
      CMPedometer.isStepCountingAvailable()
    }

    Function("start") {
      self.begin()
    }

    Function("stop") {
      self.end()
    }

    OnDestroy {
      self.end()
    }
  }

  private func begin() {
    end()
    guard CMPedometer.isStepCountingAvailable() else { return }
    active = true
    pedometer.startUpdates(from: Date()) { [weak self] data, error in
      guard let self = self, self.active, error == nil, let data = data else { return }
      self.sendEvent("onSteps", [
        "steps": data.numberOfSteps.intValue,
        "timestampMs": data.endDate.timeIntervalSince1970 * 1000,
      ])
    }
  }

  private func end() {
    guard active else { return }
    active = false
    pedometer.stopUpdates()
  }
}
