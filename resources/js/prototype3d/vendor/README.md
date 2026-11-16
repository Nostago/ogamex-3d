Three.js 0.160.1 (MIT), matching the existing vendored core.

GLTFLoader.js and its BufferGeometryUtils.js dependency were extracted from the
published three@0.160.1 npm package. Only their `three` imports were changed to
resolve the existing local three.module.min.js. See THREE-LICENSE.
No second Three.js runtime, CDN, Draco decoder or additional npm dependency.
