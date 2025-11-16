import Phaser from 'phaser'

const HIGH_SCORES_KEY = 'sidSurferHighScores'
const MAX_HIGH_SCORES = 10
const LEVEL_PREFIXES = ['LEVEL ONE', 'LEVEL TWO', 'LEVEL THREE', 'LEVEL FOUR', 'LEVEL FIVE']

function formatLevelName(composerReached, composerName) {
  const prefix = LEVEL_PREFIXES[composerReached - 1] ?? `LEVEL ${composerReached}`
  // Create "Hubbard Hijinx" style name from composer name
  const hijinxName = composerName ? `${composerName} Hijinx!` : 'Wave Set!'
  return `${prefix} - ${hijinxName}`
}

function loadHighScores() {
  try {
    const stored = localStorage.getItem(HIGH_SCORES_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('[HighScores] Failed to load high scores', error)
  }
  return []
}

function isHighScore(score) {
  const scores = loadHighScores()
  if (scores.length < MAX_HIGH_SCORES) return true
  return score > scores[scores.length - 1].score
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'Unknown'
  }
}

export class HighScoresScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HighScoresScene' })
  }

  init(data) {
    this.finalScore = data.score ?? 0
    this.composerReached = data.composerReached ?? 0
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setAlpha(0)
    this.cameras.main.setVisible(true)

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x03030a, 0.95)
    bg.setStrokeStyle(2, 0x7f5af0, 0.6)
    bg.setDepth(0)

    // Check if this is a new high score (should have been saved with name already)
    const scores = loadHighScores()
    const isNewHighScore = this.finalScore > 0 && scores.some((entry) => entry.score === this.finalScore)
    
    if (isNewHighScore) {
      this.add
        .text(width / 2, height * 0.15, 'NEW HIGH SCORE!', {
          fontFamily: 'Orbitron, Rajdhani, monospace',
          fontSize: '36px',
          color: '#50fa7b',
        })
        .setOrigin(0.5)
        .setShadow(0, 0, 20, '#50fa7b', 1, true)
    }

    this.add
      .text(width / 2, height * 0.25, 'HIGH SCORES', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '48px',
        color: '#7f5af0',
        stroke: '#b794f6',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 25, '#7f5af0', 1, true)

    const startY = height * 0.35
    const lineHeight = 40 // Increased for longer level names
    const leftMargin = width * 0.1
    const nameWidth = width * 0.2
    const scoreWidth = width * 0.35
    const levelWidth = width * 0.6
    const rightMargin = width * 0.9

    if (scores.length === 0) {
      this.add
        .text(width / 2, startY + 50, 'No high scores yet!\nBe the first to set a record!', {
          fontFamily: 'Rajdhani, monospace',
          fontSize: '20px',
          color: '#bcd7ff',
          align: 'center',
        })
        .setOrigin(0.5)
    } else {
      scores.forEach((entry, index) => {
        const y = startY + index * lineHeight
        const rank = index + 1
        const isCurrentScore = entry.score === this.finalScore

        const rankText = this.add
          .text(leftMargin, y, `${rank}.`, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '20px',
            color: isCurrentScore ? '#50fa7b' : '#ffe66d',
            align: 'right',
          })
          .setOrigin(1, 0.5)

        const nameText = this.add
          .text(leftMargin + 30, y, entry.name || 'AAA', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '22px',
            color: isCurrentScore ? '#50fa7b' : '#bcd7ff',
            fontStyle: isCurrentScore ? 'bold' : 'normal',
          })
          .setOrigin(0, 0.5)

        const scoreText = this.add
          .text(nameWidth + 20, y, entry.score.toLocaleString(), {
            fontFamily: 'Rajdhani, monospace',
            fontSize: '20px',
            color: isCurrentScore ? '#50fa7b' : '#bcd7ff',
            fontStyle: isCurrentScore ? 'bold' : 'normal',
          })
          .setOrigin(0, 0.5)

        const levelName = formatLevelName(entry.composerReached, entry.composerName)
        const composerText = this.add
          .text(scoreWidth + 30, y, levelName, {
            fontFamily: 'Rajdhani, monospace',
            fontSize: '13px',
            color: '#84f0ff',
            wordWrap: { width: width * 0.35 },
          })
          .setOrigin(0, 0.5)

        const dateText = this.add
          .text(rightMargin, y, formatDate(entry.date), {
            fontFamily: 'Rajdhani, monospace',
            fontSize: '14px',
            color: '#7f8c8d',
          })
          .setOrigin(1, 0.5)

        if (isCurrentScore) {
          rankText.setShadow(0, 0, 10, '#50fa7b', 1, true)
          nameText.setShadow(0, 0, 10, '#50fa7b', 1, true)
          scoreText.setShadow(0, 0, 10, '#50fa7b', 1, true)
        }
      })
    }

    const pressText = this.add
      .text(width / 2, height * 0.85, 'Press SPACE to return to Title', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '20px',
        color: '#4ecdc4',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 15, '#4ecdc4', 1, true)
      .setAlpha(0.8)

    const pressGlow = this.add
      .text(width / 2, height * 0.85, 'Press SPACE to return to Title', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '20px',
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
  }

  update() {
    if (this.spaceKey && this.enterKey) {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.fadeOut()
      }
    }
  }

  fadeOut() {
    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Quad.In',
      onComplete: () => {
        this.scene.stop()
        this.scene.start('TitleScene')
      },
    })
  }
}

