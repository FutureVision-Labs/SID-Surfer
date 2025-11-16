# 🎨 Blender Sprite Export Guide for SID Surfer

## 🚀 Quick Start

### 1. Prepare Your Model in Blender

1. **Open Blender** (2.8+)
2. **Import your 3D model:**
   - File → Import → Choose your format (FBX, OBJ, GLTF, etc.)
   - Or drag and drop into Blender

3. **Set up animations (if needed):**
   - Make sure your model has animations
   - Check the timeline at the bottom
   - Set frame range if needed

### 2. Configure the Script

1. **Open the script:**
   - Switch to **Scripting** workspace (top tabs)
   - Click **New** to create a new script
   - Copy and paste `blender_sprite_export.py` content

2. **Adjust settings at the top:**
   ```python
   OUTPUT_FOLDER = "C:/Users/cayne/Documents/SIDSurfer/sid-surfer/sprites_export"
   SPRITE_SIZE = 512  # 256, 512, or 1024
   FRAME_RATE = 10
   DIRECTIONS = [
       ("left", 90),
       ("right", -90),
       # Add more directions as needed
   ]
   ```

### 3. Run the Script

1. Click **Run Script** button (play icon) or press **Alt+P**
2. Watch the console for progress messages
3. Sprites will be exported to your output folder!

### 4. Create Sprite Sheets

**Option A: TexturePacker (Recommended)**
1. Download TexturePacker (free version works!)
2. Drag your exported PNG sequences into TexturePacker
3. Set frame size (e.g., 512x512)
4. Export as sprite sheet
5. Copy to `public/sprites/` in SID Surfer

**Option B: Aseprite**
1. Open Aseprite
2. File → Import → Sprite Sheet
3. Select all frames from one direction
4. Aseprite will auto-detect frames
5. Export as sprite sheet

**Option C: Online Tool**
- https://ezgif.com/maker
- Upload all frames
- Set columns/rows
- Download sprite sheet

---

## ⚙️ Script Settings Explained

### Output Settings
- `OUTPUT_FOLDER`: Where sprites will be saved
- `SPRITE_SIZE`: Resolution (256, 512, 1024 recommended)
- `FRAME_RATE`: Animation speed (10-12 fps is good for games)

### Camera Settings
- `CAMERA_DISTANCE`: How far camera is from model
- `CAMERA_ANGLE`: View angle (90 = side view)

### Export Settings
- `EXPORT_FORMAT`: PNG (transparent) or JPEG
- `EXPORT_ANIMATIONS`: Export all animation frames
- `EXPORT_STATIC`: Export single frame only

### Directions
Each direction is `(name, rotation_y_degrees)`:
- `("left", 90)`: Model rotated 90° (facing left)
- `("right", -90)`: Model rotated -90° (facing right)
- `("front", 0)`: No rotation (facing front)
- `("back", 180)`: Rotated 180° (facing back)

---

## 🎯 Common Workflows

### Export Player Character
```python
DIRECTIONS = [
    ("left", 90),
    ("right", -90),
]
SPRITE_SIZE = 512
EXPORT_ANIMATIONS = True
```

### Export Static Enemy
```python
DIRECTIONS = [
    ("front", 0),
]
SPRITE_SIZE = 256
EXPORT_ANIMATIONS = False
EXPORT_STATIC = True
```

### Export Boss (Multiple Angles)
```python
DIRECTIONS = [
    ("left", 90),
    ("right", -90),
    ("front", 0),
    ("back", 180),
]
SPRITE_SIZE = 1024  # Bigger for boss
```

---

## 🐛 Troubleshooting

### "No mesh object found"
- Make sure you've imported your model
- Check that it's a mesh (not empty, camera, or light)
- Try selecting the model before running script

### Sprites are too small/large
- Adjust `CAMERA_DISTANCE` in script
- Or adjust `camera.data.ortho_scale` after running setup
- The script auto-frames, but you can tweak it

### Background not transparent
- Make sure `EXPORT_FORMAT = 'PNG'`
- Check `scene.render.film_transparent = True` is set
- Verify world background is set to transparent

### Animation not exporting
- Check that your model has animations
- Verify frame range in Blender timeline
- Set `ANIMATION_START_FRAME` and `ANIMATION_END_FRAME` in script

### Wrong rotation/direction
- Adjust rotation values in `DIRECTIONS`
- Positive Y rotation = counter-clockwise
- Negative Y rotation = clockwise

---

## 📝 Tips & Tricks

1. **Test with one direction first** - Export just "left" to verify settings
2. **Use consistent sprite sizes** - Keep all sprites same size for easier management
3. **Name your animations** - Makes it easier to identify exported sequences
4. **Batch export** - Run script multiple times with different models
5. **Optimize later** - Export at high res (1024), scale down in Phaser if needed

---

## 🎮 Next Steps After Export

1. **Combine into sprite sheets** using TexturePacker/Aseprite
2. **Copy to SID Surfer:**
   ```
   public/sprites/player-left.png
   public/sprites/player-right.png
   public/sprites/enemy-front.png
   ```
3. **Update Phaser code:**
   ```javascript
   this.load.spritesheet('player-left', '/sprites/player-left.png', {
     frameWidth: 512,
     frameHeight: 512
   })
   ```
4. **Create animations:**
   ```javascript
   this.anims.create({
     key: 'player-surf-left',
     frames: this.anims.generateFrameNumbers('player-left', { start: 0, end: 7 }),
     frameRate: 10,
     repeat: -1
   })
   ```

---

## 🚀 Happy Exporting!

If you run into issues, check the Blender console for error messages. The script prints helpful progress info!

