"""Blender 4.3+: reduce the supplied GLB and render its 35-degree front thumbnail.
Run: blender -b -t 6 --python scripts/assets/prepare-light-fighter.py -- input.glb output-directory
The original input is never overwritten. No game rules or ship counts are involved.
"""
import argparse
import json
import math
import pathlib
import sys
import bpy
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('source', type=pathlib.Path)
parser.add_argument('output', type=pathlib.Path)
parser.add_argument('--ratio', type=float, default=0.05)
parser.add_argument('--slug', default='light-fighter')
parser.add_argument('--name', default='Light Fighter')
parser.add_argument('--yaw', type=float, default=0, help='Blender Z rotation to align the nose with +X')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if len(objects) != 1:
    raise RuntimeError('This preparation profile expects a single-mesh ship.')
obj = objects[0]
obj.name = args.name
obj.data.name = args.name + ' hull'
obj.matrix_world = Matrix.Rotation(math.radians(args.yaw), 4, 'Z') @ obj.matrix_world
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
original_triangles = sum(len(face.vertices) - 2 for face in obj.data.polygons)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
modifier = obj.modifiers.new('Web preview reduction', 'DECIMATE')
modifier.ratio = args.ratio
modifier.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier=modifier.name)
for image in bpy.data.images:
    if image.source != 'VIEWER' and image.size[0] > 1024:
        image.scale(1024, 1024)
        image.file_format = 'JPEG'
        image.filepath_raw = str((args.output / f'{args.slug}-albedo.jpg').resolve())
        image.save()
        image.pack()
        image.name = args.name + ' albedo'
for material in obj.data.materials:
    material.name = args.name + ' hull'
obj.data.update()
output = args.output / f'{args.slug}.glb'
bpy.ops.export_scene.gltf(filepath=str(output.resolve()), export_format='GLB', use_selection=True,
    export_apply=True, export_yup=True, export_image_format='JPEG', export_jpeg_quality=88,
    export_animations=False, export_cameras=False, export_lights=False)
# Neutral studio rendering, aligned with the browser's camera: +X is the nose.
center = sum((obj.matrix_world @ Vector(corner) for corner in obj.bound_box), Vector()) / 8
obj.location -= center
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = False
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new('Studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.08, .11, .16, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .7
scene.view_settings.view_transform = 'AgX'
for name, position, power, size in [('Key', (1, -2, 3), 240, 3), ('Fill', (-2, 1, 2), 150, 3), ('Rim', (1, 2, 2), 180, 2)]:
    light = bpy.data.lights.new(name, 'AREA')
    light.energy, light.shape, light.size = power, 'DISK', size
    node = bpy.data.objects.new(name, light)
    scene.collection.objects.link(node)
    node.location = position
    node.rotation_euler = (-node.location).to_track_quat('-Z', 'Y').to_euler()
camera = bpy.data.objects.new('Thumbnail camera', bpy.data.cameras.new('Thumbnail camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.lens = 60
azimuth, elevation = math.radians(35), math.radians(22)
camera.location = Vector((math.cos(azimuth), -math.sin(azimuth), math.tan(elevation))) * 1.65
camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()
frame = camera.data.view_frame(scene=scene)
horizontal = max(abs(point.x / point.z) for point in frame)
vertical = max(abs(point.y / point.z) for point in frame)
direction = camera.location.normalized()
rotation = camera.rotation_euler.to_matrix()
right = rotation @ Vector((1, 0, 0))
up = rotation @ Vector((0, 1, 0))
distance = .1
for vertex in obj.data.vertices:
    point = obj.matrix_world @ vertex.co
    depth = point.dot(direction)
    distance = max(distance, depth + abs(point.dot(right)) / horizontal,
                   depth + abs(point.dot(up)) / vertical)
camera.location = direction * distance * 1.10
scene.render.filepath = str((args.output / f'{args.slug}-35.png').resolve())
bpy.ops.render.render(write_still=True)
report = {'sourceBytes': args.source.stat().st_size, 'sourceTriangles': original_triangles,
    'modelBytes': output.stat().st_size, 'triangles': sum(len(face.vertices) - 2 for face in obj.data.polygons),
    'textureSize': 1024, 'frontAzimuth': 35, 'elevation': 22, 'sourceYaw': args.yaw}
(args.output / 'preparation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
