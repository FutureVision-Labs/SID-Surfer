import Phaser from 'phaser'

const COLORS = ['#5af0e0', '#7f5af0', '#ff6b6b', '#ffe66d', '#50fa7b']
const POWERUP_TYPES = ['shield', 'rockets', 'heal']
const POWERUP_CONFIG = {
  shield: { label: 'Shield Boost', duration: 12000 },
  rockets: { label: 'Rockets', duration: 9000 },
  heal: { label: 'Health Surge', duration: 0, heal: 25 },
}
const WAVE_SCROLL_SPEED = 0.05
const PLAYER_SPEED = 0.22
const PLAYER_BOUNCE_AMPLITUDE = 30 // Increased for more visible bounce
const OBJECT_BOUNCE_AMPLITUDE = 24
const PLAYER_LERP = 0.15
const PLAYER_FIRE_DELAY = 350
const ROCKET_FIRE_DELAY_MULTIPLIER = 0.8

export class WaveScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WaveScene' })
    this.waveDefs = []
    this.playlist = []
    this.composerName = ''
    this.currentLane = 0
    this.laneLabels = []
    this.placeholderPool = []
    this.playerSprite = null
    this.spawnTimer = null
    this.comboValue = 0
    this.enemyCollisionsDisabled = false // Cheat flag
    this.playerX = 0
    this.playerBouncePhase = 0
    this.waveScroll = 0
    this.cachedFreqBuckets = []
    this.currentAnalyserLevel = 0
    this.playerHealth = 100
    this.playerMaxHealth = 100
    this.playerScore = 0
    this.activePowerup = null
    this.powerupExpiresAt = 0
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.lastPlayerShot = 0
    this.levelIntroLabel = null
    this.trackAnnouncementLabel = null
    this.bossActive = false
    this.bossSprite = null
    this.bossGlow = null
    this.bossHealth = 0
    this.bossMaxHealth = 3000 // Much harder boss
    this.bossLane = 0
    this.bossX = 0
    this.bossFireCooldown = 0
    this.bossDroneCooldown = 0
    this.bossProjectiles = []
    this.bossDrones = []
    this.explosions = []
    this.playerFacingRight = true
    this.handleWavePlaylist = this.handleWavePlaylist.bind(this)
    this.handleLevelIntro = this.handleLevelIntro.bind(this)
    this.handleTrackAnnouncement = this.handleTrackAnnouncement.bind(this)
  }

  init(data) {
    this.waveDefs = data.waveDefs ?? this.createDefaultWaves()
  }

  preload() {
    this.load.image('powerup-heal', '/sprites/cbmcombo.png')
    this.load.image('powerup-rockets', '/sprites/rocket.png')
    this.load.image('powerup-shield', '/sprites/waveform.png')
    this.load.image('drone', '/sprites/drone.png')
    this.load.image('boss', '/sprites/boss.png')
    
    // Load player spritesheet (256px frame size, 60 frames per direction, 2 rows)
    // Atlas: 256×60 = 15,360px wide, 256×2 = 512px tall
    // Each frame: 256×256px (fits within WebGL 16,384px limit)
    this.load.spritesheet('player-sprite', '/sprites/player-spritesheet.png', {
      frameWidth: 256,
      frameHeight: 256,
    })
  }

  create() {
    const { width, height } = this.scale

    // Expose cheat to console
    if (typeof window !== 'undefined') {
      window.sidSurferCheats = window.sidSurferCheats || {}
      window.sidSurferCheats.disableEnemyCollisions = (enabled = true) => {
        this.enemyCollisionsDisabled = enabled
        console.log(`[CHEAT] Enemy collisions ${enabled ? 'DISABLED' : 'ENABLED'}`)
      }
    }

    const hud = document.querySelector('.hud')
    if (hud) {
      hud.style.display = ''
    }

    this.background = this.add.graphics()
    this.drawBackground(width, height)

    this.waveGraphics = this.add.graphics()

    this.player = window.sidSurfer?.sidPlayer ?? null

    // Create physics-based stickman surfer (reacts to wave physics!)
    this.playerSprite = this.add.container(width * 0.8, height * 0.2)
    this.playerFacingRight = true
    this.playerGraphics = this.add.graphics()
    this.playerSprite.add(this.playerGraphics)
    
    // Glow will be drawn as part of the stickman
    this.playerGlow = null // No longer using separate glow circle
    this.playerX = width * 0.75
    this.playerProjectiles = []
    this.enemyProjectiles = []
    this.playerHealth = this.playerMaxHealth
    this.activePowerup = null
    this.powerupExpiresAt = 0
    this.lastPlayerShot = 0
    this.trickMeter = 0
    this.trickThreshold = 100
    this.powerupLabel = null
    this.trickCuePool = [
      'trick1',
      'trick2',
      'trick3',
      'trickRadical',
      'trickAwesomesauce',
      'trickAmazeballs',
      'trickBoogie',
      'trickYeah',
    ]
    this.trickAnimations = ['spin', 'flip', 'twist', 'barrel']


    this.cursors = this.input.keyboard.createCursorKeys()
    this.altKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.ctrlKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CONTROL)

    this.game.events.on('wave:playlist', this.handleWavePlaylist)
    this.game.events.on('wave:level', this.handleLevelIntro)
    this.game.events.on('wave:track', this.handleTrackAnnouncement)
    this.game.events.on('wave:boss-fight-start', this.startBossFight.bind(this))
    this.events.on('composer-profile-complete', () => {
      const initialState = window.sidSurfer?.waveState
      if (initialState?.playlist?.length) {
        this.handleWavePlaylist(initialState)
      }
    })
    const initialState = window.sidSurfer?.waveState
    if (initialState?.playlist?.length && !this.game.scene.isActive('ComposerProfileScene') && !this.game.scene.isActive('TitleScene')) {
      this.handleWavePlaylist(initialState)
    }

    this.spawnInitialPlaceholders()
    this.spawnTimer = this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => this.spawnPlaceholder(),
    })
    this.syncHudStatus()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('wave:playlist', this.handleWavePlaylist)
      this.game.events.off('wave:level', this.handleLevelIntro)
      this.game.events.off('wave:track', this.handleTrackAnnouncement)
      this.game.events.off('wave:boss-fight-start', this.startBossFight)
      this.spawnTimer?.destroy()
    })
  }

  handleWavePlaylist(state) {
    if (!state) return
    this.playlist = state.playlist ?? []
    this.composerName = state.composerName ?? 'Wave Mix'
    const desiredCount = this.playlist.length || 5
    this.waveDefs = this.createWaveSet(desiredCount)
    this.currentLane = 0
    this.updateLaneMarker()
    // Lane labels removed
    this.waveDefs.forEach((wave) => {
      wave.phase = Math.random() * Math.PI * 2
      wave.turbulencePhase = Math.random() * Math.PI * 2
      wave.visualLevel = 0
      wave.cachedPoints = []
    })
  }

  update(time, delta) {
    this.pollInput()
    const { width, height } = this.scale
    this.waveScroll = (this.waveScroll - delta * WAVE_SCROLL_SPEED + width) % width
    const freqBucketsRaw = this.player?.getFrequencyBuckets?.(96)
    if (freqBucketsRaw?.length) {
      this.cachedFreqBuckets = freqBucketsRaw
      this.currentAnalyserLevel =
        freqBucketsRaw.reduce((sum, value) => sum + value, 0) / (freqBucketsRaw.length || 1)
    }
    const freqBuckets = this.cachedFreqBuckets ?? []
    const analyserLevel = this.currentAnalyserLevel ?? 0

    this.waveGraphics.clear()
    this.waveDefs.forEach((wave, index) => {
      this.drawWave(width, height, wave, delta, index, freqBuckets, analyserLevel)
    })

    if (!this.bossActive) {
      this.updatePlaceholders(delta)
    }
    this.updatePlayerOnWave(time, delta)
    this.updateProjectiles(delta)
    this.updatePowerup(time)
    if (this.bossActive) {
      this.updateBoss(delta, time)
    }
  }

  pollInput() {
    if (!this.cursors) return
    const upPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.altKeys.up)
    const downPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.altKeys.down)

    if (upPressed) {
      this.changeLane(-1)
    } else if (downPressed) {
      this.changeLane(1)
    }
  }

  changeLane(delta) {
    if (!this.waveDefs.length) return
    const maxIndex = this.waveDefs.length - 1
    const nextLane = Phaser.Math.Clamp(this.currentLane + delta, 0, maxIndex)
    if (nextLane === this.currentLane) return
    this.currentLane = nextLane
    this.trickMeter = 0
    this.syncHudStatus()
    this.updateLaneMarker()
    this.playLaneTrack()
    // Lane labels removed
    this.showLaneTrackAnnouncement()
    this.updateCombo(true)
  }


  async playLaneTrack() {
    if (!this.player || !this.playlist.length) return
    const trackIndex = Math.min(this.currentLane, this.playlist.length - 1)
    try {
      await this.player.playTrackAtIndex(trackIndex, true)
    } catch (error) {
      console.error('[WaveScene] Failed to switch lane track', error)
    }
  }

  updateLaneMarker() {
    const { height } = this.scale
    const yBase = height * 0.2 + this.currentLane * 80
  }

  // Lane labels removed

  updateCombo(laneSwitch = false) {
    if (laneSwitch) {
      this.comboValue = Math.max(1, this.comboValue + 1)
    } else {
      this.comboValue = Math.max(1, this.comboValue - 1)
    }
    // Combo text display removed - comboValue still used for scoring
  }

  incrementTrickMeter(delta) {
    this.trickMeter = Math.min(100, this.trickMeter + delta * 0.003)
    this.syncHudStatus()
  }

  performTrick() {
    if (this.trickMeter < this.trickThreshold) return
    
    this.trickMeter = 0
    this.comboValue += 2
    this.playerScore += 100 * this.comboValue
    this.syncHudStatus()
    
    // Play random announcer cue
    const cue = Phaser.Utils.Array.GetRandom(this.trickCuePool)
    this.playCue(cue ?? 'trick1')
    
    // Execute random trick animation
    const animType = Phaser.Utils.Array.GetRandom(this.trickAnimations)
    this.executeTrickAnimation(animType)
    
    // Visual feedback
    this.addFlash(0x50fa7b)
  }

  executeTrickAnimation(type) {
    const baseDuration = 650
    this.tweens.killTweensOf([this.playerSprite])
    
    switch (type) {
      case 'spin':
        this.tweens.add({
          targets: this.playerSprite,
          rotation: this.playerSprite.rotation + Math.PI * 2,
          scale: { from: 1, to: 1.3 },
          duration: baseDuration,
          ease: 'Cubic.Out',
          yoyo: true,
        })
        break
      case 'flip':
        this.tweens.add({
          targets: this.playerSprite,
          rotation: this.playerSprite.rotation + Math.PI * 3,
          y: { from: this.playerSprite.y, to: this.playerSprite.y - 30 },
          duration: baseDuration,
          ease: 'Back.Out',
          yoyo: true,
        })
        break
      case 'twist':
        this.tweens.add({
          targets: this.playerSprite,
          rotation: this.playerSprite.rotation + Math.PI * 4,
          scaleX: { from: 1, to: 1.4 },
          scaleY: { from: 1, to: 0.6 },
          duration: baseDuration,
          ease: 'Elastic.Out',
          yoyo: true,
        })
        break
      case 'barrel':
        this.tweens.add({
          targets: this.playerSprite,
          rotation: this.playerSprite.rotation + Math.PI * 5,
          x: { from: this.playerSprite.x, to: this.playerSprite.x + 40 },
          scale: { from: 1, to: 1.25 },
          duration: baseDuration,
          ease: 'Sine.InOut',
          yoyo: true,
        })
        break
      default:
        this.tweens.add({
          targets: this.playerSprite,
          rotation: this.playerSprite.rotation + Math.PI * 2,
          scale: { from: 1, to: 1.2 },
          duration: baseDuration,
          ease: 'Cubic.Out',
          yoyo: true,
        })
    }
    
    // Glow is now part of stickman, no separate glow animation needed
  }

  updatePlayerOnWave(time, delta) {
    if (!this.playerSprite || !this.waveDefs.length) return
    const { width } = this.scale
    let horizontalInput = 0
    if (this.cursors.left?.isDown || this.altKeys.left?.isDown) horizontalInput -= 1
    if (this.cursors.right?.isDown || this.altKeys.right?.isDown) horizontalInput += 1

    // Update facing direction
    if (horizontalInput > 0 && !this.playerFacingRight) {
      this.playerFacingRight = true
    } else if (horizontalInput < 0 && this.playerFacingRight) {
      this.playerFacingRight = false
    }

    this.playerX += horizontalInput * PLAYER_SPEED * delta
    this.playerX = Phaser.Math.Wrap(this.playerX, 0, width)

    if (this.spaceKey?.isDown) {
      this.firePlayerProjectile(time)
    }
    if (Phaser.Input.Keyboard.JustDown(this.ctrlKey) && this.trickMeter >= this.trickThreshold) {
      this.performTrick()
    }

    const fallbackInfo = { y: this.scale.height * 0.2 + this.currentLane * 80, slope: 0 }
    const waveInfo = this.getWaveInfo(this.currentLane, this.playerX) ?? fallbackInfo
    const waveY = waveInfo.y ?? fallbackInfo.y
    const slope = waveInfo.slope ?? 0
    this.playerBouncePhase += delta * 0.006 // Slightly slower for smoother bounce
    const bounce = Math.sin(this.playerBouncePhase) * PLAYER_BOUNCE_AMPLITUDE
    const targetY = waveY - 18 + bounce

    // Apply bounce directly to avoid jerkiness from lerp fighting bounce
    this.playerSprite.x = this.playerX
    this.playerSprite.y = targetY // Use targetY directly for smoother bounce
    
    // Restore rotation with wave and bounce (more pronounced)
    this.playerSprite.rotation = Phaser.Math.Angle.Wrap(slope + Math.sin(this.playerBouncePhase) * 0.3)
    
    // Draw stickman surfer that reacts to wave physics
    this.drawStickmanSurfer(slope, horizontalInput, bounce, delta)
    
    // Glow is now part of stickman drawing
    this.incrementTrickMeter(delta)
  }

  drawStickmanSurfer(slope, horizontalInput, bounce, delta) {
    if (!this.playerGraphics) return
    
    const g = this.playerGraphics
    g.clear()
    
    // Colors
    const bodyColor = 0xfff6c2
    const glowColor = 0xfff6c2
    const boardColor = 0x4ecdc4
    const lineWidth = 3
    const glowWidth = 5
    
    // Base position (center of stickman)
    const centerX = 0
    const centerY = 0
    
    // Smooth out reactions - reduce sensitivity
    // Calculate body lean based on movement and wave slope (much more subtle)
    const leanAngle = slope * 0.3 + (horizontalInput * 0.15) // Reduced sensitivity
    const bodyAngle = leanAngle
    
    // Head (circle)
    const headRadius = 8
    const headY = centerY - 35
    
    // Body (from head to hips)
    const bodyLength = 25
    const hipY = centerY - 10
    const hipX = centerX + Math.sin(bodyAngle) * (bodyLength * 0.2) // Reduced from 0.3
    
    // Shoulders (for arms) - positioned on the body, not right next to head
    const shoulderY = centerY - 20 // Lower on body, between head and hips
    const shoulderOffset = 10
    const leftShoulderX = centerX - shoulderOffset * (this.playerFacingRight ? 1 : -1) + Math.sin(bodyAngle) * 3
    const rightShoulderX = centerX + shoulderOffset * (this.playerFacingRight ? 1 : -1) + Math.sin(bodyAngle) * 3
    
    // Arms - horizontal surfing pose (outstretched to sides for balance)
    const armLength = 20
    const armSpread = Math.abs(horizontalInput) * 0.15 + Math.abs(slope) * 0.1
    // Arms go out to sides (horizontal) - left points left, right points right
    // In Phaser: 0 = right, Math.PI = left, Math.PI/2 = down, -Math.PI/2 = up
    const leftArmAngle = Math.PI + bodyAngle * 0.2 - armSpread // Pointing left (180 degrees) with slight adjustments
    const rightArmAngle = 0 + bodyAngle * 0.2 + armSpread // Pointing right (0 degrees) with slight adjustments
    const leftArmEndX = leftShoulderX + Math.cos(leftArmAngle) * armLength
    const leftArmEndY = shoulderY + Math.sin(leftArmAngle) * armLength
    const rightArmEndX = rightShoulderX + Math.cos(rightArmAngle) * armLength
    const rightArmEndY = shoulderY + Math.sin(rightArmAngle) * armLength
    
    // Hips (for legs)
    const hipWidth = 14
    const leftHipX = hipX - hipWidth / 2
    const rightHipX = hipX + hipWidth / 2
    
    // Legs - much less aggressive bending, more stable
    const legLength = 20
    const kneeBend = Math.abs(slope) * 0.15 + Math.abs(bounce) * 0.05 // Reduced from 0.4/0.1 - much more subtle
    // Add a base bend so legs aren't straight (more natural surfing stance)
    const baseKneeBend = 0.2 // Slight natural bend
    const leftKneeBend = baseKneeBend + (slope > 0 ? kneeBend : -kneeBend * 0.5)
    const rightKneeBend = baseKneeBend - (slope > 0 ? kneeBend * 0.5 : -kneeBend)
    
    const leftKneeX = leftHipX + Math.sin(bodyAngle + leftKneeBend) * (legLength * 0.6)
    const leftKneeY = hipY + Math.cos(bodyAngle + leftKneeBend) * (legLength * 0.6)
    const rightKneeX = rightHipX + Math.sin(bodyAngle - rightKneeBend) * (legLength * 0.6)
    const rightKneeY = hipY + Math.cos(bodyAngle - rightKneeBend) * (legLength * 0.6)
    
    // Feet (on board)
    const footY = centerY + 8
    const leftFootX = leftKneeX + Math.sin(bodyAngle + leftKneeBend) * (legLength * 0.4)
    const rightFootX = rightKneeX + Math.sin(bodyAngle - rightKneeBend) * (legLength * 0.4)
    
    // Surfboard (under feet, rotated with wave)
    const boardLength = 32
    const boardY = footY + 4
    const boardAngle = slope * 0.5 // Less board rotation
    
    // Draw surfboard first (behind stickman)
    g.lineStyle(2, boardColor, 0.8)
    g.beginPath()
    const boardLeftX = centerX - boardLength / 2
    const boardRightX = centerX + boardLength / 2
    g.moveTo(boardLeftX, boardY)
    g.lineTo(boardRightX, boardY)
    g.strokePath()
    
    // Draw stickman with glow effect
    // First draw glow layer (thicker, semi-transparent) - draw ALL parts with glow
    g.lineStyle(glowWidth, glowColor, 0.5)
    
    // Glow head
    g.fillStyle(glowColor, 0.4)
    g.fillCircle(centerX, headY, headRadius + 2)
    g.strokeCircle(centerX, headY, headRadius + 2)
    
    // Glow body - make sure lineStyle is set
    g.lineStyle(glowWidth, glowColor, 0.5)
    g.beginPath()
    g.moveTo(centerX, headY + headRadius)
    g.lineTo(hipX, hipY)
    g.strokePath()
    
    // Glow left arm
    g.lineStyle(glowWidth, glowColor, 0.5)
    g.beginPath()
    g.moveTo(leftShoulderX, shoulderY)
    g.lineTo(leftArmEndX, leftArmEndY)
    g.strokePath()
    
    // Glow right arm
    g.lineStyle(glowWidth, glowColor, 0.5)
    g.beginPath()
    g.moveTo(rightShoulderX, shoulderY)
    g.lineTo(rightArmEndX, rightArmEndY)
    g.strokePath()
    
    // Glow left leg
    g.lineStyle(glowWidth, glowColor, 0.5)
    g.beginPath()
    g.moveTo(leftHipX, hipY)
    g.lineTo(leftKneeX, leftKneeY)
    g.lineTo(leftFootX, footY)
    g.strokePath()
    
    // Glow right leg
    g.lineStyle(glowWidth, glowColor, 0.5)
    g.beginPath()
    g.moveTo(rightHipX, hipY)
    g.lineTo(rightKneeX, rightKneeY)
    g.lineTo(rightFootX, footY)
    g.strokePath()
    
    // Now draw stickman on top (normal, solid)
    g.lineStyle(lineWidth, bodyColor, 1)
    
    // Head
    g.fillStyle(bodyColor, 1)
    g.fillCircle(centerX, headY, headRadius)
    g.lineStyle(lineWidth, bodyColor, 1)
    g.strokeCircle(centerX, headY, headRadius)
    
    // Body
    g.lineStyle(lineWidth, bodyColor, 1)
    g.beginPath()
    g.moveTo(centerX, headY + headRadius)
    g.lineTo(hipX, hipY)
    g.strokePath()
    
    // Left arm
    g.beginPath()
    g.moveTo(leftShoulderX, shoulderY)
    g.lineTo(leftArmEndX, leftArmEndY)
    g.strokePath()
    
    // Right arm
    g.beginPath()
    g.moveTo(rightShoulderX, shoulderY)
    g.lineTo(rightArmEndX, rightArmEndY)
    g.strokePath()
    
    // Left leg
    g.beginPath()
    g.moveTo(leftHipX, hipY)
    g.lineTo(leftKneeX, leftKneeY)
    g.lineTo(leftFootX, footY)
    g.strokePath()
    
    // Right leg
    g.beginPath()
    g.moveTo(rightHipX, hipY)
    g.lineTo(rightKneeX, rightKneeY)
    g.lineTo(rightFootX, footY)
    g.strokePath()
  }

  drawEnemyStickman(graphics, slope, bounce, type) {
    if (!graphics) return
    
    const g = graphics
    g.clear()
    
    // Colors based on enemy type
    const bodyColor = type === 'ghost' ? 0x9be7ff : 0xff6b6b
    const glowColor = type === 'ghost' ? 0x9be7ff : 0xff6b6b
    const boardColor = type === 'ghost' ? 0x4ecdc4 : 0xff6b6b // Surfboard color
    const lineWidth = 3 // Same as player
    const glowWidth = 5 // Same as player
    
    // Base position (center of stickman) - SAME SIZE AS PLAYER
    const centerX = 0
    const centerY = 0
    
    // Body lean based on wave slope (same as player)
    const leanAngle = slope * 0.3
    const bodyAngle = leanAngle
    
    // Head (circle) - SAME SIZE AS PLAYER
    const headRadius = 8
    const headY = centerY - 35
    
    // Body (from head to hips) - SAME SIZE AS PLAYER
    const bodyLength = 25
    const hipY = centerY - 10
    const hipX = centerX + Math.sin(bodyAngle) * (bodyLength * 0.2)
    
    // Shoulders - SAME SIZE AS PLAYER
    const shoulderY = centerY - 20
    const shoulderOffset = 10
    const leftShoulderX = centerX - shoulderOffset + Math.sin(bodyAngle) * 3
    const rightShoulderX = centerX + shoulderOffset + Math.sin(bodyAngle) * 3
    
    // Arms - pointing forward (enemies face left/toward player) - SAME SIZE AS PLAYER
    const armLength = 20
    const leftArmAngle = Math.PI * 0.75 + bodyAngle * 0.2 // Pointing forward-left
    const rightArmAngle = Math.PI * 0.25 + bodyAngle * 0.2 // Pointing forward-right
    const leftArmEndX = leftShoulderX + Math.cos(leftArmAngle) * armLength
    const leftArmEndY = shoulderY + Math.sin(leftArmAngle) * armLength
    const rightArmEndX = rightShoulderX + Math.cos(rightArmAngle) * armLength
    const rightArmEndY = shoulderY + Math.sin(rightArmAngle) * armLength
    
    // Hips - SAME SIZE AS PLAYER
    const hipWidth = 14
    const leftHipX = hipX - hipWidth / 2
    const rightHipX = hipX + hipWidth / 2
    
    // Legs - SAME SIZE AS PLAYER
    const legLength = 20
    const kneeBend = Math.abs(slope) * 0.15 + Math.abs(bounce) * 0.05
    const baseKneeBend = 0.2
    const leftKneeBend = baseKneeBend + (slope > 0 ? kneeBend : -kneeBend * 0.5)
    const rightKneeBend = baseKneeBend - (slope > 0 ? kneeBend * 0.5 : -kneeBend)
    
    const leftKneeX = leftHipX + Math.sin(bodyAngle + leftKneeBend) * (legLength * 0.6)
    const leftKneeY = hipY + Math.cos(bodyAngle + leftKneeBend) * (legLength * 0.6)
    const rightKneeX = rightHipX + Math.sin(bodyAngle - rightKneeBend) * (legLength * 0.6)
    const rightKneeY = hipY + Math.cos(bodyAngle - rightKneeBend) * (legLength * 0.6)
    
    // Feet (on board) - SAME SIZE AS PLAYER
    const footY = centerY + 8
    const leftFootX = leftKneeX + Math.sin(bodyAngle + leftKneeBend) * (legLength * 0.4)
    const rightFootX = rightKneeX + Math.sin(bodyAngle - rightKneeBend) * (legLength * 0.4)
    
    // Surfboard (under feet, rotated with wave) - SAME SIZE AS PLAYER
    const boardLength = 32
    const boardY = footY + 4
    const boardAngle = slope * 0.5
    
    // Draw surfboard first (behind stickman)
    g.lineStyle(2, boardColor, type === 'ghost' ? 0.6 : 0.8)
    g.beginPath()
    const boardLeftX = centerX - boardLength / 2
    const boardRightX = centerX + boardLength / 2
    g.moveTo(boardLeftX, boardY)
    g.lineTo(boardRightX, boardY)
    g.strokePath()
    
    // Draw stickman with glow effect
    // First draw glow layer (thicker, semi-transparent) - SAME AS PLAYER
    g.lineStyle(glowWidth, glowColor, type === 'ghost' ? 0.3 : 0.5)
    
    // Glow head
    g.fillStyle(glowColor, type === 'ghost' ? 0.2 : 0.4)
    g.fillCircle(centerX, headY, headRadius + 2)
    g.strokeCircle(centerX, headY, headRadius + 2)
    
    // Glow body
    g.lineStyle(glowWidth, glowColor, type === 'ghost' ? 0.3 : 0.5)
    g.beginPath()
    g.moveTo(centerX, headY + headRadius)
    g.lineTo(hipX, hipY)
    g.strokePath()
    
    // Glow left arm
    g.lineStyle(glowWidth, glowColor, type === 'ghost' ? 0.3 : 0.5)
    g.beginPath()
    g.moveTo(leftShoulderX, shoulderY)
    g.lineTo(leftArmEndX, leftArmEndY)
    g.strokePath()
    
    // Glow right arm
    g.lineStyle(glowWidth, glowColor, type === 'ghost' ? 0.3 : 0.5)
    g.beginPath()
    g.moveTo(rightShoulderX, shoulderY)
    g.lineTo(rightArmEndX, rightArmEndY)
    g.strokePath()
    
    // Glow left leg
    g.lineStyle(glowWidth, glowColor, type === 'ghost' ? 0.3 : 0.5)
    g.beginPath()
    g.moveTo(leftHipX, hipY)
    g.lineTo(leftKneeX, leftKneeY)
    g.lineTo(leftFootX, footY)
    g.strokePath()
    
    // Glow right leg
    g.lineStyle(glowWidth, glowColor, type === 'ghost' ? 0.3 : 0.5)
    g.beginPath()
    g.moveTo(rightHipX, hipY)
    g.lineTo(rightKneeX, rightKneeY)
    g.lineTo(rightFootX, footY)
    g.strokePath()
    
    // Now draw stickman on top (normal, solid) - SAME AS PLAYER
    g.lineStyle(lineWidth, bodyColor, type === 'ghost' ? 0.6 : 1)
    
    // Head
    g.fillStyle(bodyColor, type === 'ghost' ? 0.5 : 1)
    g.fillCircle(centerX, headY, headRadius)
    g.lineStyle(lineWidth, bodyColor, type === 'ghost' ? 0.6 : 1)
    g.strokeCircle(centerX, headY, headRadius)
    
    // Body
    g.lineStyle(lineWidth, bodyColor, type === 'ghost' ? 0.6 : 1)
    g.beginPath()
    g.moveTo(centerX, headY + headRadius)
    g.lineTo(hipX, hipY)
    g.strokePath()
    
    // Left arm
    g.beginPath()
    g.moveTo(leftShoulderX, shoulderY)
    g.lineTo(leftArmEndX, leftArmEndY)
    g.strokePath()
    
    // Right arm
    g.beginPath()
    g.moveTo(rightShoulderX, shoulderY)
    g.lineTo(rightArmEndX, rightArmEndY)
    g.strokePath()
    
    // Left leg
    g.beginPath()
    g.moveTo(leftHipX, hipY)
    g.lineTo(leftKneeX, leftKneeY)
    g.lineTo(leftFootX, footY)
    g.strokePath()
    
    // Right leg
    g.beginPath()
    g.moveTo(rightHipX, hipY)
    g.lineTo(rightKneeX, rightKneeY)
    g.lineTo(rightFootX, footY)
    g.strokePath()
  }

  spawnInitialPlaceholders() {
    for (let i = 0; i < 6; i++) {
      this.spawnPlaceholder(true)
    }
  }

  spawnPlaceholder(initial = false) {
    const lane = Phaser.Math.Between(0, Math.max(0, this.waveDefs.length - 1))
    const type = Phaser.Math.RND.pick(['powerup', 'obstacle', 'ghost'])
    const { width } = this.scale
    const startX = initial ? Phaser.Math.Between(0, width) : -80

    let shape
    let powerupKind = null
    let enemyGraphics = null
    if (type === 'powerup') {
      powerupKind = Phaser.Math.RND.pick(POWERUP_TYPES)
      const spriteKey = `powerup-${powerupKind}`
      if (this.textures.exists(spriteKey)) {
        shape = this.add.image(0, 0, spriteKey)
        shape.setDisplaySize(48, 32)
        shape.setTint(0xffffff)
      } else {
        shape = this.add.star(0, 0, 5, 8, 16, 0x4ecdc4, 1).setStrokeStyle(0)
      }
    } else {
      // Create container with graphics for enemy stickmen
      shape = this.add.container(0, 0)
      enemyGraphics = this.add.graphics()
      shape.add(enemyGraphics)
    }

    const initialY = this.sampleWaveY(lane, startX)
    shape.setPosition(startX, initialY)
    const entry = {
      sprite: shape,
      lane,
      type,
      speed: 0.08 + lane * 0.015,
      x: startX,
      fireCooldown: Phaser.Math.Between(900, 1600),
      fireElapsed: 0,
      health: type === 'powerup' ? 0 : type === 'ghost' ? 20 : 35,
      bouncePhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      graphics: enemyGraphics, // Store graphics reference for stickman drawing
    }
    if (type === 'powerup') {
      entry.powerupKind = powerupKind
    }
    this.placeholderPool.push(entry)
  }

  updatePlaceholders(delta) {
    const { width } = this.scale
    this.placeholderPool.forEach((entry) => {
      if (entry.destroyed) {
        return
      }
      entry.x += delta * entry.speed
      entry.bouncePhase = (entry.bouncePhase ?? 0) + delta * 0.004
      const waveInfo = this.getWaveInfo(entry.lane, entry.x) ?? { y: this.scale.height * 0.2 + entry.lane * 80, slope: 0 }
      const baseY = waveInfo.y
      const slope = waveInfo.slope ?? 0
      const bounce = Math.sin(entry.bouncePhase) * OBJECT_BOUNCE_AMPLITUDE
      entry.sprite.x = entry.x
      entry.sprite.y = baseY + bounce
      entry.sprite.rotation = Phaser.Math.Angle.Wrap(slope + Math.sin(entry.bouncePhase) * 0.3)
      
      // Draw enemy stickman if it's an enemy type
      if ((entry.type === 'ghost' || entry.type === 'obstacle') && entry.graphics) {
        this.drawEnemyStickman(entry.graphics, slope, bounce, entry.type)
      }

      // Check collision - skip enemy collisions if cheat is enabled, but always allow powerup collisions
      if (entry.lane === this.currentLane && !entry.hit && Math.abs(entry.x - this.playerSprite.x) < 40) {
        // Skip collision if it's an enemy type and collisions are disabled
        if (this.enemyCollisionsDisabled && (entry.type === 'ghost' || entry.type === 'obstacle')) {
          // Enemies pass through, but they can still be shot
        } else {
          entry.hit = true
          this.handlePlaceholderCollision(entry)
        }
      }

      if ((entry.type === 'obstacle' || entry.type === 'ghost') && !entry.hit) {
        entry.fireElapsed = (entry.fireElapsed ?? 0) + delta
        if (entry.fireElapsed >= entry.fireCooldown) {
          entry.fireElapsed = 0
          entry.fireCooldown = Phaser.Math.Between(900, 1600)
          this.fireEnemyProjectile(entry)
        }
      }

      if (entry.x > width + 80) {
        this.destroyPlaceholder(entry, 0x04132b)
      }
    })

    this.placeholderPool = this.placeholderPool.filter((entry) => !entry.destroyed)
  }

  handlePlaceholderCollision(entry) {
    if (entry.type === 'powerup') {
      this.comboValue += 1
      this.playerScore += 50 * this.comboValue
      this.activatePowerup(entry.powerupKind ?? 'shield')
      this.destroyPlaceholder(entry, 0x4ecdc4)
      this.syncHudStatus()
      return
    }

    if (entry.type === 'ghost') {
      this.comboValue = Math.max(1, this.comboValue - 1)
      this.playerDamage(12)
      this.destroyPlaceholder(entry, 0x9be7ff)
      return
    }

    this.comboValue = 1
    this.playerDamage(8)
    this.destroyPlaceholder(entry, 0xff6b6b)
  }

  addFlash(color) {
    const flash = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, color, 0.12)
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    })
  }

  playCue(name) {
    window.sidSurferAudio?.playCue?.(name)
  }

  destroyPlaceholder(entry, flashColor = 0xff6b6b) {
    if (!entry || entry.destroyed) return
    entry.destroyed = true
    // Clean up graphics if it exists
    if (entry.graphics) {
      entry.graphics.clear()
      entry.graphics.destroy()
    }
    entry.sprite?.destroy()
    if (flashColor) {
      this.addFlash(flashColor)
    }
  }

  activatePowerup(kind) {
    const config = POWERUP_CONFIG[kind]
    if (!config) return
    if (kind === 'heal') {
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + (config.heal ?? 20))
      this.showPowerupText('HEALTH SURGE +', '#50fa7b')
      this.playCue('powerupHeal')
      this.syncHudStatus()
      return
    }
    const now = this.time.now
    if (this.activePowerup === kind) {
      this.powerupExpiresAt = Math.max(this.powerupExpiresAt, now) + config.duration
    } else {
      this.activePowerup = kind
      this.powerupExpiresAt = now + config.duration
    }
    this.showPowerupText(config.label, '#ffe66d')
    const cueName = kind === 'rockets' ? 'powerupRockets' : 'powerupShield'
    this.playCue(cueName)
    this.syncHudStatus()
  }

  updatePowerup(time) {
    if (this.activePowerup) {
      if (time > this.powerupExpiresAt) {
        this.activePowerup = null
        this.powerupExpiresAt = 0
        this.showPowerupText('Power Down', '#c4c9ff')
      }
    } else if (this.powerupLabel) {
      this.powerupLabel.setAlpha(0)
    }
    this.syncHudStatus()
  }

  showPowerupText(message, color) {
    const { width } = this.scale
    if (!this.powerupLabel) {
      this.powerupLabel = this.add
        .text(width / 2, this.scale.height * 0.25, message, {
          fontFamily: 'Orbitron, Rajdhani, monospace',
          fontSize: '20px',
          color,
        })
        .setOrigin(0.5)
        .setAlpha(0)
    } else {
      this.powerupLabel.setText(message)
      this.powerupLabel.setColor(color)
    }
    this.powerupLabel.setAlpha(0)
    this.powerupLabel.setScale(0.8)
    this.tweens.killTweensOf(this.powerupLabel)
    this.tweens.add({
      targets: this.powerupLabel,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 300,
      ease: 'Quad.Out',
      yoyo: true,
      hold: 600,
    })
  }

  firePlayerProjectile(time) {
    const fireDelay =
      this.activePowerup === 'rockets' ? PLAYER_FIRE_DELAY * ROCKET_FIRE_DELAY_MULTIPLIER : PLAYER_FIRE_DELAY
    if (time - this.lastPlayerShot < fireDelay) {
      return
    }
    this.lastPlayerShot = time
    const isRocket = this.activePowerup === 'rockets'
    const baseColor = isRocket ? 0xff6b6b : 0x4ecdc4
    
    let sprite, glow
    if (isRocket) {
      sprite = this.add.triangle(this.playerX - 16, this.playerSprite.y, 0, -8, -6, 6, 6, 6, baseColor, 1)
      sprite.setRotation(0)
      sprite.setAlpha(0.95)
      sprite.setBlendMode(Phaser.BlendModes.ADD)
      
      glow = this.add.triangle(this.playerX - 16, this.playerSprite.y, 0, -10, -8, 8, 8, 8, baseColor, 0.5)
      glow.setRotation(0)
      glow.setBlendMode(Phaser.BlendModes.ADD)
      glow.setAlpha(0.7)
      
      const thrustFlame = this.add.triangle(this.playerX - 16, this.playerSprite.y, 0, 8, -4, 16, 4, 16, 0xff6600, 1)
      thrustFlame.setRotation(0)
      thrustFlame.setBlendMode(Phaser.BlendModes.ADD)
      thrustFlame.setAlpha(0.9)
      
      const thrustCore = this.add.triangle(this.playerX - 16, this.playerSprite.y, 0, 8, -2, 14, 2, 14, 0xffff00, 1)
      thrustCore.setRotation(0)
      thrustCore.setBlendMode(Phaser.BlendModes.ADD)
      thrustCore.setAlpha(1)
      
      this.tweens.add({
        targets: [thrustFlame, thrustCore],
        alpha: { from: 0.9, to: 0.4 },
        scaleY: { from: 1, to: 1.5 },
        duration: 100,
        ease: 'Sine.InOut',
        repeat: -1,
        yoyo: true,
      })
      
      const projectile = {
        sprite,
        glow,
        thrustFlame,
        thrustCore,
        speed: -0.18,
        damage: 25,
        isRocket: true,
        target: this.findNearestEnemy(this.playerX, this.playerSprite.y),
        homingSpeed: 0.18,
      }
      this.playerProjectiles.push(projectile)
    } else {
      sprite = this.add.rectangle(this.playerX - 16, this.playerSprite.y, 20, 3, baseColor, 1)
      sprite.setAlpha(1)
      sprite.setBlendMode(Phaser.BlendModes.ADD)
      
      glow = this.add.rectangle(this.playerX - 16, this.playerSprite.y, 24, 7, baseColor, 0.6)
      glow.setBlendMode(Phaser.BlendModes.ADD)
      glow.setAlpha(0.8)
      
      const outerGlow = this.add.rectangle(this.playerX - 16, this.playerSprite.y, 28, 11, baseColor, 0.3)
      outerGlow.setBlendMode(Phaser.BlendModes.ADD)
      outerGlow.setAlpha(0.6)
      
      this.tweens.add({
        targets: [glow, outerGlow],
        alpha: { from: 0.8, to: 0.3 },
        scale: { from: 1, to: 1.2 },
        duration: 150,
        ease: 'Quad.Out',
      })
      
      const projectile = {
        sprite,
        glow,
        outerGlow,
        speed: -0.4,
        damage: 15,
        isRocket: false,
        target: null,
        homingSpeed: 0.15,
      }
      this.playerProjectiles.push(projectile)
    }
    this.playCue('playerFire')
  }

  findNearestEnemy(fromX, fromY) {
    let nearest = null
    let nearestDist = Infinity
    for (const entry of this.placeholderPool) {
      if (!entry || entry.destroyed || entry.type === 'powerup') continue
      const dist = Phaser.Math.Distance.Between(fromX, fromY, entry.sprite.x, entry.sprite.y)
      if (dist < nearestDist && dist < 400) {
        nearestDist = dist
        nearest = entry
      }
    }
    return nearest
  }

  fireEnemyProjectile(entry) {
    if (!entry?.sprite) return
    const baseColor = 0xff6b6b
    const sprite = this.add.rectangle(entry.sprite.x + 12, entry.sprite.y, 16, 6, baseColor, 1)
    sprite.setAlpha(0.9)
    sprite.setBlendMode(Phaser.BlendModes.ADD)
    
    const glow = this.add.rectangle(entry.sprite.x + 12, entry.sprite.y, 20, 10, baseColor, 0.4)
    glow.setBlendMode(Phaser.BlendModes.ADD)
    glow.setAlpha(0.5)
    
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 0.1 },
      scale: { from: 1, to: 1.4 },
      duration: 250,
      ease: 'Quad.Out',
    })
    
    this.enemyProjectiles.push({
      sprite,
      glow,
      speed: 0.28,
      damage: 10,
    })
    this.playCue('enemyFire')
  }

  updateProjectiles(delta) {
    const width = this.scale.width
    this.playerProjectiles = this.playerProjectiles.filter((projectile) => {
      if (projectile.isRocket && projectile.target && !projectile.target.destroyed) {
        const targetX = projectile.target.sprite.x
        const targetY = projectile.target.sprite.y
        const dx = targetX - projectile.sprite.x
        const dy = targetY - projectile.sprite.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 5) {
          // Smooth homing: rotate towards target with a turn rate, then move forward at constant speed.
          const desired = Math.atan2(dy, dx)
          const current = projectile.sprite.rotation || 0
          const turnRate = 0.008 * delta // smaller = smoother
          const newRot = Phaser.Math.Angle.RotateTo(current, desired, turnRate)
          projectile.sprite.rotation = newRot

          const speedMag = 0.22 // world units per ms
          projectile.sprite.x += Math.cos(newRot) * speedMag * delta
          projectile.sprite.y += Math.sin(newRot) * speedMag * delta
          if (projectile.glow) {
            projectile.glow.x = projectile.sprite.x
            projectile.glow.y = projectile.sprite.y
            projectile.glow.rotation = projectile.sprite.rotation
          }
          if (projectile.thrustFlame && projectile.thrustCore) {
            const thrustOffsetX = Math.cos(projectile.sprite.rotation + Math.PI) * 8
            const thrustOffsetY = Math.sin(projectile.sprite.rotation + Math.PI) * 8
            projectile.thrustFlame.x = projectile.sprite.x + thrustOffsetX
            projectile.thrustFlame.y = projectile.sprite.y + thrustOffsetY
            projectile.thrustFlame.rotation = projectile.sprite.rotation + Math.PI
            projectile.thrustCore.x = projectile.sprite.x + thrustOffsetX
            projectile.thrustCore.y = projectile.sprite.y + thrustOffsetY
            projectile.thrustCore.rotation = projectile.sprite.rotation + Math.PI
          }
        } else {
          projectile.sprite.x += delta * projectile.speed
          if (projectile.glow) {
            projectile.glow.x = projectile.sprite.x
            projectile.glow.y = projectile.sprite.y
          }
          if (projectile.outerGlow) {
            projectile.outerGlow.x = projectile.sprite.x
            projectile.outerGlow.y = projectile.sprite.y
          }
          if (projectile.thrustFlame && projectile.thrustCore) {
            projectile.thrustFlame.x = projectile.sprite.x + 8
            projectile.thrustFlame.y = projectile.sprite.y
            projectile.thrustFlame.rotation = Math.PI
            projectile.thrustCore.x = projectile.sprite.x + 8
            projectile.thrustCore.y = projectile.sprite.y
            projectile.thrustCore.rotation = Math.PI
          }
        }
      } else {
        projectile.sprite.x += delta * projectile.speed
        if (projectile.glow) {
          projectile.glow.x = projectile.sprite.x
          projectile.glow.y = projectile.sprite.y
        }
        if (projectile.outerGlow) {
          projectile.outerGlow.x = projectile.sprite.x
          projectile.outerGlow.y = projectile.sprite.y
        }
        if (projectile.thrustFlame && projectile.thrustCore) {
          projectile.thrustFlame.x = projectile.sprite.x + 8
          projectile.thrustFlame.y = projectile.sprite.y
          projectile.thrustFlame.rotation = Math.PI
          projectile.thrustCore.x = projectile.sprite.x + 8
          projectile.thrustCore.y = projectile.sprite.y
          projectile.thrustCore.rotation = Math.PI
        }
        if (projectile.isRocket && (!projectile.target || projectile.target.destroyed)) {
          projectile.target = this.findNearestEnemy(projectile.sprite.x, projectile.sprite.y)
        }
      }
      const hit = this.tryProjectileHit(projectile)
      if (hit || projectile.sprite.x < -60 || projectile.sprite.x > width + 60) {
        projectile.sprite.destroy()
        if (projectile.glow) {
          projectile.glow.destroy()
        }
        if (projectile.outerGlow) {
          projectile.outerGlow.destroy()
        }
        if (projectile.thrustFlame) {
          projectile.thrustFlame.destroy()
        }
        if (projectile.thrustCore) {
          projectile.thrustCore.destroy()
        }
        return false
      }
      return true
    })

    this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => {
      projectile.sprite.x += delta * projectile.speed
      if (projectile.glow) {
        projectile.glow.x = projectile.sprite.x
        projectile.glow.y = projectile.sprite.y
      }
      if (this.tryEnemyProjectileHit(projectile)) {
        projectile.sprite.destroy()
        if (projectile.glow) {
          projectile.glow.destroy()
        }
        return false
      }
      if (projectile.sprite.x > width + 40) {
        projectile.sprite.destroy()
        if (projectile.glow) {
          projectile.glow.destroy()
        }
        return false
      }
      return true
    })
  }

  tryProjectileHit(projectile) {
    for (const entry of this.placeholderPool) {
      if (!entry || entry.destroyed || entry.type === 'powerup') continue
      const dist = Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, entry.sprite.x, entry.sprite.y)
      if (dist < 20) {
        entry.health -= projectile.damage
        if (entry.health <= 0) {
          const baseScore = entry.type === 'ghost' ? 75 : 100
          this.playerScore += baseScore * this.comboValue
          this.comboValue += 1
          this.createExplosion(entry.sprite.x, entry.sprite.y, 0x84f0ff)
          this.destroyPlaceholder(entry, 0x84f0ff)
          this.syncHudStatus()
        }
        return true
      }
    }
    return false
  }

  tryEnemyProjectileHit(projectile) {
    // Skip enemy projectile hits if cheat is enabled
    if (this.enemyCollisionsDisabled) return false
    
    if (!this.playerSprite) return false
    const dist = Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, this.playerSprite.x, this.playerSprite.y)
    if (dist < 24) {
      this.createExplosion(projectile.sprite.x, projectile.sprite.y, 0xff6b6b, 0.5)
      this.playerDamage(projectile.damage)
      return true
    }
    return false
  }

  playerDamage(amount) {
    let finalDamage = amount
    if (this.activePowerup === 'shield') {
      finalDamage *= 0.4
    }
    this.playerHealth = Math.max(0, this.playerHealth - finalDamage)
    this.playCue('hit')
    this.syncHudStatus()
    if (this.playerHealth <= 0) {
      this.handlePlayerDefeat()
    }
  }

  handlePlayerDefeat() {
    if (this.playerSprite) {
      this.createExplosion(this.playerSprite.x, this.playerSprite.y, 0xff0000, 1.2)
    }
    this.addFlash(0xff0000)
    this.syncHudStatus()
    
    setTimeout(() => {
      if (window.sidSurfer?.game) {
        const composerIndex = window.activeComposerIndex ?? 0
        this.scene.pause()
        this.scene.stop()
        if (window.sidPlayer) {
          window.sidPlayer.stop().catch(console.error)
        }
        window.sidSurfer.game.scene.start('GameOverScene', {
          score: this.playerScore,
          composerReached: composerIndex + 1,
          composerName: this.composerName,
        })
      }
    }, 1500)
  }

  syncHudStatus() {
    const remaining = this.activePowerup ? Math.max(0, this.powerupExpiresAt - this.time.now) : 0
    window.sidSurferHud?.updateStatus?.({
      score: this.playerScore,
      health: this.playerHealth,
      maxHealth: this.playerMaxHealth,
      powerup: this.activePowerup,
      powerupTime: remaining,
      trick: this.trickMeter,
      bossHealth: this.bossHealth,
      bossMaxHealth: this.bossActive ? this.bossMaxHealth : 0,
    })
  }

  handleLevelIntro(payload = {}) {
    const title = payload.title ?? ''
    if (!title) return
    const { width, height } = this.scale
    if (!this.levelIntroLabel) {
      this.levelIntroLabel = this.add
        .text(width / 2, height * 0.15, title, {
          fontFamily: 'Orbitron, Rajdhani, monospace',
          fontSize: '32px',
          color: '#ffe66d',
        })
        .setOrigin(0.5)
        .setAlpha(0)
    } else {
      this.levelIntroLabel.setText(title)
    }
    this.levelIntroLabel.setAlpha(0)
    this.levelIntroLabel.setScale(0.7)
    this.tweens.killTweensOf(this.levelIntroLabel)
    this.tweens.add({
      targets: this.levelIntroLabel,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.7, to: 1 },
      duration: 700,
      ease: 'Quad.Out',
      yoyo: true,
      hold: 1000,
    })
  }

  showLaneTrackAnnouncement() {
    const currentTrack = this.playlist[Math.min(this.currentLane, this.playlist.length - 1)]
    if (!currentTrack) return
    const title = currentTrack.name ?? currentTrack.path?.split('/').pop() ?? 'SID Track'
    const author = currentTrack.author ?? this.composerName ?? 'Unknown'
    const yearSuffix = currentTrack.year ? ` · ${currentTrack.year}` : ''
    const message = `${title} · ${author}${yearSuffix}`
    const { width, height } = this.scale
    if (!this.trackAnnouncementLabel) {
      this.trackAnnouncementLabel = this.add
        .text(width / 2, height - 80, message, {
          fontFamily: 'Orbitron, Rajdhani, monospace',
          fontSize: '22px',
          color: '#84f0ff',
        })
        .setOrigin(0.5)
        .setAlpha(0)
    } else {
      this.trackAnnouncementLabel.setText(message)
    }
    this.trackAnnouncementLabel.setAlpha(0)
    this.trackAnnouncementLabel.setScale(0.85)
    this.tweens.killTweensOf(this.trackAnnouncementLabel)
    this.tweens.add({
      targets: this.trackAnnouncementLabel,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.85, to: 1 },
      duration: 450,
      ease: 'Quad.Out',
      yoyo: true,
      hold: 1200,
    })
  }

  handleTrackAnnouncement(payload = {}) {
    const title = payload.title ?? 'SID Track'
    const author = payload.author ?? 'Unknown'
    const yearSuffix = payload.year ? ` · ${payload.year}` : ''
    const message = `${title} · ${author}${yearSuffix}`
    const { width, height } = this.scale
    if (!this.trackAnnouncementLabel) {
      this.trackAnnouncementLabel = this.add
        .text(width / 2, height - 80, message, {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '22px',
          color: '#84f0ff',
        })
        .setOrigin(0.5)
        .setAlpha(0)
    } else {
      this.trackAnnouncementLabel.setText(message)
    }
    this.trackAnnouncementLabel.setAlpha(0)
    this.trackAnnouncementLabel.setScale(0.85)
    this.tweens.killTweensOf(this.trackAnnouncementLabel)
    this.tweens.add({
      targets: this.trackAnnouncementLabel,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.85, to: 1 },
      duration: 450,
      ease: 'Quad.Out',
      yoyo: true,
      hold: 1200,
    })
  }

  sampleWaveY(laneIndex, x) {
    const wave = this.waveDefs[laneIndex]
    if (!wave) {
      return this.scale.height * 0.2 + laneIndex * 80
    }
    const points = wave.cachedPoints
    if (!points?.length) {
      return this.scale.height * 0.2 + laneIndex * 80
    }
    const width = this.scale.width
    const wrappedX = Phaser.Math.Wrap(x, 0, width)
    const idx = Math.min(points.length - 1, Math.floor((wrappedX / width) * points.length))
    return points[idx].y
  }

  getWaveInfo(laneIndex, x) {
    const wave = this.waveDefs[laneIndex]
    if (!wave) {
      const fallbackY = this.scale.height * 0.2 + laneIndex * 80
      return { y: fallbackY, slope: 0 }
    }
    const points = wave.cachedPoints
    if (!points?.length) {
      const fallbackY = this.scale.height * 0.2 + laneIndex * 80
      return { y: fallbackY, slope: 0 }
    }
    const width = this.scale.width
    const wrappedX = Phaser.Math.Wrap(x, 0, width)
    const idx = Math.min(points.length - 1, Math.floor((wrappedX / width) * points.length))
    const point = points[idx]
    if (!point) {
      const fallbackY = this.scale.height * 0.2 + laneIndex * 80
      return { y: fallbackY, slope: 0 }
    }
    const nextIdx = Math.min(points.length - 1, idx + 1)
    const nextPoint = points[nextIdx]
    const dx = nextPoint.x - point.x
    const dy = nextPoint.y - point.y
    const slope = Math.atan2(dy, dx)
    return { y: point.y, slope }
  }

  drawWave(width, height, wave, delta, index, freqBuckets, analyserLevelValue) {
    const graphics = this.waveGraphics
    const yBase = height * 0.2 + index * 80
    const amplitudeBase = wave.amplitude
    const frequency = wave.frequency
    const turbulence = wave.turbulence
    const speed = wave.speed
    const isActive = index === this.currentLane
    const analyserLevel = isActive ? analyserLevelValue ?? 0 : 0
    const easedLevel = (wave.visualLevel = Phaser.Math.Linear(
      wave.visualLevel ?? 0,
      analyserLevel,
      isActive ? 0.2 : 0.08,
    ))
    const amplitude =
      isActive ? amplitudeBase * (1 + easedLevel * 2.8) : amplitudeBase * 0.4

    wave.phase = (wave.phase ?? 0) + speed * 0.00004 * delta
    wave.turbulencePhase = (wave.turbulencePhase ?? 0) + 0.0005 * delta

    const baseColor = Phaser.Display.Color.ValueToColor(wave.color)
    const tone = isActive ? baseColor.clone().lighten(25) : baseColor.clone().darken(15)
    const strokeColor = tone.color
    const strokeAlpha = isActive ? 0.95 : 0.35
    const strokeWidth = isActive ? 12 : 3

    const buckets = freqBuckets ?? []
    const points = []
    for (let x = 0; x <= width; x += 3) {
      const scrollX = x + this.waveScroll
      const bucketIndex = buckets.length
        ? Math.min(buckets.length - 1, Math.floor((scrollX / width) * buckets.length))
        : 0
      const spectralValue = buckets.length ? buckets[bucketIndex] ?? 0 : 0
      const wavePhase = wave.phase + scrollX * frequency * (1 + easedLevel * 0.45)
      const turbulenceOffset =
        Math.sin(scrollX * 0.03 + wave.turbulencePhase) * (turbulence + easedLevel * 22 + spectralValue * 28)
      const y =
        yBase +
        Math.sin(wavePhase) * (amplitude + spectralValue * amplitudeBase * (isActive ? 1.2 : 0.4)) +
        turbulenceOffset +
        spectralValue * (isActive ? 12 : 4)
      points.push(new Phaser.Geom.Point(x, y))
    }
    wave.cachedPoints = points

    graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha)
    graphics.beginPath()
    points.forEach((point, idx) => {
      if (idx === 0) {
        graphics.moveTo(point.x, point.y)
      } else {
        graphics.lineTo(point.x, point.y)
      }
    })
    graphics.strokePath()

    if (isActive) {
      const glowColor = baseColor.clone().saturate(30).brighten(20).color
      graphics.lineStyle(3, glowColor, 0.85)
      graphics.beginPath()
      points.forEach((point, idx) => {
        if (idx === 0) {
          graphics.moveTo(point.x, point.y)
        } else {
          graphics.lineTo(point.x, point.y)
        }
      })
      graphics.strokePath()
      for (let ghost = 1; ghost <= 3; ghost++) {
        const ghostPoints = points.map((p) => new Phaser.Geom.Point(p.x, p.y + ghost * 10))
        graphics.lineStyle(Math.max(2, strokeWidth - ghost * 2), glowColor, 0.2 / ghost)
        graphics.beginPath()
        ghostPoints.forEach((point, idx) => {
          if (idx === 0) {
            graphics.moveTo(point.x, point.y)
          } else {
            graphics.lineTo(point.x, point.y)
          }
        })
        graphics.strokePath()
      }
    }
  }

  drawBackground(width, height) {
    const bg = this.background
    bg.clear()
    bg.fillGradientStyle(0x1b0650, 0x3a0ca3, 0x062449, 0x04132b, 1)
    bg.fillRect(0, 0, width, height * 0.6)
    bg.fillGradientStyle(0x041a2b, 0x072b3f, 0x01060f, 0x01060f, 1)
    bg.fillRect(0, height * 0.6, width, height * 0.4)
  }

  createWaveSet(count) {
    if (!count) {
      return this.createDefaultWaves()
    }
    return Array.from({ length: count }, (_, i) => ({
      amplitude: 50 + (i % 3) * 25,
      frequency: 0.004 + (i * 0.0015) % 0.007,
      speed: 25 + (i % 5) * 6,
      turbulence: 12 + (i % 3) * 4,
      color: COLORS[i % COLORS.length],
    }))
  }

  createDefaultWaves() {
    return Array.from({ length: 5 }, (_, i) => ({
      amplitude: Phaser.Math.Between(60, 110),
      frequency: Phaser.Math.FloatBetween(0.004, 0.01),
      speed: Phaser.Math.Between(25, 48),
      turbulence: Phaser.Math.Between(10, 18),
      color: COLORS[i % COLORS.length],
    }))
  }

  startBossFight() {
    if (this.bossActive) return
    this.bossActive = true
    this.bossHealth = this.bossMaxHealth
    this.bossLane = this.currentLane
    this.bossDroneCooldown = 0 // Initialize drone cooldown
    const { width, height } = this.scale
    this.bossX = -80

    const timerEl = document.querySelector('#level-timer')
    if (timerEl) {
      timerEl.textContent = 'BOSS FIGHT!'
      timerEl.classList.add('boss-fight')
    }

    this.spawnTimer?.remove()
    this.placeholderPool.forEach((entry) => {
      if (entry && !entry.destroyed) {
        entry.sprite.destroy()
      }
    })
    this.placeholderPool = []

    // Use boss sprite image if available, otherwise fallback to rectangle
    if (this.textures.exists('boss')) {
      this.bossSprite = this.add.image(this.bossX, height * 0.2 + this.bossLane * 80, 'boss')
      this.bossSprite.setDisplaySize(120, 120) // Make boss bigger
      this.bossSprite.setOrigin(0.5, 0.5) // Ensure rotation is centered
      // No red tint - use original sprite colors
    } else {
      this.bossSprite = this.add.rectangle(this.bossX, height * 0.2 + this.bossLane * 80, 120, 120, 0xff0000, 1)
      this.bossSprite.setStrokeStyle(3, 0xff4444, 1)
      this.bossSprite.setBlendMode(Phaser.BlendModes.ADD)
    }

    this.bossGlow = this.add.circle(this.bossX, height * 0.2 + this.bossLane * 80, 80, 0xff0000, 0.3) // Bigger glow for bigger boss
    this.bossGlow.setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: this.bossGlow,
      alpha: { from: 0.3, to: 0.6 },
      scale: { from: 0.9, to: 1.1 },
      duration: 500,
      ease: 'Sine.InOut',
      repeat: -1,
      yoyo: true,
    })

    this.tweens.add({
      targets: [this.bossSprite, this.bossGlow],
      x: width * 0.2,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        this.bossX = width * 0.2
      },
    })
  }

  updateBoss(delta, time) {
    if (!this.bossActive || !this.bossSprite) return
    const { width, height } = this.scale

    if (this.bossLane !== this.currentLane) {
      this.bossLane = this.currentLane
      const targetY = height * 0.2 + this.bossLane * 80
      this.tweens.add({
        targets: [this.bossSprite, this.bossGlow],
        y: targetY,
        duration: 400,
        ease: 'Power2',
      })
    }

    const waveY = this.sampleWaveY(this.bossLane, this.bossX)
    const targetY = waveY
    this.bossSprite.y = Phaser.Math.Linear(this.bossSprite.y, targetY, 0.1)
    
    // Boss rotation - faster as health decreases
    const healthPercent = this.bossHealth / this.bossMaxHealth
    const baseRotationSpeed = 0.01 // Slow rotation at full health
    const maxRotationSpeed = 0.08 // Fast rotation at low health
    const rotationSpeed = baseRotationSpeed + (1 - healthPercent) * (maxRotationSpeed - baseRotationSpeed)
    this.bossSprite.rotation += rotationSpeed * delta
    
    if (this.bossGlow) {
      this.bossGlow.x = this.bossSprite.x
      this.bossGlow.y = this.bossSprite.y
    }

    this.bossFireCooldown -= delta
    if (this.bossFireCooldown <= 0) {
      this.fireBossProjectile()
      this.bossFireCooldown = Phaser.Math.Between(400, 800)
    }

    const bossHealthPercent = (this.bossHealth / this.bossMaxHealth) * 100
    if (bossHealthPercent <= 50) {
      // Initialize cooldown if not set
      if (this.bossDroneCooldown === undefined || this.bossDroneCooldown === null) {
        this.bossDroneCooldown = 0
      }
      
      this.bossDroneCooldown -= delta
      if (this.bossDroneCooldown <= 0) {
        console.log(`[Boss] Launching drone at ${bossHealthPercent.toFixed(1)}% health`)
        this.launchBossDrone()
        // More frequent drones in final phase
        this.bossDroneCooldown = Phaser.Math.Between(1500, 2500)
      }
    }

    this.bossDrones = this.bossDrones.filter((drone) => {
      if (!drone.sprite || drone.sprite.destroyed || !this.playerSprite) {
        console.log('[Boss] Filtering out drone: sprite missing or destroyed')
        return false
      }
      
      const dx = this.playerSprite.x - drone.sprite.x
      const dy = this.playerSprite.y - drone.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      // Normalize direction vector for consistent movement
      const dirX = dx / dist
      const dirY = dy / dist
      
      // Move towards player - drones should move RIGHT (positive X) to reach player
      const moveSpeed = 0.2 // Speed towards player
      drone.sprite.x += dirX * moveSpeed * delta
      drone.sprite.y += dirY * moveSpeed * delta
      
      // Update drone rotation to face movement direction
      const angle = Math.atan2(dy, dx)
      drone.sprite.rotation = angle
      
      // Debug: log movement occasionally
      if (Math.random() < 0.01) { // 1% chance per frame
        console.log(`[Boss] Drone moving: dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)}, dirX=${dirX.toFixed(2)}, speed=${(dirX * moveSpeed * delta).toFixed(3)}`)
      }
      
      if (dist < 30) {
        console.log('[Boss] Drone hit player at distance:', dist)
        this.createExplosion(drone.sprite.x, drone.sprite.y, 0xff6600)
        drone.sprite.destroy()
        // Skip drone damage if cheat is enabled
        if (!this.enemyCollisionsDisabled) {
          this.playerDamage(20)
        }
        return false
      }
      
      // Only destroy if way off screen
      if (drone.sprite.x > width + 100 || drone.sprite.x < -100 || drone.sprite.y < -100 || drone.sprite.y > height + 100) {
        console.log('[Boss] Drone went off screen, destroying')
        drone.sprite.destroy()
        return false
      }
      
      return true
    })

    this.bossProjectiles = this.bossProjectiles.filter((proj) => {
      proj.sprite.x += delta * proj.speed
      if (proj.glow) {
        proj.glow.x = proj.sprite.x
        proj.glow.y = proj.sprite.y
      }
      if (this.tryBossProjectileHit(proj)) {
        proj.sprite.destroy()
        if (proj.glow) {
          proj.glow.destroy()
        }
        return false
      }
      if (proj.sprite.x > width + 40) {
        proj.sprite.destroy()
        if (proj.glow) {
          proj.glow.destroy()
        }
        return false
      }
      return true
    })

    for (const projectile of this.playerProjectiles) {
      // Larger hitbox for bigger boss
      if (!projectile.sprite || projectile.sprite.x < this.bossX - 60 || projectile.sprite.x > this.bossX + 60) continue
      if (!projectile.sprite || projectile.sprite.y < this.bossSprite.y - 60 || projectile.sprite.y > this.bossSprite.y + 60) continue
      const dist = Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, this.bossSprite.x, this.bossSprite.y)
      if (dist < 60) {
        // Boss takes reduced damage to make it harder
        this.bossHealth -= Math.max(1, Math.floor(projectile.damage * 0.5))
        projectile.sprite.destroy()
        if (projectile.glow) projectile.glow.destroy()
        if (projectile.outerGlow) projectile.outerGlow.destroy()
        if (projectile.thrustFlame) projectile.thrustFlame.destroy()
        if (projectile.thrustCore) projectile.thrustCore.destroy()
        this.createExplosion(projectile.sprite.x, projectile.sprite.y, 0xff0000, 0.6)
        if (this.bossHealth <= 0) {
          this.defeatBoss()
        }
      }
    }
  }

  fireBossProjectile() {
    if (!this.bossSprite) return
    const baseColor = 0xff6b6b
    const sprite = this.add.rectangle(this.bossSprite.x + 30, this.bossSprite.y, 20, 6, baseColor, 1)
    sprite.setAlpha(0.9)
    sprite.setBlendMode(Phaser.BlendModes.ADD)

    const glow = this.add.rectangle(this.bossSprite.x + 30, this.bossSprite.y, 24, 10, baseColor, 0.4)
    glow.setBlendMode(Phaser.BlendModes.ADD)
    glow.setAlpha(0.5)

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 0.1 },
      scale: { from: 1, to: 1.4 },
      duration: 250,
      ease: 'Quad.Out',
    })

    this.bossProjectiles.push({
      sprite,
      glow,
      speed: 0.35,
      damage: 15,
    })
    this.playCue('enemyFire')
  }

  tryBossProjectileHit(projectile) {
    // Skip boss projectile hits if cheat is enabled
    if (this.enemyCollisionsDisabled) return false
    
    if (!this.playerSprite) return false
    const dist = Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, this.playerSprite.x, this.playerSprite.y)
    if (dist < 24) {
      this.playerDamage(projectile.damage)
      return true
    }
    return false
  }

  launchBossDrone() {
    if (!this.bossSprite) {
      console.warn('[Boss] Cannot launch drone: bossSprite missing')
      return
    }
    if (!this.playerSprite) {
      console.warn('[Boss] Cannot launch drone: playerSprite missing')
      return
    }
    
    console.log('[Boss] Launching drone from boss position:', this.bossSprite.x, this.bossSprite.y)
    
    // Use drone sprite if available, otherwise create a visible placeholder
    let drone
    if (this.textures.exists('drone')) {
      drone = this.add.image(this.bossSprite.x, this.bossSprite.y, 'drone')
      drone.setDisplaySize(32, 32) // Make drones bigger and more visible
      console.log('[Boss] Using drone sprite image')
    } else {
      // Fallback: create a visible circle if drone sprite missing
      drone = this.add.circle(this.bossSprite.x, this.bossSprite.y, 16, 0xff0000, 1)
      console.log('[Boss] Using fallback circle for drone')
    }
    // No red tint - use original sprite colors
    drone.setBlendMode(Phaser.BlendModes.ADD)
    drone.setAlpha(1.0) // Fully visible
    
    this.tweens.add({
      targets: drone,
      rotation: { from: 0, to: Math.PI * 2 },
      duration: 800,
      repeat: -1,
      ease: 'Linear',
    })
    
    this.bossDrones.push({
      sprite: drone,
      speed: 0.15, // Slightly faster base speed
    })
    
    console.log('[Boss] Drone launched, total drones:', this.bossDrones.length)
    console.log('[Boss] Drone position:', drone.x, drone.y, 'Player position:', this.playerSprite.x, this.playerSprite.y)
  }

  createExplosion(x, y, color = 0xff6600, scale = 1.0) {
    this.playCue('explosion')
    
    const baseSize = 20 * scale
    const particles = []
    
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const particle = this.add.circle(x, y, 4 * scale, color, 1)
      particle.setBlendMode(Phaser.BlendModes.ADD)
      particle.setAlpha(1)
      
      const distance = baseSize + Phaser.Math.Between(0, baseSize)
      const targetX = x + Math.cos(angle) * distance
      const targetY = y + Math.sin(angle) * distance
      
      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0 },
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => {
          particle.destroy()
        },
      })
      
      particles.push(particle)
    }
    
    const core = this.add.circle(x, y, baseSize, color, 1)
    core.setBlendMode(Phaser.BlendModes.ADD)
    core.setAlpha(1)
    
    this.tweens.add({
      targets: core,
      scale: { from: 0, to: 2 },
      alpha: { from: 1, to: 0 },
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        core.destroy()
      },
    })
    
    const outerRing = this.add.circle(x, y, baseSize * 0.5, color, 0.6)
    outerRing.setBlendMode(Phaser.BlendModes.ADD)
    outerRing.setAlpha(0.8)
    
    this.tweens.add({
      targets: outerRing,
      scale: { from: 0.5, to: 3 },
      alpha: { from: 0.8, to: 0 },
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        outerRing.destroy()
      },
    })
  }

  defeatBoss() {
    this.bossActive = false
    const bossX = this.bossSprite ? this.bossSprite.x : 0
    const bossY = this.bossSprite ? this.bossSprite.y : 0
    
    if (this.bossSprite) {
      this.bossSprite.destroy()
    }
    if (this.bossGlow) {
      this.bossGlow.destroy()
    }
    this.bossProjectiles.forEach((proj) => {
      proj.sprite.destroy()
      if (proj.glow) proj.glow.destroy()
    })
    this.bossProjectiles = []
    
    this.bossDrones.forEach((drone) => {
      if (drone.sprite) {
        drone.sprite.destroy()
      }
    })
    this.bossDrones = []

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offsetX = Phaser.Math.Between(-30, 30)
        const offsetY = Phaser.Math.Between(-30, 30)
        this.createExplosion(bossX + offsetX, bossY + offsetY, 0xff0000, 1.5)
      }, i * 150)
    }

    const timerEl = document.querySelector('#level-timer')
    if (timerEl) {
      timerEl.classList.remove('boss-fight')
      timerEl.textContent = '--:--'
    }

    this.playerScore += 5000
    this.addFlash(0x50fa7b)
    this.syncHudStatus()

    setTimeout(() => {
      if (window.advanceComposer) {
        window.advanceComposer(1)
      }
    }, 3000)
  }
}

