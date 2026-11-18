"""Blender 4.3+: reduce an original GLB while retaining Blender's UV/normal mapping.

Development only. Never run against an already reduced or compressed web asset.
Usage: blender -b -t 4 --python scripts/assets/prepare-ship-preview.py -- original.glb output-directory --key crawler
"""
import argparse
import hashlib
import json
import pathlib
import sys

import bpy
import numpy as np
from mathutils import Vector, kdtree

parser = argparse.ArgumentParser()
parser.add_argument('source', type=pathlib.Path)
parser.add_argument('output', type=pathlib.Path)
parser.add_argument('--key', required=True)
parser.add_argument('--target-triangles', type=int, default=65000)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if not meshes:
    raise RuntimeError('Source contains no mesh')


def points(objects):
    return np.array([tuple(obj.matrix_world @ vertex.co)
                     for obj in objects for vertex in obj.data.vertices], dtype=np.float64)


def gltf_bounds(vertices):
    # Blender world Z-up to glTF world Y-up. No changes to the source orientation.
    transformed = vertices[:, [0, 2, 1]].copy()
    transformed[:, 2] *= -1
    return {'min': transformed.min(axis=0).tolist(), 'max': transformed.max(axis=0).tolist()}


source_vertices = points(meshes)
source_min, source_max = source_vertices.min(axis=0), source_vertices.max(axis=0)
extent = float(max(source_max - source_min))
if extent <= 0:
    raise RuntimeError('Source has empty bounds')
source_triangles = sum(sum(len(face.vertices) - 2 for face in obj.data.polygons) for obj in meshes)
reference = kdtree.KDTree(len(source_vertices))
for index, point in enumerate(source_vertices):
    reference.insert(Vector(point), index)
reference.balance()

for obj in meshes:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    ratio = min(1.0, args.target_triangles / source_triangles)
    if ratio < 1:
        modifier = obj.modifiers.new('Web preview: preserve mapped mesh attributes', 'DECIMATE')
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.update()

reduced_vertices = points(meshes)
boundary_error = max(float(np.max(source_min - reduced_vertices.min(axis=0))),
                     float(np.max(reduced_vertices.max(axis=0) - source_max)), 0.0)
sample = reduced_vertices[::max(1, len(reduced_vertices) // 4096)]
distances = np.array([reference.find(Vector(point))[2] for point in sample])
if boundary_error > extent * .01 or float(np.quantile(distances, .99)) > extent * .01 or float(distances.max()) > extent * .025:
    raise RuntimeError('Reduction deviates from original surface; increase the detail budget')

for index, image in enumerate(bpy.data.images):
    if image.source == 'VIEWER' or not image.size[0] or not image.size[1]:
        continue
    width, height = image.size[:]
    if max(width, height) > 1024:
        factor = 1024 / max(width, height)
        image.scale(max(1, round(width * factor)), max(1, round(height * factor)))
    # A lossless intermediate avoids JPEG + WebP double compression and retains alpha.
    image.file_format = 'PNG'
    image.filepath_raw = str((args.output / f'{args.key}-texture-{index}.png').resolve())
    image.save()
    image.pack()

bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
    parent = obj.parent
    while parent:
        parent.select_set(True)
        parent = parent.parent
destination = args.output / f'{args.key}-reduced.glb'
bpy.ops.export_scene.gltf(filepath=str(destination.resolve()), export_format='GLB',
                          use_selection=True, export_apply=True, export_yup=True,
                          export_image_format='AUTO', export_animations=False,
                          export_cameras=False, export_lights=False)
report = {
    'name': args.source.name,
    'model_id': args.key,
    'source_sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
    'source_bytes': args.source.stat().st_size,
    'source_triangles': source_triangles,
    'output_triangles': sum(sum(len(face.vertices) - 2 for face in obj.data.polygons) for obj in meshes),
    'source_bounds_gltf': gltf_bounds(source_vertices),
    'reduced_bounds_gltf': gltf_bounds(reduced_vertices),
    'texture_max_resolution': 1024,
    'geometry_repair_pending': False,
    'reduction': 'Blender DECIMATE with original UV/normal attributes; no manual vertex-index remapping',
    'surface_check': {
        'source_extent': extent,
        'sample_count': len(sample),
        'max_boundary_error': boundary_error,
        'nearest_original_vertex_p99': float(np.quantile(distances, .99)),
        'nearest_original_vertex_max': float(distances.max()),
    },
}
(args.output / f'{args.key}-preparation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
