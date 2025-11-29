import './style.css'
import Phaser from 'phaser'
import { InlineSIDPlayer } from './audio/websid/InlineSIDPlayer.js'
import { WaveScene } from './scenes/WaveScene.js'
import { ComposerProfileScene } from './scenes/ComposerProfileScene.js'
import { GameOverScene } from './scenes/GameOverScene.js'
import { HighScoresScene } from './scenes/HighScoresScene.js'
import { NameEntryScene } from './scenes/NameEntryScene.js'

const LEVEL_DURATION_MS = 2 * 60 * 1000
const LEVEL_PREFIXES = ['LEVEL ONE', 'LEVEL TWO', 'LEVEL THREE', 'LEVEL FOUR', 'LEVEL FIVE']
const AUDIO_CUE_PATHS = {
  powerupShield: './audio/cues/powerup-shield.mp3',
  powerupRockets: './audio/cues/powerup-rockets.mp3',
  powerupHeal: './audio/cues/powerup-heal.mp3',
  playerFire: './audio/cues/player-fire.mp3',
  enemyFire: './audio/cues/enemy-fire.mp3',
  hit: './audio/cues/hit.mp3',
  explosion: './audio/cues/explosion.mp3',
  trick1: './audio/cues/trick-1.mp3',
  trick2: './audio/cues/trick-2.mp3',
  trick3: './audio/cues/trick-3.mp3',
  trickRadical: './audio/cues/trick-radical.mp3',
  trickAwesomesauce: './audio/cues/trick-awesomesauce.mp3',
  trickAmazeballs: './audio/cues/trick-amazeballs.mp3',
  trickBogus: './audio/cues/trick-bogus.mp3',
  trickBoogie: './audio/cues/trick-boogie.mp3',
  trickYeah: './audio/cues/trick-yeah.mp3',
  theme1: './audio/theme01.mp3',
  theme2: './audio/theme02.mp3',
  theme3: './audio/theme03.mp3',
  theme4: './audio/theme04.mp3',
  theme5: './audio/theme05.mp3',
}
const audioCueCache = {}

const appContainer = document.querySelector('#app')
const hud = document.createElement('section')
hud.className = 'hud'
hud.innerHTML = `
  <div class="hud-line">
    <span class="hud-level" id="level-title">Booting SID Surfer…</span>
    <span class="hud-timer" id="level-timer">--:--</span>
    <div class="hud-bar-group" id="boss-health-group" style="display: none;">
      <label>BOSS</label>
      <div class="glow-bar">
        <div class="glow-bar__fill glow-bar__fill--boss" id="boss-health-bar"></div>
        <div class="glow-bar__glow glow-bar__glow--boss"></div>
      </div>
    </div>
  </div>
  <div class="hud-line hud-line--status">
    <span>Score <strong id="hud-score">0</strong></span>
    <div class="hud-bar-group">
      <label>HEALTH</label>
      <div class="glow-bar">
        <div class="glow-bar__fill glow-bar__fill--health" id="hud-health-bar"></div>
        <div class="glow-bar__glow glow-bar__glow--health"></div>
      </div>
    </div>
    <span>Power <strong id="hud-power">None</strong></span>
    <span>Duration <strong id="hud-power-time">--</strong></span>
    <div class="hud-bar-group">
      <label>Trick</label>
      <div class="glow-bar">
        <div class="glow-bar__fill glow-bar__fill--trick" id="hud-trick-bar"></div>
        <div class="glow-bar__glow glow-bar__glow--trick"></div>
      </div>
    </div>
  </div>
`
appContainer.appendChild(hud)

const canvasContainer = document.createElement('div')
canvasContainer.className = 'canvas-wrap'
canvasContainer.id = 'phaser-target'
appContainer.appendChild(canvasContainer)

const containerWidth = canvasContainer.clientWidth || window.innerWidth - 48 || 1024
const containerHeight = 800

const levelTitleEl = hud.querySelector('#level-title')
const timerEl = hud.querySelector('#level-timer')
const hudScoreEl = hud.querySelector('#hud-score')
const bossHealthBarEl = hud.querySelector('#boss-health-bar')
const bossHealthGroupEl = hud.querySelector('#boss-health-group')
const hudHealthBarEl = hud.querySelector('#hud-health-bar')
const hudTrickBarEl = hud.querySelector('#hud-trick-bar')
const hudPowerEl = hud.querySelector('#hud-power')
const hudPowerTimeEl = hud.querySelector('#hud-power-time')

const waveState = {
  playlist: [],
  composerName: '',
  composerId: null,
}

const sidPlayer = new InlineSIDPlayer({
  onTrackStart: (track) => {
    handleTrackStart(track)
  },
  onPlaylistEnd: () => {
    advanceComposer(1)
  },
  onError: (error) => {
    console.error('[SID Surfer] SID error', error)
  },
})

let composerManifest = []
let manifestLoaded = false
let activeComposerIndex = 0
let levelTimerId = null
let levelTimeRemaining = LEVEL_DURATION_MS
let activeComposer = null
function updateHudStatus({ score = 0, health = 0, maxHealth = 100, powerup = null, powerupTime = 0, trick = 0, bossHealth = 0, bossMaxHealth = 0 } = {}) {
  if (hudScoreEl) {
    hudScoreEl.textContent = typeof score === 'number' ? score.toLocaleString() : '0'
  }
  if (hudHealthBarEl) {
    const percent = typeof health === 'number' && typeof maxHealth === 'number' && maxHealth > 0
      ? Math.max(0, Math.min(100, (health / maxHealth) * 100))
      : 0
    hudHealthBarEl.style.width = `${percent}%`
  }
  if (hudTrickBarEl) {
    const percent = Math.max(0, Math.min(100, trick ?? 0))
    hudTrickBarEl.style.width = `${percent}%`
  }
  if (hudPowerEl) {
    hudPowerEl.textContent = powerup ? powerup.toUpperCase() : 'None'
  }
  if (hudPowerTimeEl) {
    hudPowerTimeEl.textContent =
      powerup && powerupTime
        ? `${Math.max(0, Math.floor(powerupTime / 1000))}s`
        : '--'
  }
  if (bossHealthBarEl && bossHealthGroupEl) {
    if (bossMaxHealth > 0) {
      bossHealthGroupEl.style.display = 'flex'
      const percent = typeof bossHealth === 'number' && typeof bossMaxHealth === 'number' && bossMaxHealth > 0
        ? Math.max(0, Math.min(100, (bossHealth / bossMaxHealth) * 100))
        : 0
      bossHealthBarEl.style.width = `${percent}%`
    } else {
      bossHealthGroupEl.style.display = 'none'
    }
  }
}

window.sidSurferHud = {
  updateStatus: updateHudStatus,
}
updateHudStatus()

function getAudioElement(name) {
  if (!AUDIO_CUE_PATHS[name]) {
    return null
  }
  if (!audioCueCache[name]) {
    const audio = new Audio(AUDIO_CUE_PATHS[name])
    // Reduce volume - player-fire is especially loud
    if (name === 'playerFire') {
      audio.volume = 0.15 // Much quieter for laser SFX
    } else {
      audio.volume = 0.5 // Reduced from 0.8 for other cues
    }
    audioCueCache[name] = audio
  }
  return audioCueCache[name]
}

function playAudioCue(name) {
  const audio = getAudioElement(name)
  if (!audio) return
  try {
    audio.currentTime = 0
    void audio.play()
  } catch (error) {
    console.warn('[SID Surfer] Failed to play audio cue', name, error)
  }
}

window.sidSurferAudio = {
  playCue: playAudioCue,
}

async function loadManifest() {
  try {
    const response = await fetch('./sid/manifest.json')
    const json = await response.json()
    composerManifest = json.composers ?? []
    manifestLoaded = true
    if (composerManifest.length === 0) {
      levelTitleEl.textContent = 'No composers in manifest'
      return
    }
  } catch (error) {
    console.error('Failed to load manifest', error)
    levelTitleEl.textContent = 'Manifest load failed'
  }
}

function emitWaveEvent(event, payload) {
  if (window.sidSurfer?.game) {
    window.sidSurfer.game.events.emit(event, payload)
  }
}

function pushWaveState() {
  emitWaveEvent('wave:playlist', { ...waveState })
}

async function startComposerLevel(index, skipProfile = false) {
  if (!manifestLoaded || !composerManifest.length) {
    return
  }
  const safeIndex = ((index % composerManifest.length) + composerManifest.length) % composerManifest.length
  activeComposerIndex = safeIndex
  const composer = composerManifest[safeIndex]
  activeComposer = composer
  const playlist = composer?.tracks ?? []
  if (!playlist.length) {
    console.warn(`${composer?.name ?? 'Composer'} has no tracks`)
    advanceComposer(1)
    return
  }

  waveState.playlist = playlist
  waveState.composerName = composer?.name ?? 'Wave Set'
  waveState.composerId = composer?.id ?? null
  pushWaveState()
  announceLevel(composer)

  if (!skipProfile && window.sidSurfer?.game) {
    window.sidSurfer.game.scene.start('ComposerProfileScene', {
      composer,
      composerId: composer?.id ?? null,
    })
    return
  }

  try {
    await sidPlayer.setTracks(playlist, 0)
    await sidPlayer.play()
    resetLevelTimer()
  } catch (error) {
    console.error('[SID Surfer] Failed to start composer', error)
    advanceComposer(1)
  }
}

window.startComposerLevel = startComposerLevel
window.pushWaveState = pushWaveState
window.getWaveState = () => waveState
Object.defineProperty(window, 'activeComposerIndex', {
  get: () => activeComposerIndex,
  configurable: true,
})

function announceLevel(composer) {
  const prefix = LEVEL_PREFIXES[activeComposerIndex] ?? `LEVEL ${activeComposerIndex + 1}`
  const title = `${prefix} · ${composer?.name ?? 'Wave Set'}`
  levelTitleEl.textContent = title
  emitWaveEvent('wave:level', { title })
}

function handleTrackStart(track) {
  const composerName = activeComposer?.name ?? track.author ?? 'Unknown Composer'
  const title = track.name ?? track.path?.split('/').pop() ?? 'SID Track'
  const year = typeof track.year === 'number' ? ` · ${track.year}` : ''
  const author = track.author ?? composerName
  emitWaveEvent('wave:track', {
    title,
    author,
    year: track.year ?? null,
  })
}

function resetLevelTimer() {
  if (levelTimerId) {
    clearInterval(levelTimerId)
  }
  levelTimeRemaining = LEVEL_DURATION_MS
  updateTimerDisplay()
  levelTimerId = window.setInterval(() => {
    levelTimeRemaining -= 1000
    if (levelTimeRemaining <= 0) {
      clearInterval(levelTimerId)
      levelTimerId = null
      emitWaveEvent('wave:boss-fight-start')
    } else {
      updateTimerDisplay()
    }
  }, 1000)
}

function updateTimerDisplay() {
  const minutes = Math.max(0, Math.floor(levelTimeRemaining / 60000))
  const seconds = Math.max(0, Math.floor((levelTimeRemaining % 60000) / 1000))
  timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function advanceComposer(offset = 1) {
  if (!composerManifest.length) return
  startComposerLevel(activeComposerIndex + offset)
}

window.advanceComposer = advanceComposer

loadManifest()

class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' })
  }

  preload() {
    // Title assets (text-only logo; optional dancer sheets)
    // Dancer sprites: 256px per frame, 48 frames
    for (let i = 1; i <= 5; i++) {
      const danceKey = `dance0${i}` // dance01, dance02, etc.
      this.load.spritesheet(danceKey, `./sprites/dance0${i}.png`, { 
        frameWidth: 256, 
        frameHeight: 256
      })
    }
    // Load the 8 circular emblem logos
    this.load.image('logo-1', './logos/SID Surfer Logo 1.jpg')
    this.load.image('logo-2', './logos/SID Surfer Logo 2.jpg')
    this.load.image('logo-3', './logos/SID Surfer Logo 3.jpg')
    this.load.image('logo-4', './logos/SID Surfer Logo 4.jpg')
    this.load.image('logo-5', './logos/SID Surfer Logo 5.jpg')
    this.load.image('logo-8', './logos/SID Surfer Logo 8.jpg')
    this.load.image('logo-9', './logos/SID Surfer Logo 9.jpg')
    this.load.image('logo-10', './logos/SID Surfer Logo 10.jpg')
    this.load.audio('theme1', './audio/theme01.mp3')
    this.load.audio('theme2', './audio/theme02.mp3')
    this.load.audio('theme3', './audio/theme03.mp3')
    this.load.audio('theme4', './audio/theme04.mp3')
    this.load.audio('theme5', './audio/theme05.mp3')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setAlpha(0)

    const hud = document.querySelector('.hud')
    if (hud) {
      hud.style.display = 'none'
    }

    // Simple arcade background (dark fill + subtle grid + scanlines)
    const bg = this.add.graphics()
    bg.fillStyle(0x03030a, 1)
    bg.fillRect(0, 0, width, height)
    const g = this.add.graphics({ x: 0, y: 0 })
    g.lineStyle(1, 0x0f1230, 0.25)
    for (let x = 0; x <= width; x += 24) g.lineBetween(x, 0, x, height)
    for (let y = 0; y <= height; y += 24) g.lineBetween(0, y, width, y)
    const scan = this.add.graphics()
    scan.fillStyle(0x000000, 0.08)
    for (let y = 0; y < height; y += 4) scan.fillRect(0, y, width, 2)

    // Rotating logo carousel with 8 circular emblems
    const logoKeys = ['logo-1', 'logo-2', 'logo-3', 'logo-4', 'logo-5', 'logo-8', 'logo-9', 'logo-10']
    // Shuffle the logo keys for random display order
    const shuffledKeys = Phaser.Utils.Array.Shuffle([...logoKeys])
    const logoX = width / 2
    const logoY = height * 0.15 // Moved to top to avoid overlapping other elements
    this.logoScale = 0.25 // Much smaller logo for better title screen layout
    
    // Create logo sprites (all at same position, we'll fade between them)
    this.logoSprites = []
    shuffledKeys.forEach((key, index) => {
      if (this.textures.exists(key)) {
        const sprite = this.add.image(logoX, logoY, key)
        sprite.setScale(this.logoScale)
        sprite.setOrigin(0.5)
        sprite.setAlpha(index === 0 ? 1 : 0) // Only first one visible
        sprite.setDepth(10)
        this.logoSprites.push(sprite)
      }
    })
    
    // Current logo index
    this.currentLogoIndex = 0
    this.logoRotationTimer = null
    this.logoPulseTween = null
    
    // Start logo rotation
    if (this.logoSprites.length > 0) {
      this.startLogoRotation()
      
      // Continuous pulse effect on active logo
      this.logoPulseTween = this.tweens.add({
        targets: this.logoSprites[0],
        scale: { from: this.logoScale * 0.98, to: this.logoScale * 1.05 },
        duration: 2000,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
    }

    // Byline - aligned with horizontal line in credits panel
    // Calculate position to align with barA (panelY - panelH * 0.35)
    const bylineY = (height * 0.60) - (Math.min(320, height * 0.65) * 0.35)
    const byline = this.add
      .text(width / 2, bylineY, 'BY FUTUREVISION LABS', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '18px',
        color: '#bcd7ff', // Brighter color to match credits text
      })
      .setOrigin(0.5)
    byline.setShadow(0, 0, 12, '#7f5af0', 1, true)

    this.themeTracks = ['theme1', 'theme2', 'theme3', 'theme4', 'theme5']
    this.currentThemeIndex = -1
    this.themeSound = null
    this.playNextTheme()

    const pressText = this.add
      .text(width / 2, height * 0.85, 'Press SPACE to start', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '28px',
        color: '#7f5af0',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 25, '#7f5af0', 1, true)
      .setStroke('#4ecdc4', 3)

    const glowText = this.add
      .text(width / 2, height * 0.85, 'Press SPACE to start', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '28px',
        color: '#7f5af0',
      })
      .setOrigin(0.5)
      .setAlpha(0.4)
      .setBlendMode(Phaser.BlendModes.ADD)

    this.add
      .text(width / 2, height * 0.92, 'Press H for High Scores', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '18px',
        color: '#84f0ff',
      })
      .setOrigin(0.5)
      .setAlpha(0.7)

    this.tweens.add({
      targets: pressText,
      alpha: { from: 0.7, to: 1 },
      scale: { from: 0.96, to: 1.04 },
      duration: 1200,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    this.tweens.add({
      targets: glowText,
      alpha: { from: 0.2, to: 0.6 },
      scale: { from: 0.98, to: 1.06 },
      duration: 1500,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    // Footer tech hint
    this.add
      .text(width / 2, height * 0.89, 'Live SID · Phaser.js', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '14px',
        color: '#7f8c8d',
      })
      .setOrigin(0.5)

    // Static credits panel
    const panelW = Math.min(560, width * 0.8)
    const panelH = Math.min(320, height * 0.65)
    const panelX = width / 2
    const panelY = height * 0.60
    const creditsBg = this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x03030a, 0.92)
      .setStrokeStyle(2, 0x7f5af0, 0.65)
    const creditsTitle = this.add
      .text(panelX, panelY - panelH * 0.45, 'CREDITS', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '20px',
        color: '#7f5af0',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 12, '#7f5af0', 1, true)
    const creditsText = this.add
      .text(
        panelX,
        panelY,
        'CODE & DESIGN: FutureVision Labs\nAUDIO: C64 SID (Tiny’R’Sid)\nENGINE: Phaser 3\nSPECIAL THANKS: Game Off 2025\n',
        {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '18px',
          color: '#bcd7ff',
          align: 'center',
          lineSpacing: 6,
          wordWrap: { width: panelW - 48 },
        }
      )
      .setOrigin(0.5)
    const barA = this.add
      .rectangle(panelX - panelW * 0.35, panelY - panelH * 0.35, 80, 3, 0x7f5af0, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
    const barB = this.add
      .rectangle(panelX + panelW * 0.35, panelY + panelH * 0.35, 80, 3, 0x4ecdc4, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({
      targets: [creditsBg, creditsTitle, creditsText, barA, barB],
      alpha: { from: 0.94, to: 1 },
      duration: 1400,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    // Left-side random dancer
    const dancerX = width * 0.15
    const dancerY = height * 0.60
    const dancerSize = Math.min(240, Math.min(width, height) * 0.28)
    const danceKeys = []
    for (let i = 1; i <= 5; i++) {
      const danceKey = `dance0${i}` // dance01, dance02, etc.
      if (this.textures.exists(danceKey)) danceKeys.push(danceKey)
    }
    if (danceKeys.length) {
      const key = Phaser.Utils.Array.GetRandom(danceKeys)
      const tex = this.textures.get(key)
      if (!tex || !tex.source[0] || !tex.source[0].image) {
        console.error(`[TitleScene] Texture ${key} not ready`)
        return
      }
      
      // Phaser detects 49 frames but frame 48 doesn't exist, so use frameTotal - 2 for 48 frames (0-47)
      const endFrame = tex.frameTotal > 2 ? tex.frameTotal - 2 : (tex.frameTotal > 1 ? tex.frameTotal - 1 : 0)
      const animKey = `${key}-dance`
      
      // Create sprite first
      const dancer = this.add.sprite(dancerX, dancerY, key)
      dancer.setFrame(0) // Force set to frame 0
      dancer.setDisplaySize(dancerSize, dancerSize)
      dancer.setDepth(5)
      dancer.setVisible(true)
      dancer.clearTint()
      
      // Create and play animation
      if (endFrame > 0) {
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(key, { start: 0, end: endFrame }),
            frameRate: 10,
            repeat: -1,
          })
        }
        dancer.play(animKey)
      }
      this.tweens.add({
        targets: dancer,
        y: { from: dancerY - 8, to: dancerY + 8 },
        rotation: { from: -0.05, to: 0.05 },
        duration: 900,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
      const glow = this.add
        .circle(dancerX, dancerY, dancerSize * 0.55, 0x7f5af0, 0.28)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.0)
        .setDepth(4)
      this.tweens.add({
        targets: [dancer, glow],
        alpha: { from: 0, to: 1 },
        duration: 700,
        ease: 'Quad.Out',
      })
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.22, to: 0.38 },
        scale: { from: 0.96, to: 1.06 },
        duration: 1500,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.22, to: 0.38 },
        scale: { from: 0.96, to: 1.06 },
        duration: 1500,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
    }

    // Color-cycling scroller
    const msg =
      '  WELCOME TO SID SURFER · SURF THE SOUNDWAVES · FUTUREVISION LABS · GAME OFF 2025  '
    const marquee = this.add
      .text(width + 20, height * 0.95, msg.repeat(2), {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
    let hue = 200
    this.time.addEvent({
      delay: 30,
      loop: true,
      callback: () => {
        marquee.x -= 2
        if (marquee.x <= -marquee.width / 2) marquee.x = width + 20
        hue = (hue + 2) % 360
        const s = 90,
          l = 60
        const c = (1 - Math.abs(2 * l / 100 - 1)) * (s / 100)
        const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
        const m = l / 100 - c / 2
        const to255 = (v) => Math.round((v + m) * 255)
        let r = 0,
          g = 0,
          b = 0
        if (hue < 60) [r, g, b] = [c, x, 0]
        else if (hue < 120) [r, g, b] = [x, c, 0]
        else if (hue < 180) [r, g, b] = [0, c, x]
        else if (hue < 240) [r, g, b] = [0, x, c]
        else if (hue < 300) [r, g, b] = [x, 0, c]
        else [r, g, b] = [c, 0, x]
        marquee.setColor(
          Phaser.Display.Color.RGBToString(to255(r), to255(g), to255(b), 255, '#')
        )
      },
    })

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.hKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H)

    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: 'Quad.Out',
    })
  }

  startLogoRotation() {
    if (!this.logoSprites || this.logoSprites.length < 2) return
    
    const rotateToNext = () => {
      const currentSprite = this.logoSprites[this.currentLogoIndex]
      // Pick a random different logo (not the current one)
      let nextIndex
      do {
        nextIndex = Phaser.Math.Between(0, this.logoSprites.length - 1)
      } while (nextIndex === this.currentLogoIndex && this.logoSprites.length > 1)
      const nextSprite = this.logoSprites[nextIndex]
      
      // Fade out current logo
      this.tweens.add({
        targets: currentSprite,
        alpha: { from: 1, to: 0 },
        duration: 800,
        ease: 'Quad.InOut',
      })
      
      // Fade in next logo
      nextSprite.setAlpha(0)
      this.tweens.add({
        targets: nextSprite,
        alpha: { from: 0, to: 1 },
        duration: 800,
        ease: 'Quad.InOut',
      })
      
      // Update pulse tween to new sprite
      if (this.logoPulseTween) {
        this.logoPulseTween.stop()
      }
      this.logoPulseTween = this.tweens.add({
        targets: nextSprite,
        scale: { from: this.logoScale * 0.98, to: this.logoScale * 1.05 },
        duration: 2000,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
      
      this.currentLogoIndex = nextIndex
    }
    
    // Rotate at random intervals between 2 and 3.5 seconds
    const scheduleNextRotation = () => {
      const delay = Phaser.Math.Between(2000, 3500)
      this.logoRotationTimer = this.time.addEvent({
        delay: delay,
        callback: () => {
          rotateToNext()
          scheduleNextRotation() // Schedule the next random rotation
        },
        loop: false,
      })
    }
    scheduleNextRotation()
  }

  playNextTheme() {
    if (this.themeSound) {
      this.themeSound.stop()
      this.themeSound.destroy()
    }

    const availableThemes = [...this.themeTracks]
    if (this.currentThemeIndex >= 0) {
      availableThemes.splice(this.currentThemeIndex, 1)
    }
    
    const randomTheme = Phaser.Utils.Array.GetRandom(availableThemes)
    this.currentThemeIndex = this.themeTracks.indexOf(randomTheme)

    if (this.cache.audio.exists(randomTheme)) {
      this.themeSound = this.sound.add(randomTheme, {
        volume: 0.7,
        loop: false,
      })
      
      this.themeSound.on('complete', () => {
        this.playNextTheme()
      })
      
      this.themeSound.play()
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.hKey)) {
      if (this.themeSound) {
        this.themeSound.stop()
        this.themeSound.destroy()
        this.themeSound = null
      }
      this.scene.start('HighScoresScene', { score: 0, composerReached: 0 })
      return
    }
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      if (this.themeSound) {
        this.themeSound.stop()
        this.themeSound.destroy()
        this.themeSound = null
      }
      this.tweens.add({
        targets: this.cameras.main,
        alpha: { from: 1, to: 0 },
        duration: 500,
        ease: 'Quad.In',
        onComplete: () => {
          if (manifestLoaded && composerManifest.length > 0) {
            const firstComposer = composerManifest[0]
            console.log('[TitleScene] Starting ComposerProfileScene with', firstComposer.name)
            this.scene.stop('TitleScene')
            this.scene.launch('ComposerProfileScene', {
              composer: firstComposer,
              composerId: firstComposer?.id ?? null,
              isFirstLevel: true,
            })
            this.scene.bringToTop('ComposerProfileScene')
          } else {
            this.scene.start('WaveScene', {})
          }
        },
      })
    }
  }

  shutdown() {
    if (this.themeSound) {
      this.themeSound.stop()
      this.themeSound.destroy()
      this.themeSound = null
    }
    if (this.logoRotationTimer) {
      this.logoRotationTimer.destroy()
      this.logoRotationTimer = null
    }
    if (this.logoPulseTween) {
      this.logoPulseTween.stop()
      this.logoPulseTween = null
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'phaser-target',
  width: containerWidth,
  height: containerHeight,
  backgroundColor: '#03030a',
  scene: [TitleScene, WaveScene, ComposerProfileScene, GameOverScene, NameEntryScene, HighScoresScene],
}

try {
  const game = new Phaser.Game(config)
  window.sidSurfer = {
    game,
    sidPlayer,
    waveState,
  }
  console.log('[SID Surfer] Game initialized successfully')
} catch (error) {
  console.error('[SID Surfer] Failed to initialize game:', error)
  document.querySelector('#app').innerHTML = `
    <div style="color: #ff0000; padding: 2rem; text-align: center;">
      <h1>Failed to load SID Surfer</h1>
      <p>Error: ${error.message}</p>
      <p>Check the browser console for details.</p>
    </div>
  `
}
