# SID Surfer – Project Journal

## 2025-11-15 · Day 0 – Surfacing the Idea
- Spun up the SIDSurfer lab folder and committed to jamming in **Game Off 2025** (theme: _WAVES_).
- Locked narrative: you ride a neon sine highway while SID anthems spawn enemy formations.
- Curated campaign lineup: **Hubbard Hijinks**, **Dangerous Daglish**, **Sensible Surfin'**, **Galway Ripples**, and **Follin Freakwave**—each level as a tribute concert.
- Stretch dream: Freestyle mode that ingests any HVSC `.sid` and builds a procedural lane pattern from tempo + section markers.

## 2025-11-15 · Night Notes – Audio Gear Check
- Confirmed we can reuse the Tiny'R'Sid + analyser hook from GameForge-64 for beat detection and reactive visuals.
- Mapped out how the curated playlist system can feed metadata/tooltips so each composer level has lore cards.
- Brainstormed power-ups: **Ring Mod Rockets**, **Waveform Shields**, **Commodore Combo Multipliers**, plus a **Llamasoft Panic Button** for screen-clears.

## Future Expansions & DLC Plans

### DLC Pack System
The game is designed with DLC in mind. The manifest system (`public/sid/manifest.json`) is structured to allow easy addition of new composer packs.

**Current Base Game Composers:**
- Rob Hubbard (hubbard)
- Ben Daglish (daglish)
- Martin Galway (galway)
- Tim & Geoff Follin (follin)
- Richard Joseph / Sensible Software (sensible)

### Planned DLC Packs

#### DLC Pack 1: "Legends of the SID"
- **Jeroen Tel** - Dutch composer known for epic, cinematic SID tracks
- **Chris Hülsbeck** - German composer, master of melodic C64 music
- **David Whittaker** - Prolific British composer with hundreds of credits
- **Matt Gray** - British composer, known for Last Ninja series
- **Mark Cooksey** - British composer, worked on many Ocean Software titles

#### DLC Pack 2: "Underground Heroes"
- **Laxity** - Modern SID composer, pushing the chip to new limits
- **LMan** - Contemporary SID artist with complex arrangements
- **Reyn Ouwehand** - Dutch composer, known for atmospheric tracks
- **Jason Page** - British composer, worked on many Amiga/C64 titles
- **Barry Leitch** - Scottish composer, known for Top Gear series

#### DLC Pack 3: "Modern Masters"
- **Mikkel Hastrup** - Contemporary SID composer
- **Pex "Mahoney" Tufvesson** - Modern SID artist
- **Linus Åkesson** - Swedish composer, known for innovative SID work
- **4-Mat** - Modern SID composer with electronic influences
- **Stinsen** - Contemporary SID artist

### DLC Implementation

**Adding a New Composer Pack:**
1. Add composer entry to `public/sid/manifest.json` (or DLC manifest):
   ```json
   {
     "id": "composer-id",
     "name": "Composer Name",
     "fullName": "Full Composer Name",
     "bio": "Biography text...",
     "era": "1980s",
     "notable": "Notable works",
     "style": "Musical style description",
     "tracks": [
       {
         "name": "Track Name",
         "author": "Composer Name",
         "path": "/sid/composer-id/track01.sid",
         "subsong": 0,
         "year": 1987
       }
     ]
   }
   ```

2. **TODO (Post-Competition):** Update `ComposerProfileScene.js` to load composer info from manifest instead of hardcoded `COMPOSER_INFO` object. This will allow DLC packs to include their own composer metadata.

3. Add composer portrait: `/posters/composer-id.png`
4. Add SID tracks: `/sid/composer-id/track01.sid`, etc.

**DLC Pack Structure:**
- Each DLC pack can be distributed as a separate JSON manifest file
- Packs can be merged into the main manifest at runtime
- Poster images and SID files can be loaded from DLC-specific directories
- The game automatically detects and loads available packs

### Future Features & Expansions

#### Freestyle Mode (Stretch Goal)
- Ingest any HVSC `.sid` file
- Procedurally generate wave patterns from tempo + section markers
- Dynamic difficulty scaling based on track complexity
- User-uploaded SID support

#### New Power-Ups (Future Updates)
- **Ring Mod Rockets** - Multi-directional projectile spread
- **Waveform Shields** - Temporary invincibility with visual effect
- **Commodore Combo Multipliers** - Extended combo windows
- **Llamasoft Panic Button** - Screen-clearing emergency power-up

#### Additional Game Modes
- **Endless Mode** - Infinite waves with increasing difficulty
- **Time Attack** - Complete levels as fast as possible
- **Score Attack** - Maximize score within time limit
- **Boss Rush** - Fight all bosses in sequence

#### Visual Enhancements
- Additional dancer sprite animations
- More visual effects and particle systems
- Customizable color schemes/themes
- Retro CRT filter options

#### Multiplayer Features (Future)
- Local co-op (split-screen)
- Online leaderboards per composer pack
- Replay sharing system

### Technical Notes

**Manifest Merging:**
- DLC manifests can be loaded dynamically
- Base game manifest is always loaded first
- DLC manifests append to the composers array
- Duplicate composer IDs are handled gracefully

**Asset Loading:**
- Poster images: `/posters/{composer-id}.png`
- SID tracks: `/sid/{composer-id}/track{NN}.sid`
- DLC assets can be in separate directories for easy distribution

**Versioning:**
- Each DLC pack should include version metadata
- Game can check for pack compatibility
- Updates can be distributed independently

### Distribution Strategy

**Base Game:**
- 5 composers (current lineup)
- Core gameplay mechanics
- Basic power-ups

**DLC Packs:**
- Sold separately or in bundles
- Each pack adds 5 new composers
- Optional: New power-ups, visual themes, or game modes
- Can be enabled/disabled by user

**Free Updates:**
- Bug fixes
- Quality of life improvements
- New game modes (when ready)
- Community-requested features

