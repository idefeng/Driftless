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
  @Field var phaseProgressText: String = ""
  @Field var remainingLabel: String = "Left"
  @Field var skipActionLabel: String = "Skip phase"
  @Field var channelName: String = "Run cadence"
  @Field var channelDescription: String = "Active cadence and controls"
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
      running: s.running,
      phaseProgressText: s.phaseProgressText,
      remainingLabel: s.remainingLabel
    )
  }

  private func startActivity(_ s: LiveSessionRecord) {
    guard #available(iOS 16.2, *) else { return }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    endAllActivities() // never run two at once — also reaps orphans left by a killed process

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
    guard #available(iOS 16.2, *) else { return }
    endAllActivities()
  }

  /// Ends every system-side activity of our type, not just the in-memory
  /// `currentActivity`: after the process is killed the reference is lost but
  /// the system-side activity keeps living, so iterate `activities` as the
  /// source of truth.
  @available(iOS 16.2, *)
  private func endAllActivities() {
    currentActivity = nil
    for activity in Activity<DriftlessActivityAttributes>.activities {
      Task { await activity.end(nil, dismissalPolicy: .immediate) }
    }
  }
}
