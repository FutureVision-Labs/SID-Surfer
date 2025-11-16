import Phaser from 'phaser'

export class NameEntryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NameEntryScene' })
  }

  init(data) {
    this.finalScore = data.score ?? 0
    this.composerReached = data.composerReached ?? 0
    this.composerName = data.composerName ?? ''
    this.playerName = 'AAA' // Default initials
    this.currentLetterIndex = 0
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setAlpha(0)
    this.cameras.main.setVisible(true)

    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x03030a, 0.95)
    bg.setStrokeStyle(2, 0x50fa7b, 0.6)
    bg.setDepth(0)

    this.add
      .text(width / 2, height * 0.2, 'NEW HIGH SCORE!', {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '48px',
        color: '#50fa7b',
        stroke: '#84f0ff',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 25, '#50fa7b', 1, true)

    this.add
      .text(width / 2, height * 0.35, `SCORE: ${this.finalScore.toLocaleString()}`, {
        fontFamily: 'Orbitron, Rajdhani, monospace',
        fontSize: '32px',
        color: '#ffe66d',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, 15, '#ffe66d', 1, true)

    this.add
      .text(width / 2, height * 0.45, 'ENTER YOUR INITIALS', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '24px',
        color: '#84f0ff',
      })
      .setOrigin(0.5)

    // Create letter display
    const letterSpacing = 60
    const startX = width / 2 - letterSpacing
    this.letterTexts = []

    for (let i = 0; i < 3; i++) {
      const letterText = this.add
        .text(startX + i * letterSpacing, height * 0.6, this.playerName[i], {
          fontFamily: 'Orbitron, monospace',
          fontSize: '64px',
          color: '#bcd7ff',
          stroke: '#7f5af0',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setShadow(0, 0, 20, '#7f5af0', 1, true)

      this.letterTexts.push(letterText)
    }

    // Cursor indicator
    this.cursor = this.add
      .rectangle(startX, height * 0.6 + 50, 50, 4, 0x50fa7b, 1)
      .setOrigin(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)

    this.tweens.add({
      targets: this.cursor,
      alpha: { from: 0.3, to: 1 },
      duration: 500,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    })

    // Instructions
    this.add
      .text(width / 2, height * 0.75, '↑↓ to change letter, ←→ to move, ENTER to confirm', {
        fontFamily: 'Rajdhani, monospace',
        fontSize: '18px',
        color: '#7f8c8d',
      })
      .setOrigin(0.5)

    // Keyboard input
    this.cursors = this.input.keyboard.createCursorKeys()
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // Also allow letter keys
    this.letterKeys = {}
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i) // A-Z
      this.letterKeys[letter] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[letter])
    }

    this.updateLetterDisplay()

    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 0, to: 1 },
      duration: 600,
      ease: 'Quad.Out',
    })
  }

  update() {
    // Letter selection with arrow keys
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.changeLetter(1)
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.changeLetter(-1)
    }

    // Move between letters
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.currentLetterIndex = Math.max(0, this.currentLetterIndex - 1)
      this.updateLetterDisplay()
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.currentLetterIndex = Math.min(2, this.currentLetterIndex + 1)
      this.updateLetterDisplay()
    }

    // Direct letter input (A-Z keys)
    for (const [letter, key] of Object.entries(this.letterKeys)) {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.playerName = this.playerName.substring(0, this.currentLetterIndex) + letter + this.playerName.substring(this.currentLetterIndex + 1)
        this.updateLetterDisplay()
        // Move to next letter
        if (this.currentLetterIndex < 2) {
          this.currentLetterIndex++
          this.updateLetterDisplay()
        }
      }
    }

    // Confirm
    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.confirmName()
    }
  }

  changeLetter(delta) {
    const currentChar = this.playerName[this.currentLetterIndex].charCodeAt(0)
    let newChar = currentChar + delta

    // Wrap around: A (65) <-> Z (90)
    if (newChar < 65) newChar = 90
    if (newChar > 90) newChar = 65

    this.playerName = this.playerName.substring(0, this.currentLetterIndex) + String.fromCharCode(newChar) + this.playerName.substring(this.currentLetterIndex + 1)
    this.updateLetterDisplay()
  }

  updateLetterDisplay() {
    // Update letter texts
    for (let i = 0; i < 3; i++) {
      this.letterTexts[i].setText(this.playerName[i])
      
      // Highlight current letter
      if (i === this.currentLetterIndex) {
        this.letterTexts[i].setColor('#50fa7b')
        this.letterTexts[i].setScale(1.2)
        this.cursor.x = this.letterTexts[i].x
      } else {
        this.letterTexts[i].setColor('#bcd7ff')
        this.letterTexts[i].setScale(1.0)
      }
    }
  }

  confirmName() {
    // Save high score with name
    const HIGH_SCORES_KEY = 'sidSurferHighScores'
    const MAX_HIGH_SCORES = 10

    let scores = []
    try {
      const stored = localStorage.getItem(HIGH_SCORES_KEY)
      if (stored) {
        scores = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('[NameEntry] Failed to load high scores', error)
    }

    // Add new score with name
    scores.push({
      name: this.playerName,
      score: this.finalScore,
      composerReached: this.composerReached,
      composerName: this.composerName,
      date: new Date().toISOString(),
    })

    // Sort and keep top 10
    scores.sort((a, b) => b.score - a.score)
    scores = scores.slice(0, MAX_HIGH_SCORES)

    try {
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores))
    } catch (error) {
      console.warn('[NameEntry] Failed to save high score', error)
    }

    // Transition to high scores
    this.fadeOut()
  }

  fadeOut() {
    this.tweens.add({
      targets: this.cameras.main,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Quad.In',
      onComplete: () => {
        this.scene.stop()
        this.scene.start('HighScoresScene', {
          score: this.finalScore,
          composerReached: this.composerReached,
          composerName: this.composerName,
        })
      },
    })
  }
}

