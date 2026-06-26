import ExpoModulesCore
import ActivityKit

/// JS payload for a live session snapshot.
struct LiveSessionRecord: Record {
  @Field var bpm: Int = 180
  @Field var phaseName: String = ""
  @Field var phaseIndex: Int = 0
  @Field var phaseCount: Int = 1
  @Field var endTimeMs: Double = 0
  @Field var running: Bool = false
}

public class CadenceLiveModule: Module {
  // Stored as `Any?` because `Activity<…>` is availability-gated.
  private var currentActivity: Any?
  private var actionObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("CadenceLive")

    Events("onAction")

    OnCreate {
      self.actionObserver = NotificationCenter.default.addObserver(
        forName: .driftlessCadenceAction,
        object: nil,
        queue: .main
      ) { [weak self] note in
        guard let action = note.userInfo?["action"] as? String else { return }
        self?.sendEvent("onAction", ["action": action])
      }
    }

    OnDestroy {
      if let obs = self.actionObserver {
        NotificationCenter.default.removeObserver(obs)
      }
      self.endActivity()
    }

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    Function("start") { (state: LiveSessionRecord) in
      self.startActivity(state)
    }

    Function("update") { (state: LiveSessionRecord) in
      self.updateActivity(state)
    }

    Function("stop") {
      self.endActivity()
    }
  }

  // MARK: - ActivityKit

  @available(iOS 16.2, *)
  private func makeContentState(_ s: LiveSessionRecord) -> DriftlessActivityAttributes.ContentState {
    return DriftlessActivityAttributes.ContentState(
      bpm: s.bpm,
      phaseName: s.phaseName,
      phaseIndex: s.phaseIndex,
      phaseCount: s.phaseCount,
      endTime: Date(timeIntervalSince1970: s.endTimeMs / 1000.0),
      running: s.running
    )
  }

  private func startActivity(_ s: LiveSessionRecord) {
    guard #available(iOS 16.2, *) else { return }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    endActivity() // never run two at once

    let attributes = DriftlessActivityAttributes(appName: "Driftless")
    let content = ActivityContent(state: makeContentState(s), staleDate: nil)
    do {
      let activity = try Activity<DriftlessActivityAttributes>.request(
        attributes: attributes,
        content: content,
        pushType: nil
      )
      currentActivity = activity
    } catch {
      NSLog("CadenceLive: start failed: \(error)")
    }
  }

  private func updateActivity(_ s: LiveSessionRecord) {
    guard #available(iOS 16.2, *),
          let activity = currentActivity as? Activity<DriftlessActivityAttributes> else { return }
    let content = ActivityContent(state: makeContentState(s), staleDate: nil)
    Task { await activity.update(content) }
  }

  private func endActivity() {
    guard #available(iOS 16.2, *),
          let activity = currentActivity as? Activity<DriftlessActivityAttributes> else { return }
    currentActivity = nil
    Task { await activity.end(nil, dismissalPolicy: .immediate) }
  }
}
