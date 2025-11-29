import Phaser from 'phaser'

const COMPOSER_INFO = {
  hubbard: {
    name: 'Rob Hubbard',
    fullName: 'Rob Hubbard',
    bio: 'Legendary British composer known for creating some of the most iconic chiptune soundtracks of the 1980s. His work on the Commodore 64 defined an era of video game music.',
    era: '1980s',
    notable: 'Monty on the Run, Commando, International Karate',
    style: 'Melodic, complex arrangements with signature basslines',
  },
  daglish: {
    name: 'Ben Daglish',
    fullName: 'Ben Daglish',
    bio: 'Prolific British composer and musician who created hundreds of game soundtracks. Known for his energetic and catchy melodies that perfectly captured the spirit of 8-bit gaming.',
    era: '1980s-1990s',
    notable: 'The Last Ninja, Auf Wiedersehen Monty, Cobra',
    style: 'Energetic, catchy melodies with strong rhythm sections',
  },
  galway: {
    name: 'Martin Galway',
    fullName: 'Martin Galway',
    bio: 'Irish composer who became one of the most celebrated C64 musicians. His work is characterized by rich, layered compositions that pushed the SID chip to its limits.',
    era: '1980s',
    notable: 'Wizball, Rambo, Times of Lore',
    style: 'Rich, layered compositions with complex harmonies',
  },
  follin: {
    name: 'Tim & Geoff Follin',
    fullName: 'Tim & Geoff Follin',
    bio: 'Brother duo who created some of the most technically impressive and musically sophisticated game soundtracks. Their work often featured complex time signatures and advanced programming techniques.',
    era: '1980s-1990s',
    notable: 'Solstice, Plok, Silver Surfer',
    style: 'Technically advanced, complex arrangements with progressive elements',
  },
  sensible: {
    name: 'Sensible Software',
    fullName: 'Sensible Software',
    bio: 'British development team known for their quirky, fun games and memorable soundtracks. Their music perfectly matched their games\' sense of humor and style.',
    era: '1980s-1990s',
    notable: 'Sensible Soccer, Cannon Fodder, Wizball',
    style: 'Quirky, fun, and perfectly matched to gameplay',
  },
}

export class ComposerProfileScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ComposerProfileScene' })
  }

  init(data) {
    this.composerData = data.composer ?? null
    this.composerId = data.composerId ?? null
    this.isFirstLevel = data.isFirstLevel ?? false
  }

  preload() {
    if (this.composerId) {
      this.load.image(`poster-${this.composerId}`, `./posters/${this.composerId}.png`)
    }
    
    // Load dancing sprite animations
    // Dancer sprites: 256px per frame, 48 frames
    // If they don't exist, will gracefully use placeholder
    for (let i = 1; i <= 5; i++) {
      const danceKey = `dance0${i}` // dance01, dance02, etc.
      this.load.spritesheet(danceKey, `./sprites/dance0${i}.png`, {
        frameWidth: 256,
        frameHeight: 256
      })
    }
  }

  async create() {
    console.log('[ComposerProfileScene] Creating scene', this.composerData?.name)
    const { width, height } = this.scale
    this.cameras.main.setAlpha(0)
    this.cameras.main.setVisible(true)

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x03030a, 0.95)
    bg.setStrokeStyle(2, 0x7f5af0, 0.6)
    bg.setDepth(0)

    this.sidPlayer = window.sidSurfer?.sidPlayer ?? null
    if (this.sidPlayer && this.composerData?.tracks?.length) {
      const playlist = this.composerData.tracks
      const randomIndex = Phaser.Math.Between(0, playlist.length - 1)
      try {
        await this.sidPlayer.setTracks(playlist, randomIndex)
        await this.sidPlayer.playTrackAtIndex(randomIndex, true)
      } catch (error) {
        console.warn('[ComposerProfileScene] Failed to play random track', error)
      }
    }

    const info = this.composerId ? COMPOSER_INFO[this.composerId] : null
    const composerName = this.composerData?.name ?? info?.name ?? 'Unknown Composer'

    const leftMargin = width * 0.1
    const rightX = width * 0.75
    const startY = height * 0.25
    const profileWidth = width * 0.5

    this.add
      .text(leftMargin, startY, composerName.toUpperCase(), {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '32px',
        color: '#7f5af0',
        wordWrap: { width: profileWidth },
      })
      .setOrigin(0, 0)

    let yPos = startY + 60
    if (info) {
      this.add
        .text(leftMargin, yPos, info.bio, {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '16px',
          color: '#bcd7ff',
          wordWrap: { width: profileWidth },
          lineSpacing: 4,
        })
        .setOrigin(0, 0)

      yPos += 100
      this.add
        .text(leftMargin, yPos, `STYLE: ${info.style}`, {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '14px',
          color: '#50fa7b',
          wordWrap: { width: profileWidth },
        })
        .setOrigin(0, 0)

      yPos += 40
      this.add
        .text(leftMargin, yPos, `ERA: ${info.era}`, {
          fontFamily: 'Orbitron, monospace',
          fontSize: '14px',
          color: '#ffe66d',
        })
        .setOrigin(0, 0)

      yPos += 30
      this.add
        .text(leftMargin, yPos, `NOTABLE: ${info.notable}`, {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '14px',
          color: '#84f0ff',
          wordWrap: { width: profileWidth },
        })
        .setOrigin(0, 0)
      yPos += 40
    }

    const tracks = this.composerData?.tracks ?? []
    const trackCount = tracks.length
    if (!info) {
      yPos = height * 0.68
    }
    this.add
      .text(leftMargin, yPos, `TRACKS (${trackCount}):`, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '16px',
        color: '#ff6b6b',
      })
      .setOrigin(0, 0)

    yPos += 25
    tracks.forEach((track, index) => {
      const trackName = track.name || track.path?.split('/').pop()?.replace('.sid', '') || `Track ${index + 1}`
      const yearText = track.year ? ` (${track.year})` : ''
      this.add
        .text(leftMargin, yPos, `• ${trackName}${yearText}`, {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '13px',
          color: '#bcd7ff',
          wordWrap: { width: profileWidth },
        })
        .setOrigin(0, 0)
      yPos += 18
    })

    // Add large dancing sprite (center-right area)
    const danceX = width * 0.85
    const danceY = height * 0.5
    const danceSize = 200
    
    // Try to find available dance animations
    const availableDances = []
    for (let i = 1; i <= 5; i++) {
      const danceKey = `dance0${i}` // dance01, dance02, etc.
      if (this.textures.exists(danceKey)) {
        availableDances.push(danceKey)
      }
    }
    
    if (availableDances.length > 0) {
      // Pick random dance animation
      const randomDance = Phaser.Utils.Array.GetRandom(availableDances)
      const texture = this.textures.get(randomDance)
      // Phaser detects 49 frames but frame 48 doesn't exist, so use frameTotal - 2 for 48 frames (0-47)
      const endFrame = texture && texture.frameTotal > 2 ? texture.frameTotal - 2 : (texture && texture.frameTotal > 1 ? texture.frameTotal - 1 : 0)
      const animKey = `${randomDance}-dance`
      
      const danceSprite = this.add.sprite(danceX, danceY, randomDance)
      danceSprite.setDisplaySize(danceSize, danceSize)
      danceSprite.setAlpha(0)
      danceSprite.setDepth(5)
      
      // Create and play animation if available
      if (endFrame > 0) {
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(randomDance, { start: 0, end: endFrame }),
            frameRate: 10,
            repeat: -1,
          })
        }
        danceSprite.play(animKey)
      }
      
      // Add bobbing animation
      this.tweens.add({
        targets: danceSprite,
        scale: { from: 0.9, to: 1.1 },
        rotation: { from: -0.1, to: 0.1 },
        duration: 800,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
      
      // Add glow effect
      const danceGlow = this.add.circle(danceX, danceY, danceSize * 0.6, 0x7f5af0, 0.3)
      danceGlow.setBlendMode(Phaser.BlendModes.ADD)
      danceGlow.setAlpha(0)
      danceGlow.setDepth(4)
      
      this.tweens.add({
        targets: [danceSprite, danceGlow],
        alpha: { from: 0, to: 1 },
        duration: 800,
        ease: 'Quad.Out',
      })
      
      this.tweens.add({
        targets: danceGlow,
        alpha: { from: 0.2, to: 0.4 },
        scale: { from: 0.9, to: 1.1 },
        duration: 1500,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
      
      // Store reference for cleanup
      this.danceSprite = danceSprite
      this.danceGlow = danceGlow
    } else {
      // Placeholder dancing character (colored rectangle with animation)
      const placeholderDance = this.add.rectangle(danceX, danceY, danceSize * 0.6, danceSize * 0.8, 0x7f5af0, 0.8)
      placeholderDance.setStrokeStyle(3, 0x4ecdc4, 1)
      placeholderDance.setAlpha(0)
      placeholderDance.setDepth(5)
      
      // Add dancing animation to placeholder
      this.tweens.add({
        targets: placeholderDance,
        alpha: { from: 0, to: 0.8 },
        duration: 800,
        ease: 'Quad.Out',
      })
      
      this.tweens.add({
        targets: placeholderDance,
        y: { from: danceY - 10, to: danceY + 10 },
        rotation: { from: -0.2, to: 0.2 },
        scale: { from: 0.95, to: 1.05 },
        duration: 600,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      })
      
      this.danceSprite = placeholderDance
    }

    const posterKey = `poster-${this.composerId}`
    if (this.textures.exists(posterKey)) {
      const poster = this.add.image(rightX, height / 2, posterKey)
      poster.setDisplaySize(200, 280)
      poster.setAlpha(0)
      poster.setDepth(3)
      this.tweens.add({
        targets: poster,
        alpha: { from: 0, to: 1 },
        duration: 600,
        ease: 'Quad.Out',
      })
    } else {
      const posterPlaceholder = this.add
        .rectangle(rightX, height / 2, 200, 280, 0x1a1a2e, 1)
        .setStrokeStyle(3, 0x7f5af0, 0.8)
        .setDepth(3)

      this.add
        .text(rightX, height / 2, 'POSTER', {
          fontFamily: 'Orbitron, monospace',
          fontSize: '20px',
          color: '#7f5af0',
        })
        .setOrigin(0.5)
        .setDepth(4)
    }

    const pressText = this.add
      .text(width / 2, height * 0.92, 'Press SPACE to continue...', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '18px',
        color: '#4ecdc4',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 15, '#4ecdc4', 1, true)
      .setAlpha(0.8)

    const pressGlow = this.add
      .text(width / 2, height * 0.92, 'Press SPACE to continue...', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '18px',
        color: '#4ecdc4',
      })
      .setOrigin(0.5)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: pressText,
      alpha: { from: 0.6, to: 1 },
      scale: { from: 0.98, to: 1.02 },
      duration: 1000,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    this.tweens.add({
      targets: pressGlow,
      alpha: { from: 0.2, to: 0.5 },
      scale: { from: 0.99, to: 1.05 },
      duration: 1200,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 0, to: 1 },
      duration: 600,
      ease: 'Quad.Out',
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, async () => {
      if (this.sidPlayer) {
        try {
          await this.sidPlayer.stop()
        } catch (error) {
          console.warn('[ComposerProfileScene] Failed to stop track on shutdown', error)
        }
      }
      // Clean up dance sprite
      if (this.danceSprite) {
        this.danceSprite.destroy()
      }
      if (this.danceGlow) {
        this.danceGlow.destroy()
      }
    })
  }

  update() {
    if (this.spaceKey && this.enterKey) {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.fadeOut()
      }
    }
  }

  async fadeOut() {
    if (this.sidPlayer) {
      try {
        await this.sidPlayer.stop()
      } catch (error) {
        console.warn('[ComposerProfileScene] Failed to stop track', error)
      }
    }
    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Quad.In',
      onComplete: async () => {
        if (this.sidPlayer) {
          try {
            await this.sidPlayer.stop()
          } catch (error) {
            console.warn('[ComposerProfileScene] Failed to stop track on fade', error)
          }
        }
        this.scene.stop()
        if (this.isFirstLevel && this.composerData && window.startComposerLevel && window.getWaveState && window.pushWaveState) {
          const firstComposer = this.composerData
          const waveState = window.getWaveState()
          waveState.playlist = firstComposer?.tracks ?? []
          waveState.composerName = firstComposer?.name ?? 'Wave Set'
          waveState.composerId = firstComposer?.id ?? null
          window.pushWaveState()
          // Start WaveScene and ensure it's ready before starting music
          this.scene.start('WaveScene')
          // Small delay to ensure scene is fully created before starting music
          await new Promise(resolve => setTimeout(resolve, 100))
          await window.startComposerLevel(0, true)
        } else if (this.composerData) {
          this.scene.get('WaveScene').events.emit('composer-profile-complete')
        }
      },
    })
  }
}

