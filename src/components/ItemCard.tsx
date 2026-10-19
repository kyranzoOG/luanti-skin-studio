import React, { useEffect, useState } from 'react';
import { SkinItem, isSpecialThemeItem, isItemColorable } from '../types/skin';
import { renderItemThumbnail } from '../engine/modelThumbnailRenderer';
import { resolveItemMask } from '../engine/skinComposer';
import { Ban, Palette, Check, Sparkles, Lock, Gem } from 'lucide-react';

interface ItemCardProps {
  item: SkinItem;
  isSelected: boolean;
  baseTexture: string;
  categoryColor?: string;
  onSelect: () => void;
  noneLabel: string;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  isSelected,
  baseTexture,
  categoryColor,
  onSelect,
  noneLabel,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const isBlank = !item.texture || item.texture === 'blank.png';
  const isTheme = isSpecialThemeItem(item);
  const mask = item.mask || resolveItemMask(item.texture);
  const itemWithMask: SkinItem = { ...item, mask };
  const colorable = isItemColorable(itemWithMask);

  useEffect(() => {
    let active = true;
    if (isBlank || item.type === 'accessory') {
      setThumbUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);
    renderItemThumbnail(itemWithMask, baseTexture, categoryColor)
      .then((url) => {
        if (active) {
          setThumbUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [item.texture, mask, item.type, baseTexture, categoryColor, isBlank]);

  // Clean, readable item label
  const getItemLabel = (textureName?: string): string => {
    if (!textureName) return noneLabel;
    const clean = textureName.replace(/^edit_skin_/, '').replace(/\.png$/, '');
    return clean.replace(/_/g, ' ');
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative w-full aspect-square rounded-xl cursor-pointer p-2 transition-all duration-200 flex flex-col items-center justify-between select-none ${
        isSelected
          ? 'bg-[#1b2238] border-2 border-[#BEF264] ring-2 ring-[#BEF264]/40 shadow-[0_0_20px_rgba(190,242,100,0.35)] scale-[1.02] z-10'
          : 'bg-[#141724]/90 hover:bg-[#1c2136] border border-white/10 hover:border-[#BEF264]/40 hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      {/* Active State Checkmark Badge */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 z-20 bg-[#BEF264] text-neutral-950 rounded-full p-0.5 shadow-md flex items-center justify-center animate-in zoom-in-75">
          <Check className="w-3 h-3 stroke-[3]" />
        </div>
      )}

        {/* Main Content */}
        <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
          {isBlank ? (
            <div className="flex flex-col items-center justify-center text-neutral-500 group-hover:text-red-400 transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center mb-1 group-hover:border-red-500/50">
                <Ban className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-wide uppercase">
                {noneLabel}
              </span>
            </div>
          ) : item.type === 'accessory' ? (
            <div className="flex flex-col items-center justify-center p-2 text-center h-full w-full">
              <span className="text-xs font-bold text-neutral-200 group-hover:text-white line-clamp-3 px-1 leading-snug uppercase tracking-tight">
                {getItemLabel(item.texture)}
              </span>
            </div>
        ) : loading ? (
          <div className="w-14 h-14 rounded-lg bg-white/5 animate-pulse flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#BEF264]/30 border-t-[#BEF264] animate-spin" />
          </div>
        ) : thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.texture}
            className="w-full h-full object-contain pixelated drop-shadow-md pointer-events-none group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg text-xs text-neutral-500 font-bold">
            ?
          </div>
        )}
      </div>

      {/* Bottom Item Label / Number (only for items with thumbnails, since accessories display name in center) */}
      {!isBlank && item.type !== 'accessory' && (
        <div className="w-full text-center px-1">
          <span className="block text-[10px] font-bold text-neutral-300 group-hover:text-white truncate uppercase tracking-tight">
            {getItemLabel(item.texture)}
          </span>
        </div>
      )}

      {/* Corner Bracket Accents on Active */}
      {isSelected && (
        <>
          <div className="corner-brackets-overlay" />
          <div className="corner-brackets-bottom" />
        </>
      )}
    </div>
  );
};
