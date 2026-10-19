import maskOverridesData from '../data/maskOverrides.json';
import { ALL_KNOWN_MASKS } from '../data/skinItems';

const STORAGE_KEY = 'multicraft_custom_masks_v1';

// Mutable in-memory store of active mask mappings
const activeMaskMappings: Record<string, string> = {
  ...(maskOverridesData as Record<string, string>),
};

// Merge any user additions while guaranteeing all master maskOverridesData entries are active
try {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    const parsed = JSON.parse(local);
    Object.assign(activeMaskMappings, {
      ...parsed,
      ...(maskOverridesData as Record<string, string>),
    });
  }
} catch {
  // Ignore localStorage parsing error in SSR / tests
}

// Listeners for live reactive updates
type MaskChangeListener = (mappings: Record<string, string>) => void;
const listeners = new Set<MaskChangeListener>();

export function subscribeMaskChanges(listener: MaskChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener({ ...activeMaskMappings });
    } catch (e) {
      console.warn('Mask change listener error:', e);
    }
  }
}

/**
 * Returns the currently active mask override for a given texture.
 * If explicitly set to empty string or null, it indicates "no mask".
 */
export function getCustomMaskMapping(texture?: string): string | undefined {
  if (!texture) return undefined;
  if (texture in activeMaskMappings) {
    const val = activeMaskMappings[texture];
    return val && val !== 'none' ? val : undefined;
  }
  return undefined;
}

/**
 * Returns whether a texture has an explicit mapping (even if explicitly 'none').
 */
export function hasCustomMaskMapping(texture: string): boolean {
  return texture in activeMaskMappings;
}

/**
 * Returns all current mask mappings as a shallow clone.
 */
export function getAllMaskMappings(): Record<string, string> {
  return { ...activeMaskMappings };
}

/**
 * Saves all mappings to server disk file (src/data/maskOverrides.json) and localStorage.
 */
export async function persistMaskMappings(
  mappings: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  Object.assign(activeMaskMappings, mappings);

  // 1. Local backup
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeMaskMappings));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }

  // 2. Server file persistence
  try {
    const res = await fetch('/api/save-masks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeMaskMappings),
    });
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }
    const result = await res.json();
    notifyListeners();
    return { success: true };
  } catch (err: any) {
    console.warn('Saved locally, but failed to write to /api/save-masks:', err);
    notifyListeners();
    return { success: true, error: 'Saved to browser storage (server file write unavailable)' };
  }
}

/**
 * Assigns or clears a mask for a specific texture.
 */
export async function setTextureMask(
  texture: string,
  mask: string | undefined | null
): Promise<{ success: boolean; error?: string }> {
  if (!mask || mask === 'none') {
    delete activeMaskMappings[texture];
  } else {
    activeMaskMappings[texture] = mask;
  }

  return persistMaskMappings(activeMaskMappings);
}

/**
 * Loads the latest mask overrides from the server file.
 */
export async function syncMaskOverridesFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/load-masks');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        Object.assign(activeMaskMappings, data);
        notifyListeners();
      }
    }
  } catch (err) {
    console.warn('Could not load mask overrides from server:', err);
  }
}

/**
 * Strictly returns only masks corresponding to the specified category.
 * - 'top' -> only edit_skin_top_*_mask.png
 * - 'bottom' -> only edit_skin_bottom_*_mask.png
 * - 'hair' -> only edit_skin_hair_*_mask.png
 * - 'footwear' -> only edit_skin_footwear_*_mask.png
 * - 'eye' -> only edit_skin_eye_*_mask.png
 * - 'mouth' -> only edit_skin_mouth_*_mask.png
 * - 'base' -> only edit_skin_base_*_mask.png
 */
export function getAvailableMasksForCategory(category: string): string[] {
  const allMasks = Array.from(ALL_KNOWN_MASKS).sort((a, b) => {
    // Natural number sort (e.g. 2 before 10)
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  switch (category) {
    case 'top':
      return allMasks.filter((m) => m.startsWith('edit_skin_top_'));
    case 'bottom':
      return allMasks.filter((m) => m.startsWith('edit_skin_bottom_'));
    case 'hair':
      return allMasks.filter((m) => m.includes('hair'));
    case 'footwear':
      return allMasks.filter((m) => m.startsWith('edit_skin_footwear_'));
    case 'eye':
      return allMasks.filter((m) => m.startsWith('edit_skin_eye_'));
    case 'mouth':
      return allMasks.filter((m) => m.startsWith('edit_skin_mouth_'));
    case 'base':
      return allMasks.filter((m) => m.startsWith('edit_skin_base_'));
    default:
      return [];
  }
}
