export type SkinCategory =
  | 'base'
  | 'top'
  | 'bottom'
  | 'footwear'
  | 'hair'
  | 'eye'
  | 'mouth'
  | 'headwear'
  | 'accessory';

export interface SkinItem {
  type: string;
  texture?: string;
  mask?: string;
  steve?: boolean;
  alex?: boolean;
  rank?: number;
  preview_rotation?: {
    x: number;
    y: number;
  };
  restricted_to_admin?: boolean;
  for_player?: string | string[];
}

export interface SkinConfig {
  template?: 'steve' | 'alex';
  base: string;
  base_color: string;
  headwear?: string;
  headwear_color?: string;
  hair?: string;
  hair_color?: string;
  eye?: string;
  eye_color?: string;
  mouth?: string;
  mouth_color?: string;
  top?: string;
  top_color?: string;
  bottom?: string;
  bottom_color?: string;
  footwear?: string;
  footwear_color?: string;
  accessory?: string;
  accessory_color?: string;
  arm_size?: 'default' | 'slim';
}

export const ITEM_CATEGORIES: (keyof Omit<SkinConfig, 'template' | 'base_color' | 'headwear_color' | 'hair_color' | 'eye_color' | 'mouth_color' | 'top_color' | 'bottom_color' | 'footwear_color' | 'accessory_color' | 'arm_size'>)[] = [
  'base',
  'footwear',
  'bottom',
  'top',
  'eye',
  'mouth',
  'hair',
  'headwear',
  'accessory',
];

export const UI_TAB_ORDER: SkinCategory[] = [
  'base',
  'top',
  'bottom',
  'footwear',
  'hair',
  'eye',
  'mouth',
  'headwear',
  'accessory',
];

// Special themes are complete, fixed full-dress designs (e.g. Christmas, Spooky Halloween, Snowman, Mummy, Vampire, Skeleton)
export const SPECIAL_THEME_KEYWORDS = [
  'halloween',
  'christmas',
  'xmas',
  'santa',
  'vampire',
  'mummy',
  'snowman',
  'skeleton',
  'ghost',
  'witch',
  'pumpkin',
];

export function isSpecialThemeItem(item?: SkinItem | string | null): boolean {
  if (!item) return false;
  // If item has an assigned mask, it is colorable
  if (typeof item === 'object' && item.mask && item.mask !== 'none') {
    return false;
  }
  const name = typeof item === 'string' ? item : item.texture || '';
  const lower = name.toLowerCase();
  return SPECIAL_THEME_KEYWORDS.some((kw) => lower.includes(kw));
}

// Allowed coloring categories: Upper Wear, Bottom Wear, Footwear, Eyes, Hair styles, Mouth, Base
export function isCategoryAllowedForColoring(category: SkinCategory): boolean {
  return (
    category === 'base' ||
    category === 'top' ||
    category === 'bottom' ||
    category === 'footwear' ||
    category === 'eye' ||
    category === 'hair' ||
    category === 'mouth'
  );
}

/**
 * Checks whether an item is recolorable.
 * STRICT MASK ENGINE RULE:
 * - When a mask file exists for an item in an allowed category: returns true (can be tinted).
 * - When NO mask file exists for an item: returns false (tinting is strictly disabled).
 */
export function isItemColorable(item?: SkinItem | null, category?: SkinCategory): boolean {
  if (!item || !item.texture || item.texture === 'blank.png') return false;

  const cat = (category || item.type) as SkinCategory;
  if (!isCategoryAllowedForColoring(cat)) return false;

  // Strict check: item MUST have a companion mask file
  // For those without a mask, tinting is disabled
  return Boolean(item.mask && item.mask !== 'none');
}
