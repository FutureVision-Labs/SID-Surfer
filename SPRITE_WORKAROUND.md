# 🎨 Sprite Conversion Workarounds (While TSA is Fixed)

## 🚀 Quick Option 1: Blender Image Sequence Export (FASTEST)

### Steps:
1. **Set up your model in Blender**
   - Import your 3D model
   - Set up camera (orthographic, side view)
   - Set render resolution (e.g., 512x512 per frame)

2. **Render animation to image sequence:**
   ```
   - Render → Render Animation
   - Output: PNG sequence
   - Frame range: Your animation frames
   - Each direction = separate render pass
   ```

3. **Combine into sprite sheet:**
   - Use a tool like:
     - **Aseprite** (has sprite sheet import)
     - **TexturePacker** (free version available)
     - **Online tool:** https://ezgif.com/maker
   - Or use ImageMagick command line:
     ```bash
     montage *.png -tile 8x1 -geometry 512x512+0+0 spritesheet.png
     ```

### Pros:
- ✅ Works immediately
- ✅ Full control over output
- ✅ No tool bugs

### Cons:
- ⚠️ Manual per-animation
- ⚠️ Need to organize frames

---

## 🔧 Quick Option 2: Fix TSA Export Post-Process

If TSA exports but has bugs, we can fix the output:

### For "Oversized Cutoff Sprites":
- Use ImageMagick or GIMP to crop sprites to correct size
- Batch script to process all exported sheets

### For "Animations Bleeding Across Rows":
- Split the sprite sheet by rows
- Re-combine with proper spacing
- Or use Phaser's frame extraction to only use specific rows

### Quick Fix Script (if we can identify the issue):
```javascript
// Post-process TSA output
// Split rows, crop sprites, recombine
```

---

## 🎯 Quick Option 3: Use Unity Tool (You Already Have It!)

You have **ModelToSpriteSheetConverterPro** working for another project!

### Steps:
1. Open Unity project with the tool
2. Import SID Surfer models
3. Export with same settings
4. Copy sprites to SID Surfer project

### Pros:
- ✅ Tool already works
- ✅ Batch processing
- ✅ Professional output

### Cons:
- ⚠️ Need to set up Unity project
- ⚠️ Might have same bugs?

---

## 🛠️ Option 4: Fix TSA Properly (After Jam)

### What we need to investigate:
1. **Oversized sprites bug:**
   - Check sprite bounds calculation
   - Verify frame size vs actual sprite size
   - Look for padding/margin issues

2. **Animation row bleeding:**
   - Check row isolation logic
   - Verify frame extraction per row
   - Look for frame count per row calculation

### TSA Codebase Location:
- Need to find TSA project folder
- Check export logic
- Fix frame extraction

---

## 💡 Recommendation for NOW:

**Use Blender Image Sequence + TexturePacker/Aseprite:**
1. Render each animation direction as PNG sequence
2. Use TexturePacker to combine into sprite sheets
3. Import to Phaser
4. **Ship the game!** 🚀

**Then fix TSA properly after the jam!**

---

## 📝 Quick Blender Setup Script:

```python
# Blender Python script for sprite export
import bpy
import os

# Set output path
output_path = "C:/path/to/sprites/"
bpy.context.scene.render.filepath = output_path

# Set render settings
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.resolution_x = 512
bpy.context.scene.render.resolution_y = 512

# Render animation
bpy.ops.render.render(animation=True)
```

---

## 🎮 For SID Surfer Specifically:

**What sprites do you need?**
- Player character (surfer)
- Enemies
- Boss
- Power-ups (already have images!)

**Priority:**
1. Player character (most important!)
2. Enemies
3. Boss (can use placeholder longer)

Let me know which approach you want to try! 🎨

