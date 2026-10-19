import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { SkinItem } from '../types/skin';
import { compileItemPreviewTexture } from './skinComposer';
import { getAssetUrl } from '../utils/assetPath';

const objCache = new Map<string, THREE.Group>();
const objTextCache = new Map<string, string>();
const thumbnailCache = new Map<string, string>();

export function clearThumbnailCache(): void {
  thumbnailCache.clear();
}

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;

function getSharedRenderer(): {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
} {
  if (!sharedRenderer) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    sharedRenderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false, // crisp pixel art!
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setSize(128, 128, false);
    sharedRenderer.setClearColor(0x000000, 0);

    sharedScene = new THREE.Scene();
    sharedCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    // Subtle ambient + directional light for clear pixel texture
    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    sharedScene.add(amb);

    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(2, 4, 3);
    sharedScene.add(dir);
  }

  return {
    renderer: sharedRenderer,
    scene: sharedScene!,
    camera: sharedCamera!,
  };
}

async function loadObjModel(modelName: string): Promise<THREE.Group> {
  if (objCache.has(modelName)) {
    return objCache.get(modelName)!.clone();
  }

  let text = objTextCache.get(modelName);
  if (!text) {
    const res = await fetch(getAssetUrl(`assets/models/${modelName}`));
    text = await res.text();
    objTextCache.set(modelName, text);
  }

  const loader = new OBJLoader();
  const obj = loader.parse(text);
  objCache.set(modelName, obj);
  return obj.clone();
}

export async function renderItemThumbnail(
  item: SkinItem,
  baseTexture: string,
  categoryColor?: string
): Promise<string> {
  if (!item.texture || item.texture === 'blank.png') {
    return '';
  }

  const cacheKey = `${item.texture}_${baseTexture}_${categoryColor || 'none'}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  let meshName = 'edit_skin_head.obj';
  if (item.type === 'top') {
    meshName = 'edit_skin_top.obj';
  } else if (item.type === 'bottom' || item.type === 'footwear') {
    meshName = 'edit_skin_bottom.obj';
  }

  try {
    const [textureDataUrl, model] = await Promise.all([
      compileItemPreviewTexture(item, baseTexture, categoryColor),
      loadObjModel(meshName),
    ]);

    const { renderer, scene, camera } = getSharedRenderer();

    // Load texture into Three.js
    const textureLoader = new THREE.TextureLoader();
    const texture = await new Promise<THREE.Texture>((resolve) => {
      textureLoader.load(textureDataUrl, (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        resolve(tex);
      });
    });

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      alphaTest: 0.1,
    });

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
      }
    });

    // Compute bounding box and center
    const bbox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    model.position.sub(center);

    // Set rotation matching Minetest:
    // Minetest formspec model: rot_x, rot_y in degrees
    const rotXDeg = item.preview_rotation?.x ?? -10;
    const rotYDeg = item.preview_rotation?.y ?? 20;

    // Convert to radians (adjusting axes for Three.js camera)
    model.rotation.set(
      THREE.MathUtils.degToRad(-rotXDeg),
      THREE.MathUtils.degToRad(180 + rotYDeg),
      0
    );

    // Adjust camera distance based on bounding box
    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position.set(0, 0, maxDim * 1.8);
    camera.lookAt(0, 0, 0);

    // Clear previous models from scene (keeping lights)
    const objectsToRemove: THREE.Object3D[] = [];
    scene.children.forEach((c) => {
      if (c.type === 'Group') objectsToRemove.push(c);
    });
    objectsToRemove.forEach((c) => scene.remove(c));

    scene.add(model);
    renderer.render(scene, camera);

    const dataUrl = renderer.domElement.toDataURL('image/png');
    thumbnailCache.set(cacheKey, dataUrl);

    // Clean up texture
    texture.dispose();
    material.dispose();

    return dataUrl;
  } catch (err) {
    console.error('Failed to render thumbnail for', item.texture, err);
    return '';
  }
}

export async function loadHandModel(): Promise<THREE.Group> {
  return loadObjModel('edit_skin_hand.obj');
}
