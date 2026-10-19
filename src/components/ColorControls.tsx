import React, { useState } from 'react';
import {
  BASE_COLORS,
  NORMAL_COLORS,
  EYE_COLORS,
  FOOTWEAR_COLORS,
  HAIR_COLORS,
  hexToRgb,
  rgbToHex,
} from '../data/colors';
import {
  SkinCategory,
  SkinItem,
  isSpecialThemeItem,
  isCategoryAllowedForColoring,
  isItemColorable,
} from '../types/skin';
import { Translations } from '../data/locales';
import { Pipette, Sparkles, Sliders, Check, Lock, AlertCircle } from 'lucide-react';
import { resolveItemMask } from '../engine/skinComposer';

interface ColorControlsProps {
  category: SkinCategory;
  activeItem?: SkinItem | null;
  currentColor: string;
  onColorChange: (color: string) => void;
  tr: Translations;
}

export const ColorControls: React.FC<ColorControlsProps> = ({
  category,
  activeItem,
  currentColor,
  onColorChange,
  tr,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'sliders'>('presets');

  // Recolor eligibility: strictly requires an assigned mask file
  const resolvedMask = activeItem?.texture ? resolveItemMask(activeItem.texture, activeItem.mask) : undefined;
  const itemWithResolvedMask = activeItem ? { ...activeItem, mask: resolvedMask } : null;
  const isColorable = Boolean(itemWithResolvedMask && isItemColorable(itemWithResolvedMask, category));

  // Choose the optimal contextual palette based on active part
  const getPalette = (): { name: string; colors: string[] } => {
    switch (category) {
      case 'base':
        return { name: 'Skin Tones', colors: BASE_COLORS };
      case 'eye':
        return { name: 'Iris Colors', colors: EYE_COLORS };
      case 'footwear':
        return { name: 'Footwear & Boots', colors: FOOTWEAR_COLORS };
      case 'hair':
        return { name: 'Hair Colors', colors: HAIR_COLORS };
      case 'top':
        return { name: 'Upper Wear Colors', colors: NORMAL_COLORS };
      case 'bottom':
        return { name: 'Bottom Wear Colors', colors: NORMAL_COLORS };
      case 'mouth':
        return { name: 'Lip & Mouth Colors', colors: NORMAL_COLORS };
      default:
        return { name: 'Fixed Palette', colors: NORMAL_COLORS };
    }
  };

  const { name: paletteName, colors: primaryPalette } = getPalette();
  const { r, g, b } = hexToRgb(currentColor || '#ffffff');

  const handleSliderChange = (channel: 'r' | 'g' | 'b', val: number) => {
    if (!isColorable) return;
    const clamped = Math.max(0, Math.min(255, val));
    const newR = channel === 'r' ? clamped : r;
    const newG = channel === 'g' ? clamped : g;
    const newB = channel === 'b' ? clamped : b;
    onColorChange(rgbToHex(newR, newG, newB));
  };

  const handleStep = (channel: 'r' | 'g' | 'b', delta: number) => {
    if (!isColorable) return;
    const current = channel === 'r' ? r : channel === 'g' ? g : b;
    handleSliderChange(channel, current + delta);
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isColorable) return;
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onColorChange(val.toLowerCase());
    }
  };

  // If item or category is non-colorable (no mask), do not render color controls
  if (!isColorable) {
    return null;
  }

  return (
    <div className="w-full bg-[#11131f]/95 border-t border-white/10 p-2.5 sm:p-3 flex flex-col gap-2.5 select-none shadow-2xl backdrop-blur-md">
      {/* Top Bar: Title, Category Context, Color Preview Badge, Native Picker */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Glowing Color Indicator */}
          <div className="relative group">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.2)] transition-transform group-hover:scale-105 cursor-pointer relative overflow-hidden"
              style={{ backgroundColor: currentColor }}
              title="Click eyedropper to pick custom color"
            >
              {/* Invisible native color input over swatch */}
              <input
                type="color"
                value={currentColor.startsWith('#') && currentColor.length === 7 ? currentColor : '#ffffff'}
                onChange={(e) => onColorChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="System Color Picker"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-neutral-900 border border-white/20 rounded p-0.5 text-white/80 pointer-events-none">
              <Pipette className="w-2.5 h-2.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-extrabold text-neutral-200 tracking-wider uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#BEF264]" />
                {paletteName}
              </span>
              <span className="text-[10px] font-mono font-bold text-[#BEF264] bg-[#BEF264]/15 border border-[#BEF264]/40 px-1.5 py-0.5 rounded uppercase">
                {currentColor}
              </span>
            </div>
          </div>
        </div>

        {/* Tab switch & Quick Hex input */}
        <div className="flex items-center gap-2">
          {/* Direct Hex Input */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 py-0.5">
            <span className="text-[11px] font-mono text-neutral-500 mr-0.5">#</span>
            <input
              type="text"
              maxLength={6}
              defaultValue={currentColor.replace('#', '')}
              key={currentColor}
              onBlur={handleHexInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleHexInput(e as unknown as React.ChangeEvent<HTMLInputElement>);
                }
              }}
              placeholder="hex"
              className="w-14 text-xs font-mono font-bold text-neutral-200 bg-transparent outline-none uppercase focus:text-[#BEF264]"
              title="Enter 6-character Hex color"
            />
          </div>

          {/* Preset / Slider Mode Toggle */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-2 py-1 rounded-md transition cursor-pointer font-bold ${
                activeTab === 'presets'
                  ? 'bg-[#BEF264] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Presets
            </button>
            <button
              onClick={() => setActiveTab('sliders')}
              className={`px-2 py-1 rounded-md transition flex items-center gap-1 cursor-pointer font-bold ${
                activeTab === 'sliders'
                  ? 'bg-[#BEF264] text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>RGB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Controls Content */}
      {activeTab === 'presets' ? (
        <div className="flex flex-col gap-1.5">
          {/* Primary Curated Swatches */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {primaryPalette.map((color) => {
              const isSelected = currentColor.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  style={{ backgroundColor: color }}
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg cursor-pointer border transition-all shadow-md group ${
                    isSelected
                      ? 'border-white ring-2 ring-[#BEF264] scale-110 z-10 shadow-[0_0_12px_rgba(190,242,100,0.5)]'
                      : 'border-white/20 hover:scale-105 hover:border-white/60 active:scale-95'
                  }`}
                  title={color}
                >
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary fallback swatches */}
          <div className="flex items-center gap-1 pt-1 border-t border-white/5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-neutral-500 font-bold uppercase shrink-0 mr-1">
              Spectrum:
            </span>
            {NORMAL_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onColorChange(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded cursor-pointer border shrink-0 transition-transform ${
                  currentColor.toLowerCase() === c.toLowerCase()
                    ? 'border-white ring-1 ring-emerald-400 scale-110'
                    : 'border-white/10 hover:scale-110'
                }`}
                title={c}
              />
            ))}
          </div>
        </div>
      ) : (
        /* High-Tech RGB Precision Sliders */
        <div className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2.5 shadow-inner">
          {/* Red Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Red
              </span>
              <span className="font-mono text-neutral-300">{r}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleStep('r', -10)}
                className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-white/10 flex items-center justify-center cursor-pointer active:scale-90"
              >
                −
              </button>
              <input
                type="range"
                min="0"
                max="255"
                value={r}
                onChange={(e) => handleSliderChange('r', parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <button
                onClick={() => handleStep('r', 10)}
                className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-white/10 flex items-center justify-center cursor-pointer active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Green Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Green
              </span>
              <span className="font-mono text-neutral-300">{g}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleStep('g', -10)}
                className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-white/10 flex items-center justify-center cursor-pointer active:scale-90"
              >
                −
              </button>
              <input
                type="range"
                min="0"
                max="255"
                value={g}
                onChange={(e) => handleSliderChange('g', parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <button
                onClick={() => handleStep('g', 10)}
                className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-white/10 flex items-center justify-center cursor-pointer active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Blue Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-sky-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Blue
              </span>
              <span className="font-mono text-neutral-300">{b}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleStep('b', -10)}
                className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-white/10 flex items-center justify-center cursor-pointer active:scale-90"
              >
                −
              </button>
              <input
                type="range"
                min="0"
                max="255"
                value={b}
                onChange={(e) => handleSliderChange('b', parseInt(e.target.value, 10))}
                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <button
                onClick={() => handleStep('b', 10)}
                className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-white/10 flex items-center justify-center cursor-pointer active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
