# SID Surfer - Development Log

## 🎮 Game Off 2025 Entry: "WAVES"

**Theme:** WAVES  
**Team:** FutureVision Labs  
**Engine:** Phaser 3  
**Audio:** Tiny'R'Sid (WebAssembly C64 SID Emulator)  
**Build Tool:** Vite  

---

## 📅 Development Timeline

### Day 1: Concept & Setup
**Date:** November 15, 2025

The idea was born from the Game Off 2025 theme "WAVES" - what better way to interpret waves than through:
- **Sine wave highways** you ride on
- **Waves of enemies** spawning to the beat
- **Sound waves** from authentic C64 SID music

We decided to create a rhythm rail-shooter that pays tribute to the legendary composers of the Commodore 64 era. The game would feature:
- A curated selection of iconic SID tracks
- Composer profile screens with biographical information
- Wave-based gameplay where enemies spawn rhythmically
- Boss battles with unique mechanics

**Technical Foundation:**
- Set up Phaser 3 project with Vite
- Integrated Tiny'R'Sid WebAssembly library for authentic SID playback
- Created basic scene structure: Title → Composer Profile → Wave Scene → Boss → Game Over → High Scores

---

### Day 2: Core Gameplay Loop
**Date:** November 16, 2025

**Player Movement:**
- Implemented lane-based movement system (5 lanes)
- Smooth transitions between lanes
- Player sprite with stickman-style graphics and surfboard

**Enemy System:**
- Created placeholder enemy spawning system
- Enemies spawn from the top and move down
- Different enemy types: "ghost" (passes through) and "obstacle" (collision damage)
- Later replaced placeholders with stickman enemies matching player style

**Shooting Mechanics:**
- Player can fire lasers continuously
- Projectiles travel upward and destroy enemies on contact
- Added visual feedback with explosions

**Power-Ups:**
- Rockets (multi-projectile spread)
- Shields (temporary invincibility)
- Health pickups
- Power-ups spawn randomly and can be collected

---

### Day 3: Audio Integration & Rhythm System
**Date:** November 17, 2025

**SID Music Integration:**
- Successfully integrated Tiny'R'Sid WebAssembly library
- Created manifest system (`public/sid/manifest.json`) for organizing composer tracks
- Implemented WebSIDController for managing SID playback
- Added composer profile screens that display before each level

**Composer Profiles:**
- Created biographical information for each composer
- Added composer portraits/posters
- Implemented fade transitions between scenes
- Each composer has 5 tracks that can be selected

**Rhythm Integration:**
- Enemies spawn based on level progression (not yet beat-synced, but structured)
- Level duration set to 2 minutes for optimal gameplay length
- Music starts when entering the wave scene

---

### Day 4: Visual Polish & UI
**Date:** November 18, 2025

**Title Screen:**
- Created rotating logo system with multiple logo variations
- Added animated dancer sprites (48-frame animations)
- Implemented credits panel with scrolling text
- Added "BY FUTUREVISION LABS" byline

**UI Elements:**
- Health bar
- Score display
- Level indicator
- Removed combo meter (originally planned for tricks, but not needed without trick sprites)

**Visual Effects:**
- Explosion particles
- Power-up collection effects
- Screen shake on damage
- Smooth camera transitions

---

### Day 5: Boss Battles & Difficulty Tuning
**Date:** November 19, 2025

**Boss System:**
- Created boss sprite and visual design
- Implemented boss health system (3000 HP)
- Boss takes reduced damage from player projectiles (50% damage)
- Boss rotates slowly at full health, speeds up as it takes damage
- Boss fires projectiles at the player

**Drone Phase:**
- At 50% health, boss enters drone phase
- Launches homing kamikaze drones
- Drones track player position and rotate to face movement direction
- Multiple drones can be active simultaneously
- Drones spawn every 1.5-2.5 seconds during drone phase

**Difficulty Balancing:**
- Increased boss health significantly
- Added damage reduction for boss
- Made drones more visible (32x32px, full alpha)
- Improved drone homing behavior with normalized direction vectors
- Increased drone speed for more challenging gameplay

---

### Day 6: Bug Fixes & Final Polish
**Date:** November 20, 2025

**Audio Fixes:**
- Reduced laser SFX volume (was too loud)
- Fixed SID music not starting on first wave
- Fixed SID music continuing to play when returning to title from high scores
- Adjusted general audio cue volumes for better balance

**Visual Fixes:**
- Made rotating logo smaller and moved to top of panel
- Fixed logo overlapping other UI elements
- Aligned "BY FUTUREVISION LABS" text properly
- Made byline text brighter for better visibility
- Removed red tint overlays from boss and drones

**Enemy Improvements:**
- Replaced placeholder shapes with stickman enemies
- Added surfboards to enemy stickmen
- Made enemies same size as player for consistency
- Improved enemy collision detection

**Dancer Sprites:**
- Updated to 48-frame animations (256px per frame)
- Fixed WebGL texture size limits by using appropriate frame dimensions
- Dancers display randomly on title and composer profile screens

**Cheat System:**
- Added console cheat to disable enemy collisions (for testing)
- Cheat also disables boss projectile and drone collisions
- Useful for testing boss mechanics and level progression

---

## 🎯 Design Decisions

### Why Stickmen?
We originally planned to use detailed surfer sprites, but decided on stickmen for:
- **Retro aesthetic** - Matches the C64 era vibe
- **Performance** - Simple graphics allow for smooth 60fps gameplay
- **Clarity** - Easy to see and understand in fast-paced action
- **Consistency** - Player and enemies share the same visual style

### Why 2-Minute Levels?
- **Pacing** - Long enough to enjoy the music, short enough to maintain intensity
- **Replayability** - Quick sessions encourage multiple playthroughs
- **Score Chasing** - Perfect length for competitive high score runs

### Why Composer Profiles?
- **Education** - Players learn about legendary C64 composers
- **Respect** - Honors the artists who created this incredible music
- **Immersion** - Sets the tone before each level
- **Future DLC** - Easy to add more composers with their own profiles

### Why DLC-Ready Architecture?
From day one, we designed the game to support expansion:
- **Manifest system** - Easy to add new composers and tracks
- **Modular structure** - New content doesn't require code changes
- **Community potential** - Others could create their own composer packs
- **Longevity** - Game can grow beyond the initial release

---

## 🐛 Challenges Overcome

### WebGL Texture Size Limits
**Problem:** Dancer spritesheets were too wide (48 frames × 512px = 24,576px), exceeding WebGL limits.

**Solution:** Re-exported sprites as 256px frames in a single row. This kept the total width manageable while maintaining visual quality.

### SID Music Not Starting
**Problem:** Music wouldn't play when starting the first wave directly.

**Solution:** Changed scene transition from `launch()` to `start()` and added a small delay before initializing the SID player to ensure the scene was fully loaded.

### Drone Homing Behavior
**Problem:** Drones weren't homing correctly and only one would appear at a time.

**Solution:** 
- Fixed movement calculation to use normalized direction vectors
- Increased homing speed and base speed
- Initialized drone cooldown properly in boss fight
- Made drones rotate to face movement direction

### Audio Overlap
**Problem:** SID music would continue playing when returning to title screen.

**Solution:** Added explicit `stop()` call to SID player before transitioning scenes.

---

## 🎨 Art & Assets

### Sprites
- **Player:** Stickman with surfboard (spritesheet)
- **Enemies:** Stickmen with surfboards (procedurally drawn)
- **Boss:** Custom boss sprite (120x120px)
- **Drones:** Simple geometric shapes (32x32px)
- **Dancers:** 48-frame animation spritesheets (256px per frame)

### Audio
- **SID Tracks:** Authentic C64 SID files from HVSC (High Voltage SID Collection)
- **SFX:** Custom audio cues for:
  - Player fire
  - Enemy fire
  - Explosions
  - Hits
  - Power-up collection

### UI Elements
- **Logos:** 10 rotating logo variations
- **Composer Portraits:** Custom portraits for each composer
- **Title Background:** Custom title screen image

---

## 🚀 Future Plans

### DLC Packs
We've planned three DLC packs with additional composers:
1. **Legends of the SID** - Jeroen Tel, Chris Hülsbeck, David Whittaker, Matt Gray, Mark Cooksey
2. **Underground Heroes** - Laxity, LMan, Reyn Ouwehand, Jason Page, Barry Leitch
3. **Modern Masters** - Mikkel Hastrup, Pex "Mahoney" Tufvesson, Linus Åkesson, 4-Mat, Stinsen

### New Features
- **Freestyle Mode** - Load any SID file and generate procedural levels
- **New Power-Ups** - Ring Mod Rockets, Waveform Shields, Llamasoft Panic Button
- **Additional Game Modes** - Endless, Time Attack, Score Attack, Boss Rush
- **Visual Enhancements** - CRT filters, customizable themes, more particle effects

### Technical Improvements
- Refactor `ComposerProfileScene` to load metadata from manifest (post-competition)
- Implement dynamic manifest merging for DLC
- Add replay system
- Online leaderboards per composer pack

---

## 📊 Technical Specs

### Performance
- **Target FPS:** 60
- **Resolution:** 1024x800
- **Build Size:** ~1.3MB (compressed)
- **Audio:** WebAssembly SID emulation

### Browser Compatibility
- Modern browsers with WebAssembly support
- WebGL 2.0 required
- AudioContext API required

### Build Process
- **Dev:** `npm run dev` (Vite dev server)
- **Build:** `npm run build` (Vite production build)
- **Package:** `npm run package` (Creates ZIP for itch.io)

---

## 🎵 Composer Lineup

### Base Game Composers

1. **Rob Hubbard** - British composer, known for epic, cinematic SID tracks
2. **Ben Daglish** - British composer, worked on many classic C64 games
3. **Martin Galway** - Irish composer, master of melodic SID music
4. **Tim & Geoff Follin** - British brothers, known for complex, technical SID compositions
5. **Richard Joseph** - British composer, worked with Sensible Software

Each composer has 5 tracks selected from their most iconic works.

---

## 🙏 Acknowledgments

- **Phaser 3** - Amazing game framework
- **Tiny'R'Sid** - Incredible WebAssembly SID emulator
- **HVSC** - High Voltage SID Collection for the music
- **GitHub Game Off 2025** - For the inspiration and theme
- **All the C64 composers** - For creating the music that defined a generation

---

## 📝 Post-Mortem

### What Went Well
- ✅ Quick iteration and prototyping
- ✅ Solid technical foundation from day one
- ✅ DLC-ready architecture
- ✅ Authentic SID music integration
- ✅ Smooth gameplay feel

### What Could Be Improved
- ⚠️ Beat-synced enemy spawning (currently time-based)
- ⚠️ More visual variety in enemy types
- ⚠️ Trick system (originally planned but cut)
- ⚠️ More power-up variety
- ⚠️ Better tutorial/onboarding

### Lessons Learned
- WebGL texture limits are real - plan sprite dimensions carefully
- Scene transitions need careful timing for audio
- Simple graphics can be more effective than complex ones
- DLC architecture from the start saves refactoring later
- Testing on multiple browsers is essential

---

## 🎉 Conclusion

SID Surfer was a labor of love, combining nostalgia for the Commodore 64 era with modern web game development. We're proud of what we've created and excited to share it with the world!

**Surf's up! Let's ride those waves! 🌊🎮✨**

---

*Created by FutureVision Labs for GitHub Game Off 2025*  
*Theme: WAVES*  
*November 2025*

