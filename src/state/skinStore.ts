import { SkinConfig } from '../types/skin';
import { BASE_COLORS, NORMAL_COLORS, EYE_COLORS, FOOTWEAR_COLORS } from '../data/colors';

export const STEVE_DEFAULT: SkinConfig = {
  template: 'steve',
  base: 'edit_skin_base_1.png',
  base_color: BASE_COLORS[0], // #eeb592
  hair: 'edit_skin_hair_5.png',
  hair_color: NORMAL_COLORS[0], // #613915 (Dark brown)
  top: 'edit_skin_top_1.png',
  top_color: NORMAL_COLORS[11], // #449acc (Cyan blue)
  bottom: 'edit_skin_bottom_4.png',
  bottom_color: NORMAL_COLORS[12], // #124d87 (Dark blue)
  eye: 'edit_skin_eye_1.png',
  eye_color: EYE_COLORS[0], // #449acc (Steve cyan eyes)
  mouth: 'edit_skin_mouth_1.png',
  footwear: 'edit_skin_footwear_1.png',
  footwear_color: FOOTWEAR_COLORS[0], // #3a3d40 (Charcoal boots)
  headwear: undefined,
  arm_size: 'default',
};

export const ALEX_DEFAULT: SkinConfig = {
  template: 'alex',
  base: 'edit_skin_base_1.png',
  base_color: BASE_COLORS[0], // #eeb592
  hair: 'edit_skin_hair_11.png',
  hair_color: NORMAL_COLORS[14], // #d0672a (Orange hair)
  top: 'edit_skin_top_9.png',
  top_color: NORMAL_COLORS[7], // #178c32 (Green top)
  bottom: 'edit_skin_bottom_4.png',
  bottom_color: NORMAL_COLORS[0], // #613915 (Dark brown pants)
  eye: 'edit_skin_eye_1.png',
  eye_color: EYE_COLORS[1], // #16a34a (Alex green eyes)
  mouth: 'edit_skin_mouth_7.png',
  footwear: 'edit_skin_footwear_1.png',
  footwear_color: FOOTWEAR_COLORS[1], // #4a2c11 (Leather brown boots)
  headwear: undefined,
  arm_size: 'default',
};

const STORAGE_KEY = 'edit_skin:skin_128';

export function getInitialSkin(): SkinConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.base) {
        // Sanitize any stale references from previous sessions or external DBs
        if (!parsed.eye || parsed.eye.includes('female')) {
          parsed.eye = 'edit_skin_eye_1.png';
        }
        if (!parsed.mouth || parsed.mouth.includes('female')) {
          parsed.mouth = parsed.template === 'alex' ? 'edit_skin_mouth_7.png' : 'edit_skin_mouth_1.png';
        }
        if (!parsed.hair || parsed.hair.includes('female')) {
          parsed.hair = parsed.template === 'alex' ? 'edit_skin_hair_11.png' : 'edit_skin_hair_5.png';
        }
        if (!parsed.top || parsed.top.includes('female')) {
          parsed.top = parsed.template === 'alex' ? 'edit_skin_top_9.png' : 'edit_skin_top_1.png';
        }
        parsed.arm_size = 'default';
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read saved skin:', err);
  }

  // Default to classic Steve skin
  const initial = { ...STEVE_DEFAULT, arm_size: 'default' as const };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveSkinToStorage(skin: SkinConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skin));
  } catch (err) {
    console.error('Failed to save skin:', err);
  }
}

export function loadSkinFromStorage(): SkinConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to load skin:', err);
  }
  return null;
}
