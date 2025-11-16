import Phaser from 'phaser'

const HIGH_SCORES_KEY = 'sidSurferHighScores'
const MAX_HIGH_SCORES = 10

function loadHighScores() {
  try {
    const stored = localStorage.getItem(HIGH_SCORES_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('[GameOver] Failed to load high scores', error)
  }
  return []
}

function isHighScore(score) {
  const scores = loadHighScores()
  if (scores.length < MAX_HIGH_SCORES) return true
  return score > scores[scores.length - 1].score
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  init(data) {
    this.finalScore = data.score ?? 0
    this.composerReached = data.composerReached ?? 0
    this.composerName = data.composerName ?? ''
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setAlpha(0)
    this.cameras.main.setVisible(true)

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x03030a, 0.95)
    bg.setStrokeStyle(2, 0xff0000, 0.6)
    bg.setDepth(0)

    this.add
      .text(width / 2, height * 0.25, 'GAME OVER', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '64px',
        color: '#ff0000',
        stroke: '#ff6b6b',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 30, '#ff0000', 1, true)

    this.add
      .text(width / 2, height * 0.4, `FINAL SCORE: ${this.finalScore.toLocaleString()}`, {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '32px',
        color: '#ffe66d',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 15, '#ffe66d', 1, true)

    this.add
      .text(width / 2, height * 0.5, `COMPOSERS REACHED: ${this.composerReached}`, {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '24px',
        color: '#84f0ff',
      })
      .setOrigin(0.5)

    const pressText = this.add
      .text(width / 2, height * 0.7, 'Press SPACE to view High Scores', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '20px',
        color: '#4ecdc4',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 15, '#4ecdc4', 1, true)
      .setAlpha(0.8)

    const pressGlow = this.add
      .text(width / 2, height * 0.7, 'Press SPACE to view High Scores', {
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
        // Check if it's a high score - if so, show name entry first
        if (isHighScore(this.finalScore)) {
          this.scene.start('NameEntryScene', {
            score: this.finalScore,
            composerReached: this.composerReached,
            composerName: this.composerName,
          })
        } else {
          this.scene.start('HighScoresScene', {
            score: this.finalScore,
            composerReached: this.composerReached,
            composerName: this.composerName,
          })
        }
      },
    })
  }
}

