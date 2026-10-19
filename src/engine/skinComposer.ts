import {
  SkinConfig,
  SkinItem,
  SkinCategory,
  ITEM_CATEGORIES,
  isSpecialThemeItem,
  isCategoryAllowedForColoring,
  isItemColorable,
} from '../types/skin';
import { hexToRgb } from '../data/colors';
import { SKIN_ITEMS, ALL_KNOWN_MASKS, BUCKET_MASKS } from '../data/skinItems';
import { getAssetUrl } from '../utils/assetPath';
import { getCustomMaskMapping, hasCustomMaskMapping } from '../services/maskManager';

export { ALL_KNOWN_MASKS, BUCKET_MASKS };

export const CANVAS_WIDTH = 128;
export const CANVAS_HEIGHT = 64;

// Index items by texture name
const itemsByTexture = new Map<string, SkinItem>();
const itemRanks = new Map<string, number>();
const itemMasks = new Map<string, string>();

for (const item of SKIN_ITEMS) {
  if (item.texture) {
    itemsByTexture.set(item.texture, item);
    if (item.rank !== undefined) {
      itemRanks.set(item.texture, item.rank);
    }
    if (item.mask) {
      itemMasks.set(item.texture, item.mask);
    }
  }
}

/**
 * Resolves companion _mask.png for a given texture.
 * Priority:
 * 1. User custom mask mapping from Mask Studio (saved in maskOverrides.json)
 * 2. Explicitly passed mask
 * 3. Registered preset mapping from local catalog
 */
export function resolveItemMask(texture?: string, explicitMask?: string): string | undefined {
  if (!texture || texture === 'blank.png') return undefined;

  // 1. Highest priority: Mask Overrides from Mask Studio
  if (hasCustomMaskMapping(texture)) {
    return getCustomMaskMapping(texture);
  }

  // 2. Explicitly passed mask
  if (explicitMask) return explicitMask;

  // 3. Registered preset mapping
  if (itemMasks.has(texture)) return itemMasks.get(texture);

  // 4. Companion mask convention from known masks
  const companion = texture.replace('.png', '_mask.png');
  if (ALL_KNOWN_MASKS.has(companion)) {
    return companion;
  }

  return undefined;
}

// In-memory cache for texture HTMLImageElements
const imageCache = new Map<string, HTMLImageElement>();
const ongoingRequests = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * Loads a texture or mask strictly from MultiCraft skintexture assets.
 * 100% self-contained local loading without any external network calls.
 */
export async function loadSkinTexture(filename: string): Promise<HTMLImageElement | null> {
  if (!filename || filename === 'blank.png') return null;

  if (imageCache.has(filename)) {
    return imageCache.get(filename)!;
  }

  if (ongoingRequests.has(filename)) {
    return ongoingRequests.get(filename)!;
  }

  const promise = (async () => {
    const candidates = [
      getAssetUrl(`skintexture/${filename}`),
      `/skintexture/${filename}`,
      `./skintexture/${filename}`,
    ];

    for (const url of candidates) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });

        if (loaded && img.naturalWidth > 0) {
          imageCache.set(filename, img);
          return img;
        }
      } catch {
        // Continue to next candidate URL
      }
    }

    console.warn(`Local MultiCraft texture not found: ${filename}`);
    return null;
  })();

  ongoingRequests.set(filename, promise);
  try {
    return await promise;
  } finally {
    ongoingRequests.delete(filename);
  }
}


export function clearComposerCaches(): void {
  colorizedMaskCache.clear();
}

/**
 * Register dynamic items (e.g. from custom additions or external loads)
 */
export function registerDynamicItems(items: SkinItem[]): void {
  for (const item of items) {
    if (item.texture) {
      itemsByTexture.set(item.texture, item);
      if (item.rank !== undefined) {
        itemRanks.set(item.texture, item.rank);
      }
      if (item.mask) {
        itemMasks.set(item.texture, item.mask);
      }
    }
  }
}

/**
 * Helper to identify if an asset is a hairstyle or hair mask.
 */
export function isHairAsset(filenameOrCategory?: string): boolean {
  if (!filenameOrCategory) return false;
  const lower = filenameOrCategory.toLowerCase();
  return lower === 'hair' || lower.includes('hair');
}

/**
 * Renders an image or canvas onto a 128x64 target canvas context.
 * Pixel-perfect integer scaling and hair alignment:
 * - For HAIR (hair texture or hair mask):
 *   - Upper part (0, 0, 64, 32) stays at left (0, 0, 64, 32).
 *   - Down part: in the source 64x64 texture, the lower hair section starts at x = 16.
 *     We draw sx = 16 to dx = 40 so that the down part only moves 40 pixels to right (x = 40),
 *     preventing it from being placed at 56 pixels (16 + 40 = 56).
 *   - 64x32 hair masks (upper head only) stay at left (0, 0, 64, 32) without scaling.
 * - For other 64x32 textures/masks: scaled 2x to fill 128x64.
 * - Otherwise 128x64 native dimensions.
 */
export function drawAlignedTexture(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  isHair = false
): void {
  const w = (img as HTMLImageElement).naturalWidth || img.width;
  const h = (img as HTMLImageElement).naturalHeight || img.height;

  if ((isHair || (w === 64 && h === 64)) && w === 64) {
    // Upper part stays exactly at left (0, 0, 64, 32)
    ctx.drawImage(img, 0, 0, 64, 32, 0, 0, 64, 32);

    // Down part only moves 40 pixels to right -> drawn at (40, 32, 64, 32)
    if (h >= 64) {
      ctx.drawImage(img, 0, 32, 64, 32, 40, 32, 64, 32);
    }
  } else if (w === 64 && h === 32) {
    ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

// In-memory cache for colorized mask canvases
const colorizedMaskCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates a colorized mask for 128x64 resolution textures.
 * Minetest colorize behavior:
 * - User-selected color is applied specifically to the non-transparent pixels (drawn solid pixels).
 * - Preserves original alpha.
 */
export async function getColorizedMask(
  maskFilename: string,
  colorHex: string
): Promise<HTMLCanvasElement | null> {
  const cacheKey = `${maskFilename}_${colorHex}`;
  if (colorizedMaskCache.has(cacheKey)) {
    return colorizedMaskCache.get(cacheKey)!;
  }

  const maskImg = await loadSkinTexture(maskFilename);
  if (!maskImg) return null;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  const isHair = isHairAsset(maskFilename);
  drawAlignedTexture(ctx, maskImg, isHair);

  const { r: cr, g: cg, b: cb } = hexToRgb(colorHex);
  const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imgData.data;

  // Apply solid color specifically to non-transparent pixels of the mask
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      data[i] = cr;
      data[i + 1] = cg;
      data[i + 2] = cb;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  colorizedMaskCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Dynamic detail-preserving color tinting for layers without a dedicated mask.
 */
export async function getDynamicallyTintedTexture(
  textureFilename: string,
  colorHex: string,
  category: string
): Promise<HTMLCanvasElement | null> {
  const cacheKey = `tint_${textureFilename}_${colorHex}_${category}`;
  if (colorizedMaskCache.has(cacheKey)) {
    return colorizedMaskCache.get(cacheKey)!;
  }

  const img = await loadSkinTexture(textureFilename);
  if (!img) return null;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  const isHair = category === 'hair' || isHairAsset(textureFilename);
  drawAlignedTexture(ctx, img, isHair);

  const { r: cr, g: cg, b: cb } = hexToRgb(colorHex);
  const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (category === 'eye') {
      if (lum > 40 && lum < 225) {
        const factor = lum / 255;
        data[i] = Math.round(cr * factor);
        data[i + 1] = Math.round(cg * factor);
        data[i + 2] = Math.round(cb * factor);
      }
    } else if (category === 'footwear') {
      if (lum > 35 && lum < 235) {
        const factor = lum / 255;
        data[i] = Math.round(r * 0.25 + cr * factor * 0.75);
        data[i + 1] = Math.round(g * 0.25 + cg * factor * 0.75);
        data[i + 2] = Math.round(b * 0.25 + cb * factor * 0.75);
      }
    } else {
      const factor = lum / 255;
      data[i] = Math.round(r * 0.25 + cr * factor * 0.75);
      data[i + 1] = Math.round(g * 0.25 + cg * factor * 0.75);
      data[i + 2] = Math.round(b * 0.25 + cb * factor * 0.75);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  colorizedMaskCache.set(cacheKey, canvas);
  return canvas;
}

export interface CompiledLayer {
  category: string;
  texture: string;
  rank: number;
  canvas: HTMLCanvasElement | null;
  img: HTMLImageElement | null;
}

export interface SkinCompileResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  layers: { category: string; texture: string; rank: number; mask?: string; color?: string }[];
}

/**
 * Recreates edit_skin.compile_skin for local MultiCraft skin textures.
 * Layers sorted by rank in ascending order.
 * Strictly adheres to recolor rules and dual-layer non-destructive composition:
 * - companion _mask.png is tinted with user-selected color.
 * - base [item_name].png texture is composited directly on top as an overlay so shading, line art, and highlights remain crisp.
 */
export async function compileSkin(skin: SkinConfig): Promise<SkinCompileResult> {
  const layers: CompiledLayer[] = [];
  const layerMeta: { category: string; texture: string; rank: number; mask?: string; color?: string }[] = [];

  for (let i = 0; i < ITEM_CATEGORIES.length; i++) {
    const category = ITEM_CATEGORIES[i];
    const texture = skin[category as keyof SkinConfig] as string | undefined;

    if (!texture || texture === 'blank.png') {
      continue;
    }

    const defaultRank = (i + 1) * 10;
    const rank = itemRanks.get(texture) ?? defaultRank;

    const colorKey = `${category}_color` as keyof SkinConfig;
    const color = skin[colorKey] as string | undefined;

    // Resolve Companion Mask
    const cachedItem = itemsByTexture.get(texture);
    const mask = resolveItemMask(texture, cachedItem?.mask);

    const item: SkinItem = cachedItem
      ? { ...cachedItem, mask }
      : { type: category, texture, mask, rank };

    const colorable = isItemColorable(item, category as SkinCategory);

    let layerCanvas: HTMLCanvasElement | null = null;
    let textureImg: HTMLImageElement | null = null;

    if (colorable && mask && color) {
      // 1. Dual-layer masking: solid color applied exclusively to non-transparent pixels
      // of the companion _mask.png, with the detailed [item_name].png texture composited
      // directly on top to preserve all native line art, shadows, and highlight details.
      layerCanvas = await getColorizedMask(mask, color);
      textureImg = await loadSkinTexture(texture);
    } else {
      // 2. When NO _mask.png exists or item is non-colorable:
      // Render the base texture directly as a static, fixed layer with zero color adjustments.
      textureImg = await loadSkinTexture(texture);
    }

    layers.push({
      category,
      texture,
      rank,
      canvas: layerCanvas,
      img: textureImg,
    });

    layerMeta.push({
      category,
      texture,
      rank,
      mask: colorable ? mask : undefined,
      color: colorable ? color : undefined,
    });
  }

  // Sort layers by rank ascending
  layers.sort((a, b) => a.rank - b.rank);
  layerMeta.sort((a, b) => a.rank - b.rank);

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const layer of layers) {
      if (layer.canvas) {
        // Base color-tinted mask layer underneath
        ctx.drawImage(layer.canvas, 0, 0);
      }
      if (layer.img) {
        // Detailed overlay texture directly on top (preserves line-art, shading, highlights)
        const isHair = layer.category === 'hair' || isHairAsset(layer.texture);
        drawAlignedTexture(ctx, layer.img, isHair);
      }
    }
  }

  const dataUrl = canvas.toDataURL('image/png');

  return {
    canvas,
    dataUrl,
    layers: layerMeta,
  };
}

/**
 * Generates an item card preview texture (128x64).
 * Accurately demonstrates tinted mask underneath and texture overlay on top.
 */
export async function compileItemPreviewTexture(
  item: SkinItem,
  baseTexture: string,
  categoryColor?: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // 1. Base skin context (for clothing, hair, footwear preview)
  if (item.type !== 'base' && baseTexture && baseTexture !== 'blank.png') {
    const baseMask = resolveItemMask(baseTexture);
    if (baseMask) {
      const baseMaskCanvas = await getColorizedMask(baseMask, '#eeb592');
      if (baseMaskCanvas) {
        ctx.drawImage(baseMaskCanvas, 0, 0);
      }
    }
    const baseImg = await loadSkinTexture(baseTexture);
    if (baseImg) {
      drawAlignedTexture(ctx, baseImg, false);
    }
  }

  // 2. Item with mask/color
  if (item.texture && item.texture !== 'blank.png') {
    const mask = item.mask || resolveItemMask(item.texture);
    const itemWithMask: SkinItem = { ...item, mask };
    const colorable = isItemColorable(itemWithMask);
    const isHair = item.type === 'hair' || isHairAsset(item.texture);

    if (mask && categoryColor && colorable) {
      const maskCanvas = await getColorizedMask(mask, categoryColor);
      if (maskCanvas) {
        ctx.drawImage(maskCanvas, 0, 0);
      }
      const itemImg = await loadSkinTexture(item.texture);
      if (itemImg) {
        drawAlignedTexture(ctx, itemImg, isHair);
      }
    } else {
      const itemImg = await loadSkinTexture(item.texture);
      if (itemImg) {
        drawAlignedTexture(ctx, itemImg, isHair);
      }
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Preloads foundational skin textures & companion masks
 */
export async function preloadAllAssets(): Promise<void> {
  const essentials = [
    'edit_skin_base_1.png',
    'edit_skin_base_1_mask.png',
    'edit_skin_hair_5.png',
    'edit_skin_hair_5_mask.png',
    'edit_skin_top_1.png',
    'edit_skin_top_1_mask.png',
    'edit_skin_bottom_4.png',
    'edit_skin_bottom_4_mask.png',
    'edit_skin_eye_1.png',
    'edit_skin_footwear_1.png',
    'edit_skin_mouth_1.png',
  ];

  await Promise.allSettled(essentials.map((f) => loadSkinTexture(f)));
}

/**
 * First-person hand texture (128x64)
 */
export async function compileHandTexture(
  baseTexture: string,
  baseColor: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const baseMask = itemMasks.get(baseTexture);
  if (baseMask && baseColor) {
    const colorizedMask = await getColorizedMask(baseMask, baseColor);
    if (colorizedMask) {
      ctx.drawImage(colorizedMask, 0, 0);
    }
  }

  if (baseTexture && baseTexture !== 'blank.png') {
    const baseImg = await loadSkinTexture(baseTexture);
    if (baseImg) {
      drawAlignedTexture(ctx, baseImg);
    }
  }

  return canvas.toDataURL('image/png');
}
