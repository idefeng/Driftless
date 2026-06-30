import Foundation
import ActivityKit
import AppIntents

//  ⚠️ KEEP IN SYNC with `targets/widget/DriftlessLiveShared.swift`.
//
//  These types must exist in BOTH the app (this module) and the widget
//  extension. ActivityKit matches an Activity to its widget by the attributes
//  type name, and a `LiveActivityIntent` button in the widget is performed by
//  the app's copy of the intent — so the declarations are intentionally
//  duplicated rather than shared via a framework (the established Expo pattern).

/// Attributes + live content for the Driftless run-cadence Live Activity.
public struct DriftlessActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var bpm: Int
    public var phaseName: String
    public var phaseIndex: Int
    public var phaseCount: Int
    public var endTime: Date
    public var running: Bool
    public var phaseProgressText: String
    public var remainingLabel: String

    public init(bpm: Int, phaseName: String, phaseIndex: Int, phaseCount: Int, endTime: Date, running: Bool, phaseProgressText: String, remainingLabel: String) {
      self.bpm = bpm
      self.phaseName = phaseName
      self.phaseIndex = phaseIndex
      self.phaseCount = phaseCount
      self.endTime = endTime
      self.running = running
      self.phaseProgressText = phaseProgressText
      self.remainingLabel = remainingLabel
    }
  }

  public var appName: String

  public init(appName: String = "Driftless") {
    self.appName = appName
  }
}

/// Posted (in the app process) when a lock-screen / Dynamic Island button fires.
public extension Notification.Name {
  static let driftlessCadenceAction = Notification.Name("DriftlessCadenceAction")
}

/// Interactive Live Activity control: ±1 / skip. `perform()` runs in the app
/// process, so it simply forwards the action to the live module via NotificationCenter.
@available(iOS 17.0, *)
public struct AdjustCadenceIntent: LiveActivityIntent {
  public static var title: LocalizedStringResource = "Adjust Cadence"

  @Parameter(title: "Action")
  public var action: String

  public init() {}

  public init(_ action: String) {
    self.action = action
  }

  public func perform() async throws -> some IntentResult {
    NotificationCenter.default.post(
      name: .driftlessCadenceAction,
      object: nil,
      userInfo: ["action": action]
    )
    return .result()
  }
}
