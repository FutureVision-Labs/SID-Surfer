"""
Blender Sprite Export Script for SID Surfer
Exports 3D models as sprite sequences for game development

Usage:
1. Open Blender
2. Import your 3D model
3. Set up animations (if needed)
4. Run this script: Scripting workspace → New → Paste script → Run
5. Sprites will be exported to the specified output folder
"""

import bpy
import os
import math
from mathutils import Vector, Euler

# ============================================================================
# CONFIGURATION - Adjust these settings!
# ============================================================================

# Output folder (will be created if it doesn't exist)
OUTPUT_FOLDER = "C:/Users/cayne/Documents/SIDSurfer/sid-surfer/sprites_export"

# Sprite settings
SPRITE_SIZE = 512  # Width and height in pixels (power of 2 recommended: 256, 512, 1024)
FRAME_RATE = 10  # Frames per second for animation
BACKGROUND_COLOR = (0, 0, 0, 0)  # RGBA - (0,0,0,0) = transparent

# Camera settings
CAMERA_DISTANCE = 5.0  # Distance from model
CAMERA_ANGLE = 90  # Camera angle (90 = side view, 0 = front view)

# Export settings
EXPORT_FORMAT = 'PNG'  # PNG (transparent) or JPEG
EXPORT_ANIMATIONS = True  # Export animation frames
EXPORT_STATIC = False  # Export single static frame

# Animation settings
ANIMATION_START_FRAME = 1
ANIMATION_END_FRAME = None  # None = use scene end frame

# Directions to export (for multi-directional sprites)
# Each direction is (name, rotation_y_degrees)
DIRECTIONS = [
    ("left", 90),      # Facing left
    ("right", -90),    # Facing right
    ("front", 0),      # Facing front
    ("back", 180),     # Facing back
]

# ============================================================================
# SCRIPT - Don't modify below unless you know what you're doing!
# ============================================================================

def setup_camera():
    """Set up orthographic camera for sprite rendering"""
    # Get or create camera
    if "SpriteCamera" not in bpy.data.objects:
        bpy.ops.object.camera_add(location=(0, -CAMERA_DISTANCE, 0))
        camera = bpy.context.active_object
        camera.name = "SpriteCamera"
    else:
        camera = bpy.data.objects["SpriteCamera"]
    
    # Set camera to orthographic
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 2.0  # Adjust to fit your model
    
    # Position camera
    camera.location = (0, -CAMERA_DISTANCE, 0)
    camera.rotation_euler = Euler((1.5708, 0, 0), 'XYZ')  # 90 degrees on X axis
    
    # Make it active
    bpy.context.scene.camera = camera
    
    return camera

def setup_lighting():
    """Set up basic lighting for sprite rendering"""
    # Remove default light if it exists
    if "Light" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["Light"], do_unlink=True)
    
    # Add key light (main light)
    bpy.ops.object.light_add(type='SUN', location=(2, -2, 3))
    key_light = bpy.context.active_object
    key_light.name = "KeyLight"
    key_light.data.energy = 3.0
    key_light.rotation_euler = Euler((0.785, 0.785, 0), 'XYZ')
    
    # Add fill light (softer, opposite side)
    bpy.ops.object.light_add(type='SUN', location=(-2, -2, 2))
    fill_light = bpy.context.active_object
    fill_light.name = "FillLight"
    fill_light.data.energy = 1.5
    fill_light.rotation_euler = Euler((0.785, -0.785, 0), 'XYZ')

def setup_render_settings():
    """Configure render settings for sprite export"""
    scene = bpy.context.scene
    
    # Resolution
    scene.render.resolution_x = SPRITE_SIZE
    scene.render.resolution_y = SPRITE_SIZE
    scene.render.resolution_percentage = 100
    
    # Output format
    if EXPORT_FORMAT == 'PNG':
        scene.render.image_settings.file_format = 'PNG'
        scene.render.image_settings.color_mode = 'RGBA'
        scene.render.image_settings.color_depth = '16'
        scene.render.film_transparent = True  # Transparent background
    else:
        scene.render.image_settings.file_format = 'JPEG'
        scene.render.image_settings.color_mode = 'RGB'
        scene.render.image_settings.quality = 95
    
    # Frame rate
    scene.render.fps = FRAME_RATE
    
    # Anti-aliasing
    scene.render.antialiasing_samples = '8'
    
    # Set background to transparent (if PNG)
    if EXPORT_FORMAT == 'PNG':
        scene.render.film_transparent = True
        # Set world background to transparent
        world = bpy.context.scene.world
        if world:
            world.use_nodes = True
            bg = world.node_tree.nodes.get('Background')
            if bg:
                bg.inputs['Color'].default_value = (*BACKGROUND_COLOR[:3], 1)
                bg.inputs['Strength'].default_value = 0

def frame_model(model_name=None):
    """Frame the camera to fit the model"""
    # Select the model (use active object if no name specified)
    if model_name and model_name in bpy.data.objects:
        obj = bpy.data.objects[model_name]
    else:
        # Find the first mesh object that's not the camera or lights
        obj = None
        for o in bpy.data.objects:
            if o.type == 'MESH' and o.name not in ["SpriteCamera", "KeyLight", "FillLight"]:
                obj = o
                break
    
    if not obj:
        print("Warning: No model found to frame!")
        return
    
    # Calculate bounding box
    bbox_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    
    # Find min/max
    min_x = min(corner.x for corner in bbox_corners)
    max_x = max(corner.x for corner in bbox_corners)
    min_y = min(corner.y for corner in bbox_corners)
    max_y = max(corner.y for corner in bbox_corners)
    min_z = min(corner.z for corner in bbox_corners)
    max_z = max(corner.z for corner in bbox_corners)
    
    # Calculate center and size
    center = Vector((
        (min_x + max_x) / 2,
        (min_y + max_y) / 2,
        (min_z + max_z) / 2
    ))
    
    size_x = max_x - min_x
    size_y = max_y - min_y
    size_z = max_z - min_z
    max_size = max(size_x, size_y, size_z)
    
    # Adjust camera ortho scale to fit
    camera = bpy.data.objects.get("SpriteCamera")
    if camera:
        # Add some padding (10%)
        camera.data.ortho_scale = max_size * 1.1

def export_sprite_sequence(model_name, direction_name, rotation_y, output_path):
    """Export sprite sequence for a specific direction"""
    # Find the model
    obj = None
    if model_name and model_name in bpy.data.objects:
        obj = bpy.data.objects[model_name]
    else:
        # Find first mesh object
        for o in bpy.data.objects:
            if o.type == 'MESH' and o.name not in ["SpriteCamera", "KeyLight", "FillLight"]:
                obj = o
                break
    
    if not obj:
        print(f"Error: Model '{model_name}' not found!")
        return False
    
    # Store original rotation
    original_rotation = obj.rotation_euler.copy()
    
    # Rotate model for this direction
    obj.rotation_euler = Euler((0, math.radians(rotation_y), 0), 'XYZ')
    
    # Frame the camera
    frame_model(obj.name)
    
    # Set output path
    direction_folder = os.path.join(output_path, direction_name)
    os.makedirs(direction_folder, exist_ok=True)
    
    scene = bpy.context.scene
    scene.render.filepath = os.path.join(direction_folder, f"{model_name}_{direction_name}_")
    
    # Determine frame range
    start_frame = ANIMATION_START_FRAME
    end_frame = ANIMATION_END_FRAME if ANIMATION_END_FRAME else scene.frame_end
    
    # Export
    if EXPORT_ANIMATIONS and end_frame > start_frame:
        print(f"Exporting animation: {direction_name} (frames {start_frame}-{end_frame})...")
        scene.frame_start = start_frame
        scene.frame_end = end_frame
        bpy.ops.render.render(animation=True)
        print(f"✓ Exported {end_frame - start_frame + 1} frames to {direction_folder}")
    elif EXPORT_STATIC:
        print(f"Exporting static sprite: {direction_name}...")
        scene.frame_set(start_frame)
        bpy.ops.render.render(write_still=True)
        print(f"✓ Exported static sprite to {direction_folder}")
    
    # Restore original rotation
    obj.rotation_euler = original_rotation
    
    return True

def main():
    """Main export function"""
    
    print("=" * 60)
    print("SID Surfer Sprite Export Script")
    print("=" * 60)
    
    # Create output folder
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    print(f"Output folder: {OUTPUT_FOLDER}")
    
    # Setup
    print("\nSetting up camera and lighting...")
    setup_camera()
    setup_lighting()
    setup_render_settings()
    
    # Find the model to export
    model_name = None
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and obj.name not in ["SpriteCamera", "KeyLight", "FillLight"]:
            model_name = obj.name
            print(f"Found model: {model_name}")
            break
    
    if not model_name:
        print("ERROR: No mesh object found! Please import your model first.")
        return
    
    # Export each direction
    print(f"\nExporting {len(DIRECTIONS)} directions...")
    for direction_name, rotation_y in DIRECTIONS:
        export_sprite_sequence(model_name, direction_name, rotation_y, OUTPUT_FOLDER)
    
    print("\n" + "=" * 60)
    print("Export complete!")
    print(f"Sprites saved to: {OUTPUT_FOLDER}")
    print("\nNext steps:")
    print("1. Use TexturePacker or Aseprite to combine frames into sprite sheets")
    print("2. Copy sprite sheets to SID Surfer's public/sprites/ folder")
    print("3. Update Phaser code to load the new sprites")
    print("=" * 60)

# Run the script
if __name__ == "__main__":
    main()

