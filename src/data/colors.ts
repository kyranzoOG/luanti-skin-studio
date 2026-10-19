// Exact palette from edit_skin init.lua
export const BASE_COLORS: string[] = [
  '#eeb592', // 0xffeeb592 (Fair / Classic)
  '#b47a57', // 0xffb47a57 (Tanned)
  '#8d471d', // 0xff8d471d (Deep Brown)
  '#f5d3b3', // Pale / Light
  '#c68b59', // Olive / Warm
  '#673919', // Dark Espresso
  '#4a260f', // Deep Obsidian
  '#e0c8b0', // Vampire / Ghost
];

export const NORMAL_COLORS: string[] = [
  '#613915', // 1: Dark brown (Steve hair, Alex bottom)
  '#97491b', // 2: Medium brown
  '#b17050', // 3: Light brown
  '#e2bc7b', // 4: Beige
  '#706662', // 5: Gray
  '#151515', // 6: Black
  '#c21c1c', // 7: Red
  '#178c32', // 8: Green (Alex top)
  '#ae2ad3', // 9: Plum
  '#ebe8e4', // 10: White
  '#e3dd26', // 11: Yellow
  '#449acc', // 12: Light blue (Steve top)
  '#124d87', // 13: Dark blue (Steve bottom)
  '#fc0eb3', // 14: Pink
  '#d0672a', // 15: Orange (Alex hair)
];

// Dedicated Eye / Iris color palette
export const EYE_COLORS: string[] = [
  '#449acc', // Steve Cyan / Blue
  '#16a34a', // Emerald Green (Alex)
  '#1d4ed8', // Sapphire / Deep Blue
  '#d97706', // Amber / Hazel
  '#5c3a21', // Chocolate Brown
  '#9333ea', // Amethyst / Violet
  '#dc2626', // Crimson / Ruby
  '#06b6d4', // Frost / Ice Blue
  '#18181b', // Obsidian Dark
  '#e2e8f0', // Silver / White
  '#eab308', // Radiant Gold
  '#c084fc', // Lavender Pastel
];

// Dedicated Footwear / Shoes / Boots color palette
export const FOOTWEAR_COLORS: string[] = [
  '#3a3d40', // Charcoal / Steve boots
  '#4a2c11', // Classic Dark Leather
  '#78350f', // Warm Chestnut
  '#b47a57', // Tan / Rawhide
  '#171717', // Pitch Black
  '#1e3a8a', // Navy Sneaker
  '#3f6212', // Combat Olive
  '#991b1b', // Crimson Boot
  '#475569', // Steel Slate
  '#f1f5f9', // Clean White
  '#ca8a04', // Golden Accent
  '#d4a373', // Desert Sand
];

// Dedicated Hair color palette
export const HAIR_COLORS: string[] = [
  '#613915', // Steve Dark Brown
  '#d0672a', // Alex Ginger Orange
  '#1c1917', // Raven Black
  '#eab308', // Golden Blonde
  '#d6d3d1', // Ash Blonde
  '#97491b', // Chestnut Auburn
  '#e2e8f0', // Silver Platinum
  '#06b6d4', // Cyberpunk Cyan
  '#ec4899', // Neon Pink
  '#15803d', // Forest Green
  '#7c3aed', // Royal Purple
  '#78350f', // Caramel Brown
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function colorspecToHex(colorspec: number): string {
  const r = (colorspec >> 16) & 0xff;
  const g = (colorspec >> 8) & 0xff;
  const b = colorspec & 0xff;
  return rgbToHex(r, g, b);
}

export function hexToColorspec(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0xff000000 + (r << 16) + (g << 8) + b;
}
