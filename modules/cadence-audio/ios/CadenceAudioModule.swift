import ExpoModulesCore
import AVFoundation

// Order matters: index === position in this array.
private let SOUND_IDS = ["beep", "woodfish", "click"]

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
}

public class CadenceAudioModule: Module {
  private let engine = AVAudioEngine()
  private var sourceNode: AVAudioSourceNode?
  private let rt = RTState()
  private var sampleRate: Double = 48000
  private var prepared = false
  private var mixWithOthers = true
  private var ducking = false

  private var beatTimer: DispatchSourceTimer?
  private var lastEmittedBeat = 0
  private var wasRunningBeforeInterruption = false

  public func definition() -> ModuleDefinition {
    Name("CadenceAudio")

    Events("onBeat")

    Property("isRunning") { [weak self] () -> Bool in
      return self?.rt.running ?? false
    }

    Function("prepare") { (mix: Bool) in
      self.prepare(mix: mix)
    }

    Function("start") { (bpm: Double) in
      self.rt.intervalSamples = self.intervalSamplesFor(bpm)
      if !self.prepared { self.prepare(mix: self.mixWithOthers) }
      self.rt.samplesUntilNextBeat = 0 // fire the first beat immediately
      self.rt.beatCounter = 0
      self.lastEmittedBeat = 0
      self.rt.running = true
      self.ensureEngineRunning()
    }

    Function("stop") {
      self.rt.running = false
    }

    Function("setBpm") { (bpm: Double) in
      self.rt.intervalSamples = self.intervalSamplesFor(bpm)
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
    try session.setActive(true)
    sampleRate = session.sampleRate
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
          rt.samplesUntilNextBeat -= 1
          if rt.samplesUntilNextBeat <= 0 {
            let si = rt.selectedSound
            for v in 0..<RTState.voiceCount where !rt.voiceActive[v] {
              rt.voiceActive[v] = true
              rt.voiceSound[v] = si
              rt.voicePos[v] = 0
              break
            }
            rt.samplesUntilNextBeat += max(1, interval) // re-rate at the boundary
            rt.beatCounter &+= 1
          }
        }

        s *= vol
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

    registerInterruptionObserver()
    startBeatTimer()
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
    ]
    for g in grains {
      let arr = synth(freq: g.0, decay: g.1, dur: g.2, noise: g.3, sr: sampleRate)
      let ptr = UnsafeMutablePointer<Float>.allocate(capacity: arr.count)
      ptr.initialize(from: arr, count: arr.count)
      rt.bufPtrs.append(ptr)
      rt.bufLens.append(arr.count)
    }
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

  // MARK: - Beat events (off the realtime thread)

  private func startBeatTimer() {
    let timer = DispatchSource.makeTimerSource(queue: DispatchQueue.global(qos: .userInitiated))
    timer.schedule(deadline: .now(), repeating: .milliseconds(30))
    timer.setEventHandler { [weak self] in
      guard let self = self else { return }
      let c = self.rt.beatCounter
      if c != self.lastEmittedBeat {
        self.lastEmittedBeat = c
        self.sendEvent("onBeat", ["beatIndex": c])
      }
    }
    timer.resume()
    beatTimer = timer
  }

  // MARK: - Interruptions (PRD §4.1 — real interruptions pause)

  private func registerInterruptionObserver() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleInterruption(_:)),
      name: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance()
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

  // MARK: - Teardown

  private func teardown() {
    beatTimer?.cancel()
    beatTimer = nil
    NotificationCenter.default.removeObserver(self)
    if engine.isRunning { engine.stop() }
    for ptr in rt.bufPtrs { ptr.deallocate() }
    rt.bufPtrs.removeAll()
    rt.bufLens.removeAll()
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}
