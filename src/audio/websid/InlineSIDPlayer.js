import { WebSIDController } from './WebSIDController.js'

export class InlineSIDPlayer {
  constructor(callbacks = {}) {
    this.controller = new WebSIDController({
      onTrackEnd: () => {
        void this.advanceToNextInternal(true)
      },
      onError: (error) => callbacks.onError?.(error),
    })
    this.playlist = []
    this.currentIndex = -1
    this.pendingIndex = 0
    this.isPlaying = false
    this.callbacks = callbacks
    this.dataCache = new Map()
    this.analyser = this.controller.getAnalyserNode()
    this.magnitudeArray = new Uint8Array(this.analyser?.frequencyBinCount ?? 0)
  }

  async setTracks(tracks, startIndex = 0) {
    this.playlist = tracks
    if (!tracks.length) {
      this.currentIndex = -1
      this.pendingIndex = 0
      this.isPlaying = false
      return
    }

    this.pendingIndex = Math.max(0, Math.min(startIndex, tracks.length - 1))
    this.currentIndex = -1
    console.log('[InlineSIDPlayer] setTracks()', {
      length: tracks.length,
      pendingIndex: this.pendingIndex,
    })
  }

  async play() {
    if (!this.playlist.length) {
      console.warn('[InlineSIDPlayer] play() called with empty playlist')
      return
    }

    if (this.currentIndex === -1) {
      await this.loadTrackAtIndex(this.pendingIndex, true)
      return
    }

    await this.controller.play()
    this.isPlaying = true
  }

  async stop() {
    this.isPlaying = false
    await this.controller.stop()
  }

  async next() {
    await this.advanceToNextInternal(false)
  }

  async previous() {
    if (!this.playlist.length) return

    const baseIndex = this.currentIndex === -1 ? this.pendingIndex : this.currentIndex
    const previousIndex = baseIndex - 1
    if (previousIndex < 0) {
      this.pendingIndex = 0
      if (!this.isPlaying) {
        this.currentIndex = -1
      }
      return
    }

    if (this.isPlaying) {
      await this.loadTrackAtIndex(previousIndex, true)
    } else {
      this.pendingIndex = previousIndex
      this.currentIndex = -1
    }
  }

  async playTrackAtIndex(index, autoPlay) {
    if (!this.playlist.length) {
      console.warn('[InlineSIDPlayer] playTrackAtIndex() with empty playlist')
      return
    }

    await this.loadTrackAtIndex(Math.max(0, Math.min(index, this.playlist.length - 1)), autoPlay)
  }

  async advanceToNextInternal(autoTriggered) {
    if (!this.playlist.length) return

    const baseIndex = this.currentIndex === -1 ? this.pendingIndex : this.currentIndex
    if (baseIndex >= this.playlist.length - 1) {
      this.isPlaying = false
      this.callbacks.onPlaylistEnd?.()
      return
    }

    const nextIndex = baseIndex + 1

    if (this.isPlaying || autoTriggered) {
      await this.loadTrackAtIndex(nextIndex, true)
      if (autoTriggered) {
        this.callbacks.onAutoAdvance?.()
      }
    } else {
      this.pendingIndex = nextIndex
      this.currentIndex = -1
    }
  }

  async loadTrackAtIndex(index, autoPlay) {
    if (index < 0 || index >= this.playlist.length) {
      console.warn('[InlineSIDPlayer] loadTrackAtIndex() out of range', { index, length: this.playlist.length })
      return false
    }

    this.pendingIndex = index
    this.currentIndex = index
    const trackWithData = await this.resolveTrackData(this.playlist[index])

    console.log('[InlineSIDPlayer] loadTrackAtIndex()', {
      index,
      autoPlay,
      track: trackWithData.name ?? trackWithData.path,
      hasData: !!trackWithData.data,
    })
    await this.controller.loadTrack(trackWithData, autoPlay)

    if (autoPlay) {
      this.isPlaying = true
    }

    this.callbacks.onTrackStart?.(trackWithData, index)
    return true
  }

  async resolveTrackData(track) {
    if (track.data) {
      return track
    }

    const cacheKey = `${track.path}|${track.subsong ?? -1}`
    const cached = this.dataCache.get(cacheKey)
    if (cached) {
      return { ...track, data: cached }
    }

    const response = await fetch(track.path).catch((error) => {
      console.error('[InlineSIDPlayer] fetch threw', { path: track.path, error })
      throw error
    })
    if (!response?.ok) {
      const statusInfo = response ? `${response.status} ${response.statusText}` : 'no response'
      throw new Error(`Failed to fetch SID file: ${track.path} (${statusInfo})`)
    }

    const buffer = new Uint8Array(await response.arrayBuffer())
    this.dataCache.set(cacheKey, buffer)
    return { ...track, data: buffer }
  }

  async dispose() {
    await this.controller.dispose()
  }

  clearCache() {
    console.warn('[InlineSIDPlayer] cache cleared')
    this.dataCache.clear()
  }

  getAnalyserNode() {
    if (!this.analyser) {
      this.analyser = this.controller.getAnalyserNode()
      if (this.analyser) {
        this.magnitudeArray = new Uint8Array(this.analyser.frequencyBinCount)
      }
    }
    return this.analyser
  }

  getCurrentLevel() {
    const buckets = this.getFrequencyBuckets(32)
    if (!buckets.length) {
      return 0
    }
    const total = buckets.reduce((sum, value) => sum + value, 0)
    return total / buckets.length
  }

  getFrequencyBuckets(bucketCount = 32) {
    const analyser = this.getAnalyserNode()
    if (!analyser || !this.magnitudeArray?.length || bucketCount <= 0) {
      return []
    }
    analyser.getByteFrequencyData(this.magnitudeArray)
    const buckets = new Array(bucketCount).fill(0)
    const binSize = Math.max(1, Math.floor(this.magnitudeArray.length / bucketCount))
    for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex++) {
      let sum = 0
      for (let i = 0; i < binSize; i++) {
        const sampleIndex = bucketIndex * binSize + i
        if (sampleIndex >= this.magnitudeArray.length) {
          break
        }
        sum += this.magnitudeArray[sampleIndex]
      }
      const average = sum / (binSize * 255)
      buckets[bucketIndex] = average
    }
    return buckets
  }
}

