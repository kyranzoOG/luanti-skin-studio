import React from 'react';
import { SkinCategory, UI_TAB_ORDER } from '../types/skin';
import { Translations } from '../data/locales';
import { getAssetUrl } from '../utils/assetPath';
import { Gem } from 'lucide-react';

interface CategoryNavProps {
  activeCategory: SkinCategory;
  onSelectCategory: (cat: SkinCategory) => void;
  tr: Translations;
  categoryCounts?: Partial<Record<SkinCategory, number>>;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  activeCategory,
  onSelectCategory,
  tr,
  categoryCounts = {},
}) => {
  const getCategoryTitle = (cat: SkinCategory): string => {
    switch (cat) {
      case 'base':
        return 'Bases & Themes';
      case 'top':
        return 'Upper Wear';
      case 'bottom':
        return 'Bottom Wear';
      case 'footwear':
        return 'Footwear';
      case 'hair':
        return 'Hairstyles';
      case 'eye':
        return tr.eyes;
      case 'mouth':
        return tr.mouths;
      case 'headwear':
        return 'Headwear / Hats';
      case 'accessory':
        return 'Jewelry';
      default:
        return '';
    }
  };

  const iconsUrl = getAssetUrl('skintexture/edit_skin_icons.png');

  // Map each category to its sprite index in edit_skin_icons.png
  const getSpriteIndex = (cat: SkinCategory): number => {
    switch (cat) {
      case 'base':
        return 1;
      case 'headwear':
        return 2;
      case 'hair':
        return 3;
      case 'eye':
        return 4;
      case 'mouth':
        return 5;
      case 'top':
        return 6;
      case 'bottom':
        return 7;
      case 'footwear':
        return 8;
      case 'accessory':
        return 2; // accessory icon frame
      default:
        return 1;
    }
  };

  return (
    <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto py-1 px-1 md:py-2 md:px-1.5 max-w-full no-scrollbar select-none">
      {UI_TAB_ORDER.map((category) => {
        const isActive = activeCategory === category;
        const count = categoryCounts[category];
        const spriteIdx = getSpriteIndex(category);

        return (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left transition-all shrink-0 cursor-pointer text-xs font-bold border ${
              isActive
                ? 'bg-[#BEF264]/15 border-[#BEF264]/80 text-white shadow-[0_0_15px_rgba(190,242,100,0.2)] border-l-4 border-l-[#BEF264]'
                : 'bg-[#141724]/80 hover:bg-[#1c2136] border-white/5 hover:border-white/20 text-neutral-300 hover:text-white border-l-4 border-l-transparent'
            }`}
          >
            <div className="flex items-center gap-2">
              {/* Category Miniature Sprite Icon Frame */}
              <div
                className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center p-0.5 border shadow-inner transition ${
                  isActive
                    ? 'bg-[#BEF264]/20 border-[#BEF264]/50'
                    : 'bg-black/30 border-white/10 group-hover:border-white/30'
                }`}
              >
                {category === 'accessory' ? (
                  <Gem className="w-3.5 h-3.5 text-[#BEF264]" />
                ) : (
                  <div
                    className="w-4 h-4 shrink-0 pixelated"
                    style={{
                      backgroundImage: `url(${iconsUrl})`,
                      backgroundSize: '16px 144px',
                      backgroundPosition: `0px -${spriteIdx * 16}px`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
              </div>

              <span className="whitespace-nowrap tracking-wide">
                {getCategoryTitle(category)}
              </span>
            </div>

            {/* Item Count Badge */}
            {count !== undefined && count > 0 && (
              <span
                className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                  isActive
                    ? 'bg-[#BEF264]/20 text-[#BEF264]'
                    : 'bg-white/5 text-neutral-500 group-hover:text-neutral-300'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
