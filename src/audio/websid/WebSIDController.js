import { loadWebSIDRuntime } from './websidRuntime.js'

export class WebSIDController {
  constructor(callbacks = {}) {
    this.player = null
    this.readyPromise = this.initialize()
    this.callbacks = callbacks
    this.visualizerAnalyser = null
  }

  async initialize() {
    await loadWebSIDRuntime()

    await new Promise((resolve) => {
      const adapter = new window.SIDBackendAdapter()

      window.ScriptNodePlayer?.createInstance(
        adapter,
        '/',
        [],
        false,
        () => {
          this.player = window.ScriptNodePlayer?.getInstance()
          resolve()
          this.callbacks.onPlayerReady?.()
        },
        () => this.callbacks.onTrackReady?.(),
        () => this.callbacks.onTrackEnd?.(),
        () => {},
        undefined,
      )
    })
  }

  async ensureReady() {
    await this.readyPromise
    if (!this.player) {
      throw new Error('WebSID player not available')
    }
  }

  async loadTrack(track, autoPlay = false) {
    await this.ensureReady()
    if (!this.player) return

    const options = {
      basePath: '/',
      track: typeof track.subsong === 'number' ? track.subsong : -1,
    }

    return new Promise((resolve, reject) => {
      const onSuccess = () => {
        if (autoPlay) {
          this.play().catch(reject)
        }
        resolve()
      }

      const onError = () => {
        const error = new Error(`Failed to load SID track: ${track.name ?? track.path}`)
        this.callbacks.onError?.(error)
        reject(error)
      }

      try {
        if (track.data) {
          const blob = new Blob([track.data], { type: 'application/octet-stream' })
          const fileName = track.name ? `${track.name}.sid` : 'track.sid'
          const file = new File([blob], fileName, { type: 'application/octet-stream' })
          this.player.loadMusicFromTmpFile(file, options, onSuccess, onError, () => undefined)
        } else {
          const url = this.resolveUrl(track.path)
          this.player.loadMusicFromURL(url, options, onSuccess, onError)
        }
      } catch (err) {
        onError()
      }
    })
  }

  resolveUrl(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    return path
  }

  async play() {
    await this.ensureReady()
    if (!this.player) return
    this.player.play()
  }

  async stop() {
    await this.ensureReady()
    if (!this.player) return
    this.player.pause()
  }

  async dispose() {
    if (this.player) {
      try {
        this.player.pause()
      } catch (e) {
        // ignore pause failure
      }
    }
    if (this.visualizerAnalyser) {
      try {
        this.visualizerAnalyser.disconnect()
      } catch {
        // ignore disconnect failure
      }
      this.visualizerAnalyser = null
    }
  }

  getAnalyserNode() {
    if (this.visualizerAnalyser) {
      return this.visualizerAnalyser
    }
    if (!this.player) {
      return null
    }

    try {
      const gainNode = this.player._gainNode
      if (!gainNode) {
        return null
      }

      const audioCtx = gainNode.context ?? window._gPlayerAudioCtx
      if (!audioCtx) {
        return null
      }

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyser.maxDecibels = -10
      analyser.minDecibels = -90
      analyser.smoothingTimeConstant = 0.7
      gainNode.connect(analyser)
      this.visualizerAnalyser = analyser
      return analyser
    } catch {
      return null
    }
  }
}

