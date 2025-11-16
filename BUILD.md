# 📦 SID Surfer - Build & Packaging Guide

## 🚀 Quick Build for itch.io

### 1. Production Build
```bash
npm run build
```

This creates a `dist/` folder with all optimized assets.

### 2. Test the Build Locally
```bash
npm run preview
```

Opens the production build at `http://localhost:4173` to verify everything works.

### 3. Package for itch.io

**Option A: Zip the dist folder (Recommended)**
```bash
# On Windows (PowerShell)
Compress-Archive -Path dist\* -DestinationPath sid-surfer-itch.zip -Force

# Or manually zip the contents of the dist folder
```

**Option B: Upload dist folder directly**
- Some itch.io setups allow uploading a folder directly
- Check itch.io's upload interface for options

### 4. Upload to itch.io (Embedded Web Version)

**Option A: Upload as ZIP (Recommended for embedding)**
1. Go to your game's itch.io page
2. Click "Upload new file"
3. Upload the `sid-surfer-itch.zip` file
4. Set the **Kind** to **"HTML"**
5. ✅ **Enable "This file will be played in the browser"** (IMPORTANT!)
6. Set **Viewport size** to match your game (e.g., 1024x768)
7. Save and test - the game will embed directly on the page!

**Option B: Upload dist folder contents**
- Some itch.io setups allow uploading a folder directly
- If available, upload the contents of the `dist/` folder
- Still set Kind to "HTML" and enable browser play

**The game will play directly on the itch.io page - no download needed!** 🎉

---

## 📋 Build Checklist

Before building, ensure:
- [ ] All SID tracks are in `public/sid/` with proper manifest.json
- [ ] All audio cues are in `public/audio/cues/`
- [ ] All sprites are in `public/sprites/`
- [ ] Title image is at `public/title.jpg`
- [ ] Composer posters are in `public/posters/`
- [ ] Test the game thoroughly in dev mode
- [ ] Check browser console for errors

---

## 🎯 Build Output Structure

```
dist/
├── index.html          # Main HTML file
├── assets/
│   ├── main-[hash].js  # Bundled JavaScript
│   ├── style-[hash].css # Bundled CSS
│   └── [other assets]  # Images, audio, etc.
└── [public assets]     # Copied from public/
```

---

## 🔧 Advanced: Electron Desktop Build (Optional)

If you want a desktop version later:

1. Install Electron:
```bash
npm install --save-dev electron electron-builder
```

2. Create `electron/main.js` (Electron entry point)

3. Update `package.json`:
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:build": "electron-builder"
  }
}
```

4. Build desktop app:
```bash
npm run build
npm run electron:build
```

---

## 📊 Asset Optimization Tips

### Audio Files
- Consider compressing MP3s if file sizes are large
- Use appropriate bitrates (128kbps is usually fine for game audio)

### Images
- Optimize PNGs with tools like TinyPNG
- Consider WebP format for better compression (with fallbacks)

### SID Files
- These are already small, no optimization needed!

---

## 🐛 Troubleshooting

**Build fails:**
- Check for import errors in console
- Ensure all assets exist in `public/`
- Verify `vite.config.js` is correct

**Game doesn't load on itch.io:**
- Ensure `base: './'` is set in `vite.config.js`
- Check that all asset paths are relative
- Test the build locally with `npm run preview`

**Assets missing:**
- Verify `public/` folder structure matches code
- Check browser console for 404 errors
- Ensure asset paths use relative URLs

---

## 📝 Version Management

Update version in `package.json` before each release:
```json
{
  "version": "1.0.0"
}
```

---

## 🎮 itch.io Upload Settings

**Recommended Settings:**
- **Kind:** HTML
- **This file will be played in the browser:** ✅ YES (enables embedding!)
- **Embed options:** Allow embedding
- **Viewport size:** 1024x800 (matches game resolution)
- **Controls:** Keyboard (document your controls!)
- **Fullscreen:** Optional (players can use browser fullscreen)

**Important:** Make sure "This file will be played in the browser" is checked, otherwise it will just be a download link!

**Tags:**
- `game-jam`
- `game-off-2025`
- `waves`
- `retro`
- `music`
- `rhythm`
- `commodore-64`
- `sid`

---

Happy packaging! 🎉

