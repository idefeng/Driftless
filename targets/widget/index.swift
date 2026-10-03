import SwiftUI
import WidgetKit
import ActivityKit
import AppIntents

// MARK: - Brand colors (v2: volt green + near-black neutrals)

private extension Color {
  static let brandBase = Color(red: 0.776, green: 1.0, blue: 0.239) // #C6FF3D
  static let brandDeep = Color(red: 0.561, green: 0.831, blue: 0.0) // #8FD400
  static let brandGlow = Color(red: 0.831, green: 1.0, blue: 0.416) // #D4FF6A
  static let brandLight = Color(red: 0.890, green: 1.0, blue: 0.620) // #E3FF9E
  static let ink = Color(red: 0.043, green: 0.051, blue: 0.039) // #0B0D0A — content on brand fills
  static let warmInk = Color.white // primary text on dark
  static let warmMuted = Color(red: 0.604, green: 0.639, blue: 0.569) // #9AA391
  static let cardBg = Color(red: 0.082, green: 0.098, blue: 0.071) // #151912
}

// MARK: - Footprint (same geometry as src/components/Footprint.tsx, 40×64 box, right foot)

private struct FootShape: Shape {
  var mirrored = false
  func path(in rect: CGRect) -> Path {
    let sx = rect.width / 40, sy = rect.height / 64
    func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
      CGPoint(x: rect.minX + (mirrored ? 40 - x : x) * sx, y: rect.minY + y * sy)
    }
    var p = Path()
    p.move(to: pt(18, 15))
    p.addCurve(to: pt(33.5, 27), control1: pt(27, 14), control2: pt(33, 19))
    p.addCurve(to: pt(29.5, 46), control1: pt(34, 34), control2: pt(31, 40))
    p.addCurve(to: pt(24.5, 62), control1: pt(28, 52), control2: pt(29, 58))
    p.addCurve(to: pt(12, 57.5), control1: pt(20, 65.5), control2: pt(13, 64))
    p.addCurve(to: pt(14, 41), control1: pt(11.2, 52), control2: pt(14.5, 47))
    p.addCurve(to: pt(8.5, 26), control1: pt(13.6, 36), control2: pt(8.5, 33))
    p.addCurve(to: pt(18, 15), control1: pt(8.5, 19), control2: pt(12, 15.3))
    p.closeSubpath()
    for (cx, cy, r) in [(12.6, 8.4, 4.4), (20.6, 5.8, 3.1), (26.7, 7.6, 2.7), (31.5, 11.4, 2.3)] as [(CGFloat, CGFloat, CGFloat)] {
      let c = pt(cx, cy)
      p.addEllipse(in: CGRect(x: c.x - r * sx, y: c.y - r * sy, width: 2 * r * sx, height: 2 * r * sy))
    }
    return p
  }
}

/// Logo mark: dim trailing left foot low-left, bright leading right foot high-right.
private struct FootprintPair: View {
  var size: CGFloat
  var body: some View {
    let u = size / 100
    ZStack(alignment: .topLeading) {
      FootShape(mirrored: true)
        .fill(Color.brandBase.opacity(0.45))
        .frame(width: 40 * u, height: 64 * u)
        .rotationEffect(.degrees(-9))
        .offset(x: 13 * u, y: 28 * u)
      FootShape()
        .fill(Color.brandBase)
        .frame(width: 40 * u, height: 64 * u)
        .rotationEffect(.degrees(9))
        .offset(x: 47 * u, y: 6 * u)
    }
    .frame(width: size, height: size, alignment: .topLeading)
  }
}

// MARK: - Shared bits

private struct LogoChip: View {
  var body: some View {
    RoundedRectangle(cornerRadius: 7)
      .fill(Color.ink)
      .frame(width: 26, height: 26)
      .overlay(FootprintPair(size: 22))
  }
}

private func countdownText(_ endTime: Date) -> some View {
  let end = max(endTime, Date())
  return Text(timerInterval: Date()...end, countsDown: true)
    .monospacedDigit()
}

// MARK: - ±1 / skip control row (interactive on iOS 17+)

private struct CadenceControls: View {
  var body: some View {
    HStack(spacing: 10) {
      if #available(iOS 17.0, *) {
        Button(intent: AdjustCadenceIntent("dec")) { ControlLabel(text: "−1", filled: false) }
          .buttonStyle(.plain)
        Button(intent: AdjustCadenceIntent("skip")) { ControlLabel(text: "▷", filled: true) }
          .buttonStyle(.plain)
        Button(intent: AdjustCadenceIntent("inc")) { ControlLabel(text: "+1", filled: false) }
          .buttonStyle(.plain)
      } else {
        ControlLabel(text: "−1", filled: false)
        ControlLabel(text: "▷", filled: true)
        ControlLabel(text: "+1", filled: false)
      }
    }
  }
}

private struct ControlLabel: View {
  var text: String
  var filled: Bool
  var body: some View {
    Text(text)
      .font(.system(size: 17, weight: .semibold, design: .rounded))
      .foregroundStyle(filled ? Color.ink : .white)
      .frame(maxWidth: filled ? 56 : .infinity)
      .frame(height: 44)
      .background(
        Group {
          if filled {
            LinearGradient(colors: [.brandGlow, .brandDeep], startPoint: .topLeading, endPoint: .bottomTrailing)
          } else {
            Color.white.opacity(0.10)
          }
        }
      )
      .clipShape(RoundedRectangle(cornerRadius: 13))
  }
}

// MARK: - Lock screen presentation

private struct LockScreenView: View {
  let state: DriftlessActivityAttributes.ContentState

  /// Outside a structured workout JS pushes phaseName "" / endTimeMs 0
  /// (epoch 0); mirrors Android's `endTimeMs > 0` check so we never render a
  /// dangling "Driftless ·" separator or a fake 0:00 countdown.
  private var hasCountdown: Bool { state.endTime.timeIntervalSince1970 > 1 }

  var body: some View {
    VStack(spacing: 14) {
      HStack {
        HStack(spacing: 9) {
          LogoChip()
          Text(state.phaseName.isEmpty ? "Driftless" : "Driftless · \(state.phaseName)")
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(Color.warmInk)
        }
        Spacer()
        if hasCountdown {
          HStack(spacing: 4) {
            Text(state.remainingLabel).font(.system(size: 12)).foregroundStyle(Color.warmMuted)
            countdownText(state.endTime)
              .font(.system(size: 13, weight: .semibold))
              .foregroundStyle(Color.warmMuted)
          }
        }
      }

      HStack(alignment: .bottom) {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
          Text("\(state.bpm)")
            .font(.system(size: 52, weight: .heavy, design: .rounded))
            .foregroundStyle(Color.warmInk)
            .monospacedDigit()
          Text("SPM").font(.system(size: 14, weight: .semibold)).foregroundStyle(Color.warmMuted)
        }
        Spacer()
        FootprintPair(size: 44)
      }

      CadenceControls()
    }
    .padding(16)
    .activityBackgroundTint(Color.cardBg)
    .activitySystemActionForegroundColor(Color.brandLight)
  }
}

// MARK: - Live Activity (lock screen + Dynamic Island)

struct DriftlessLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: DriftlessActivityAttributes.self) { context in
      LockScreenView(state: context.state)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 2) {
            Text(context.state.phaseName).font(.system(size: 13, weight: .bold)).foregroundStyle(Color.brandLight)
            Text(context.state.phaseProgressText).font(.system(size: 11)).foregroundStyle(Color.warmMuted)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text("\(context.state.bpm)").font(.system(size: 24, weight: .heavy, design: .rounded)).monospacedDigit().foregroundStyle(Color.warmInk)
            Text("SPM").font(.system(size: 11)).foregroundStyle(Color.warmMuted)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          FootprintPair(size: 30)
        }
        DynamicIslandExpandedRegion(.bottom) {
          CadenceControls()
        }
      } compactLeading: {
        FootprintPair(size: 20)
      } compactTrailing: {
        Text("\(context.state.bpm)")
          .font(.system(size: 13, weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(Color.brandLight)
      } minimal: {
        Text("\(context.state.bpm)")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .monospacedDigit()
          .foregroundStyle(Color.brandLight)
      }
      .keylineTint(Color.brandBase)
    }
  }
}

// MARK: - Widget bundle entry

@main
struct DriftlessWidgetBundle: WidgetBundle {
  var body: some Widget {
    DriftlessLiveActivity()
  }
}
