## SID Surfer · Wave Lane Plan

1. **Lane Layout**
   - Five active lanes at once, matching the five SID tracks per level.
   - Each lane = sine wave rendered across the screen with amplitude/frequency unique to the current track.
   - Layer additional “ghost” waves in the back for depth.

2. **Phaser Implementation**
   - Dedicated `WaveScene` renders:
     - Gradient ocean background.
     - Grid lines moving forward.
     - Animated sine graphics per lane.
   - Scene accepts a playlist object so we can map track metadata → color palette + amplitude modifiers.

3. **Composer Flair**
   - Each composer swaps palettes + waveform jitter.
   - Title bumper: “Now Playing: <Composer> — <Track>”.
- Announcer VO callouts when tracks change (“Boogie Baby!”, “Yeah Baby Yeah!”) and when lane loyalty combos trigger.

## Lane / Audio Design (WIP)
- Five lanes = five simultaneous SID tracks.
- Each lane maintains its own playback position. Pausing/resuming should continue from where the user left it.
- Staying on a lane fills a “flow meter”; once full, the player can trigger dance moves or tricks for bonus points. Switching lanes resets the meter but activates the new track.


This plan is now partially implemented in `src/scenes/WaveScene.js`. Next steps:

```text
[ ] Hook composer palettes into scene constructor.
[ ] Spawn pickups & enemies on top of wave crests.
[ ] Sync Tiny’R’Sid analyser data to amplitude for real beat-reactive motion.
```

