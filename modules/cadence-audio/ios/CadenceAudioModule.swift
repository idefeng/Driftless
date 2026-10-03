import ExpoModulesCore
import AVFoundation

// Order matters: index === position in this array.
private let SOUND_IDS = ["beep", "woodfish", "click", "bubble", "droplet"]

// Click buffer layout: [0, N) normal timbres, [N, 2N) accent variants (same
// grain, pitched up a fifth), then one phase-change cue chirp.
private let SOUND_COUNT = SOUND_IDS.count
private let CUE_INDEX = SOUND_COUNT * 2

private func soundIndex(_ id: String) -> Int {
  return SOUND_IDS.firstIndex(of: id) ?? 1
}

private func clampBpm(_ bpm: Double) -> Double {
  return min(250.0, max(100.0, bpm.rounded()))
}

/// Realtime state shared between the control thread (JS calls) and the audio
/// render thread. All hot fields are word-size scalars; on arm64 their reads
/// and writes are atomic enough for a metronome (a torn BPM is impossible for
/// an aligned Int). Beat *placement* is counted in samples, so there is no
/// accumulating-timer drift regardless of when control writes land.
private final class RTState {
  var intervalSamples: Int = 16000
  var volume: Float = 0.72
  var running: Bool = false
  var selectedSound: Int = 1 // woodfish
  // 0 = no accent; N = every N-th beat (counted from start) is accented.
  var accentEvery: Int = 0
  // Set by cue(); consumed by the render thread at the next beat boundary.
  var cuePending: Bool = false

  // Linear BPM ramp (PRD §3.4). rampTo() writes the target into intervalSamples
  // up front, so a finished/cancelled ramp already leaves the right interval.
  var rampActive: Bool = false
  var rampFromBpm: Double = 180
  var rampToBpm: Double = 180
  var rampTotalSamples: Int = 1
  var rampElapsed: Int = 0
  var sampleRate: Double = 48000

  // Owned by the render thread only.
  var samplesUntilNextBeat: Int = 0
  var beatCounter: Int = 0

  // Synthesized click buffers (raw pointers → no ARC in the render loop).
  var bufPtrs: [UnsafeMutablePointer<Float>] = []
  var bufLens: [Int] = []

  // Fixed voice pool (clicks never overlap at ≤250 BPM, but be safe).
  static let voiceCount = 8
  var voiceActive = [Bool](repeating: false, count: voiceCount)
  var voiceSound = [Int](repeating: 0, count: voiceCount)
  var voicePos = [Int](repeating: 0, count: voiceCount)

  func startVoice(_ bufferIndex: Int) {
    for v in 0..<RTState.voiceCount where !voiceActive[v] {
      voiceActive[v] = true
      voiceSound[v] = bufferIndex
      voicePos[v] = 0
      return
    }
  }
}

public class CadenceAudioModule: Module {
  private let engine = AVAudioEngine()
  private var sourceNode: AVAudioSourceNode?
  private let rt = RTState()
  private var sampleRate: Double = 48000
  private var prepared = false
  private var mixWithOthers = true
  private var ducking = false
  private var currentBpm: Double = 180

  private var wasRunningBeforeInterruption = false

  public func definition() -> ModuleDefinition {
    Name("CadenceAudio")

    Events("onBeat", "onInterrupted")

    Property("isRunning") { [weak self] () -> Bool in
      return self?.rt.running ?? false
    }

    Function("prepare") { (mix: Bool) in
      self.prepare(mix: mix)
    }

    Function("start") { (bpm: Double) in
      // prepare first: it resolves the session sample rate the interval depends on.
      if !self.prepared { self.prepare(mix: self.mixWithOthers) }
      self.rt.rampActive = false
      self.rt.cuePending = false
      self.currentBpm = clampBpm(bpm)
      self.rt.intervalSamples = self.intervalSamplesFor(bpm)
      self.rt.samplesUntilNextBeat = 0 // fire the first beat immediately
      self.rt.beatCounter = 0
      self.rt.running = true
      self.ensureEngineRunning()
    }

    Function("stop") {
      self.stopPlayback()
    }

    Function("setBpm") { (bpm: Double) in
      self.rt.rampActive = false // an explicit rate always wins over an in-flight ramp
      self.currentBpm = clampBpm(bpm)
      self.rt.intervalSamples = self.intervalSamplesFor(bpm)
    }

    Function("rampTo") { (bpm: Double, durationMs: Double) in
      let target = clampBpm(bpm)
      let total = Int(durationMs / 1000.0 * self.sampleRate)
      self.rt.rampActive = false
      if self.rt.running && total > 0 && target != self.currentBpm {
        self.rt.rampFromBpm = self.currentBpm
        self.rt.rampToBpm = target
        self.rt.rampTotalSamples = total
        self.rt.rampElapsed = 0
        self.rt.rampActive = true
      }
      self.currentBpm = target
      self.rt.intervalSamples = self.intervalSamplesFor(target)
    }

    Function("setAccent") { (every: Int) in
      self.rt.accentEvery = max(0, every)
    }

    Function("cue") {
      if self.rt.running { self.rt.cuePending = true }
    }

    Function("setVolume") { (v: Double) in
      self.rt.volume = Float(min(1.0, max(0.0, v)))
    }

    Function("setSound") { (id: String) in
      self.rt.selectedSound = soundIndex(id)
    }

    Function("setMixWithOthers") { (mix: Bool) in
      self.mixWithOthers = mix
      try? self.configureSession(mix: mix)
    }

    Function("setDucking") { (duck: Bool) in
      self.ducking = duck
      try? self.configureSession(mix: self.mixWithOthers)
    }

    OnDestroy {
      self.teardown()
    }
  }

  // MARK: - Setup

  private func intervalSamplesFor(_ bpm: Double) -> Int {
    let b = clampBpm(bpm)
    return max(1, Int((sampleRate * 60.0 / b).rounded()))
  }

  private func configureSession(mix: Bool) throws {
    let session = AVAudioSession.sharedInstance()
    var options: AVAudioSession.CategoryOptions = []
    if mix {
      // `.duckOthers` implies mixing, and lowers (rather than stops) other audio.
      options = ducking ? [.duckOthers] : [.mixWithOthers]
    }
    try session.setCategory(.playback, mode: .default, options: options)
    // Deliberately no setActive(true) here: prepare() runs at app launch and
    // must not grab the session (exclusive mode would cut off other apps'
    // music before the user presses play). Activation happens in
    // ensureEngineRunning(), deactivation in stopPlayback().
    sampleRate = session.sampleRate
    rt.sampleRate = sampleRate
  }

  private func prepare(mix: Bool) {
    if prepared {
      try? configureSession(mix: mix)
      return
    }
    mixWithOthers = mix
    do {
      try configureSession(mix: mix)
    } catch {
      NSLog("CadenceAudio: session config failed: \(error)")
    }

    synthesizeClicks()

    let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 2)!
    let rt = self.rt // local; captured unowned below to avoid ARC in the render loop
    let node = AVAudioSourceNode(format: format) { [unowned rt] _, _, frameCount, ablPointer in
      let abl = UnsafeMutableAudioBufferListPointer(ablPointer)
      let frames = Int(frameCount)
      let channels = abl.count
      let vol = rt.volume
      let interval = rt.intervalSamples
      let running = rt.running

      for frame in 0..<frames {
        var s: Float = 0

        // Sum and advance active voices.
        for v in 0..<RTState.voiceCount where rt.voiceActive[v] {
          let si = rt.voiceSound[v]
          let pos = rt.voicePos[v]
          s += rt.bufPtrs[si][pos]
          let next = pos + 1
          if next >= rt.bufLens[si] {
            rt.voiceActive[v] = false
          } else {
            rt.voicePos[v] = next
          }
        }

        // Beat boundary — sample-exact.
        if running {
          if rt.rampActive { rt.rampElapsed &+= 1 }
          rt.samplesUntilNextBeat -= 1
          if rt.samplesUntilNextBeat <= 0 {
            let acc = rt.accentEvery
            let accented = acc > 0 && rt.beatCounter % acc == 0
            rt.startVoice(accented ? rt.selectedSound + SOUND_COUNT : rt.selectedSound)
            if rt.cuePending {
              rt.cuePending = false
              rt.startVoice(CUE_INDEX)
            }
            var next = interval
            if rt.rampActive {
              let p = min(1.0, Double(rt.rampElapsed) / Double(max(1, rt.rampTotalSamples)))
              let b = rt.rampFromBpm + (rt.rampToBpm - rt.rampFromBpm) * p
              next = Int((rt.sampleRate * 60.0 / b).rounded())
              if p >= 1.0 { rt.rampActive = false }
            }
            rt.samplesUntilNextBeat += max(1, next) // re-rate at the boundary
            rt.beatCounter &+= 1
          }
        }

        // Cue + click can overlap; hard-limit so the sum never clips harshly.
        s = min(1, max(-1, s * vol))
        for ch in 0..<channels {
          if let mdata = abl[ch].mData {
            mdata.assumingMemoryBound(to: Float.self)[frame] = s
          }
        }
      }
      return noErr
    }

    sourceNode = node
    engine.attach(node)
    engine.connect(node, to: engine.mainMixerNode, format: format)
    engine.prepare()

    registerSessionObservers()
    prepared = true
  }

  private func ensureEngineRunning() {
    guard prepared, !engine.isRunning else { return }
    do {
      try AVAudioSession.sharedInstance().setActive(true)
      try engine.start()
    } catch {
      NSLog("CadenceAudio: engine start failed: \(error)")
    }
  }

  // MARK: - Click synthesis

  private func synthesizeClicks() {
    guard rt.bufPtrs.isEmpty else { return }
    // freq, decay(s), dur(s), noise — short, normalized, zero-silence edges.
    let grains: [(Double, Double, Double, Double)] = [
      (1900, 0.012, 0.035, 0.0),  // beep
      (720, 0.018, 0.055, 0.06),  // woodfish
      (3000, 0.004, 0.014, 0.15), // click
      (480, 0.025, 0.075, 0.22),  // bubble
      (2600, 0.02, 0.05, 0.03),   // droplet
    ]
    var buffers: [[Float]] = grains.map { synth(freq: $0.0, decay: $0.1, dur: $0.2, noise: $0.3, sr: sampleRate) }
    // Accent: same grain a fifth higher — clearly distinct, equally loud.
    buffers += grains.map { synth(freq: $0.0 * 1.5, decay: $0.1, dur: $0.2, noise: $0.3, sr: sampleRate) }
    buffers.append(synthCue(sr: sampleRate))
    for arr in buffers {
      let ptr = UnsafeMutablePointer<Float>.allocate(capacity: arr.count)
      ptr.initialize(from: arr, count: arr.count)
      rt.bufPtrs.append(ptr)
      rt.bufLens.append(arr.count)
    }
  }

  /// Rising two-note chirp (B5 → E6) marking an upcoming phase change.
  private func synthCue(sr: Double) -> [Float] {
    let len = Int(0.17 * sr)
    let split = Int(0.075 * sr)
    let fadeOut = max(1, Int(0.002 * sr))
    var data = [Float](repeating: 0, count: len)
    var peak: Float = 0
    for i in 0..<len {
      let first = i < split
      let local = first ? i : i - split
      let t = Double(local) / sr
      let freq = first ? 988.0 : 1319.0
      let decay = first ? 0.03 : 0.045
      var s = Float(sin(2.0 * Double.pi * freq * t) * exp(-t / decay))
      if local < 32 { s *= Float(local) / 32.0 } // zero-edge attack on both notes
      if first && i > split - fadeOut { s *= Float(split - i) / Float(fadeOut) }
      if i > len - fadeOut { s *= Float(len - i) / Float(fadeOut) }
      data[i] = s
      peak = max(peak, abs(s))
    }
    if peak > 0 {
      let norm = 0.6 / peak
      for i in 0..<len { data[i] *= norm }
    }
    return data
  }

  private func synth(freq: Double, decay: Double, dur: Double, noise: Double, sr: Double) -> [Float] {
    let len = max(1, Int(dur * sr))
    let fadeOut = max(1, Int(0.002 * sr))
    var data = [Float](repeating: 0, count: len)
    var peak: Float = 0
    for i in 0..<len {
      let t = Double(i) / sr
      let env = exp(-t / decay)
      let tone = sin(2.0 * Double.pi * freq * t)
      let n = noise > 0 ? Double.random(in: -1...1) * noise : 0
      var s = Float((tone + n) * env)
      if i < 32 { s *= Float(i) / 32.0 } // sub-ms attack from zero
      if i > len - fadeOut { s *= Float(len - i) / Float(fadeOut) }
      data[i] = s
      peak = max(peak, abs(s))
    }
    if peak > 0 {
      let norm = 0.9 / peak
      for i in 0..<len { data[i] *= norm }
    }
    return data
  }

  // MARK: - Playback control

  /// Pause the engine and release the audio session so other apps' audio can
  /// resume. Used by stop() and by route changes we pause for ourselves.
  private func stopPlayback() {
    rt.running = false
    engine.pause()
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  // MARK: - Interruptions & route changes (PRD §4.1 — real interruptions pause)

  private func registerSessionObservers() {
    let session = AVAudioSession.sharedInstance()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: session
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleRouteChange(_:)),
      name: AVAudioSession.routeChangeNotification,
      object: session
    )
  }

  @objc private func handleInterruption(_ note: Notification) {
    guard let info = note.userInfo,
          let raw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
    switch type {
    case .began:
      wasRunningBeforeInterruption = rt.running
      rt.running = false
      engine.pause()
      // JS didn't initiate this stop — tell it so the play button / lock-screen
      // UI stays in sync (same contract as Android's onInterrupted). The system
      // owns the session during the interruption, so no setActive(false) here.
      if wasRunningBeforeInterruption {
        sendEvent("onInterrupted", ["reason": "interrupted"])
      }
    case .ended:
      let shouldResume: Bool
      if let optRaw = info[AVAudioSessionInterruptionOptionKey] as? UInt {
        shouldResume = AVAudioSession.InterruptionOptions(rawValue: optRaw).contains(.shouldResume)
      } else {
        shouldResume = false
      }
      if shouldResume && wasRunningBeforeInterruption {
        ensureEngineRunning()
        rt.running = true
      }
    @unknown default:
      break
    }
  }

  /// Headphone unplug / Bluetooth disconnect (PRD §4.1 — default pause, avoid
  /// suddenly blasting through the speaker). Mirrors Android's
  /// ACTION_AUDIO_BECOMING_NOISY handling, including the event payload.
  @objc private func handleRouteChange(_ note: Notification) {
    guard let info = note.userInfo,
          let raw = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
          let reason = AVAudioSession.RouteChangeReason(rawValue: raw),
          reason == .oldDeviceUnavailable,
          rt.running else { return }
    wasRunningBeforeInterruption = false
    stopPlayback()
    sendEvent("onInterrupted", ["reason": "routeChanged"])
  }

  // MARK: - Teardown

  private func teardown() {
    NotificationCenter.default.removeObserver(self)
    if engine.isRunning { engine.stop() }
    for ptr in rt.bufPtrs { ptr.deallocate() }
    rt.bufPtrs.removeAll()
    rt.bufLens.removeAll()
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
