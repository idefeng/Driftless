import SwiftUI
import WidgetKit
import ActivityKit
import AppIntents

// MARK: - Brand colors (single orange ramp + warm neutrals)

private extension Color {
  static let brandBase = Color(red: 1.0, green: 0.549, blue: 0.169) // #FF8C2B
  static let brandDeep = Color(red: 0.957, green: 0.447, blue: 0.086) // #F47216
  static let brandGlow = Color(red: 1.0, green: 0.604, blue: 0.271) // #FF9A45
  static let brandLight = Color(red: 1.0, green: 0.690, blue: 0.400) // #FFB066
  static let warmInk = Color(red: 1.0, green: 0.965, blue: 0.925) // #FFF6EC
  static let warmMuted = Color(red: 0.612, green: 0.576, blue: 0.518) // #9C9384
  static let cardBg = Color(red: 0.149, green: 0.125, blue: 0.086) // #26201B
}

// MARK: - Shared bits

private struct BeatBars: View {
  var color: Color = .brandGlow
  var accent: Color = .brandLight
  var heights: [CGFloat] = [12, 22, 30, 22, 12]
  var width: CGFloat = 5
  var body: some View {
    HStack(alignment: .center, spacing: 5) {
      ForEach(Array(heights.enumerated()), id: \.offset) { idx, h in
        RoundedRectangle(cornerRadius: width / 2)
          .fill(idx == heights.count / 2 ? accent : color)
          .frame(width: width, height: h)
      }
    }
  }
}

private struct LogoChip: View {
  var body: some View {
    RoundedRectangle(cornerRadius: 7)
      .fill(LinearGradient(colors: [.brandGlow, .brandDeep], startPoint: .topLeading, endPoint: .bottomTrailing))
      .frame(width: 26, height: 26)
      .overlay(
        HStack(alignment: .bottom, spacing: 2) {
          RoundedRectangle(cornerRadius: 1).fill(.white).frame(width: 2.5, height: 7)
          RoundedRectangle(cornerRadius: 1).fill(.white).frame(width: 2.5, height: 11)
          RoundedRectangle(cornerRadius: 1).fill(.white).frame(width: 2.5, height: 5)
        }
        .padding(.bottom, 6)
      )
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
      .foregroundStyle(.white)
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

  var body: some View {
    VStack(spacing: 14) {
      HStack {
        HStack(spacing: 9) {
          LogoChip()
          Text("Driftless · \(state.phaseName)")
            .font(.system(size: 14, weight: .bold))
            .foregroundStyle(Color.warmInk)
        }
        Spacer()
        HStack(spacing: 4) {
          Text("剩余").font(.system(size: 12)).foregroundStyle(Color.warmMuted)
          countdownText(state.endTime)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(Color.warmMuted)
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
        BeatBars()
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
            Text("\(context.state.phaseIndex + 1)/\(context.state.phaseCount) 段").font(.system(size: 11)).foregroundStyle(Color.warmMuted)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          HStack(alignment: .firstTextBaseline, spacing: 4) {
            Text("\(context.state.bpm)").font(.system(size: 24, weight: .heavy, design: .rounded)).monospacedDigit().foregroundStyle(Color.warmInk)
            Text("SPM").font(.system(size: 11)).foregroundStyle(Color.warmMuted)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          BeatBars(heights: [8, 16, 22, 16, 8], width: 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          CadenceControls()
        }
      } compactLeading: {
        BeatBars(heights: [7, 12, 16], width: 3)
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
