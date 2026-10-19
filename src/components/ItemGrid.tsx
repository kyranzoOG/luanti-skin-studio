import React, { useState, useEffect, useMemo } from 'react';
import { SkinItem, SkinCategory, isItemColorable, isSpecialThemeItem } from '../types/skin';
import { resolveItemMask } from '../engine/skinComposer';
import { SKIN_ITEMS } from '../data/skinItems';
import { ItemCard } from './ItemCard';
import { Translations } from '../data/locales';
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles, Ghost } from 'lucide-react';

interface ItemGridProps {
  category: SkinCategory;
  items?: SkinItem[];
  selectedTexture?: string;
  baseTexture: string;
  categoryColor?: string;
  onSelectItem: (texture?: string) => void;
  username: string;
  tr: Translations;
}

const ITEMS_PER_PAGE = 16;

export const ItemGrid: React.FC<ItemGridProps> = ({
  category,
  items = SKIN_ITEMS,
  selectedTexture,
  baseTexture,
  categoryColor,
  onSelectItem,
  username,
  tr,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'customizable' | 'themes'>('all');

  // Reset to page 1 and clear search when category changes
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
    setFilterType('all');
  }, [category]);

  // Filter items matching category, permissions, search, and type
  const filteredItems = useMemo(() => {
    const rawList = items.filter((item) => {
      if (item.type !== category) return false;

      // Filter out UI assets (buttons, start games, templates, dark templates, etc.)
      const texLower = (item.texture || '').toLowerCase();
      if (
        texLower.includes('start_game') ||
        texLower.includes('strat_game') ||
        texLower.includes('template') ||
        texLower.includes('darktheme') ||
        texLower.includes('dark_theme') ||
        texLower.includes('btn') ||
        texLower.includes('button') ||
        texLower.includes('scrollbar') ||
        texLower.includes('arrow')
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (item.texture || '').toLowerCase();
        if (!name.includes(query)) return false;
      }

      // Filter special themes
      if (filterType === 'themes' && !isSpecialThemeItem(item)) return false;

      // Filter customizable / tintable with mask
      if (filterType === 'customizable') {
        const mask = item.mask || resolveItemMask(item.texture);
        if (!isItemColorable({ ...item, mask }, category)) {
          return false;
        }
      }

      return true;
    });

    // Automatically prepend a "None / Unequip" option for non-base categories
    if (category !== 'base') {
      const blankItem: SkinItem = {
        type: category,
        texture: 'blank.png',
      };
      return [blankItem, ...rawList];
    }

    return rawList;
  }, [items, category, searchQuery, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const validPage = Math.min(currentPage, totalPages);

  const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-2.5 sm:p-3 overflow-hidden bg-[#0d0f1a]/60">
      {/* Top Filter & Search Bar */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10 select-none">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`Search ${category}...`}
            className="w-full bg-[#161a2b] border border-white/10 rounded-lg pl-8 pr-7 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition shadow-inner font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-1 text-[11px] font-bold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
            }`}
          >
            All ({filteredItems.length})
          </button>
          <button
            onClick={() => setFilterType('customizable')}
            className={`px-2 py-0.5 rounded-md transition flex items-center gap-1 cursor-pointer ${
              filterType === 'customizable'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
            }`}
            title="Show parts supporting dynamic coloring"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Tintable</span>
          </button>
          <button
            onClick={() => setFilterType('themes')}
            className={`hidden sm:flex px-2 py-0.5 rounded-md transition items-center gap-1 cursor-pointer ${
              filterType === 'themes'
                ? 'bg-emerald-600 text-white'
                : 'text-neutral-400 hover:text-neutral-200 bg-white/5'
            }`}
            title="Show special theme designs (Halloween, Christmas, Costumes)"
          >
            <Ghost className="w-3 h-3 text-cyan-400" />
            <span>Themes</span>
          </button>
        </div>
      </div>

      {/* Modern Card Grid: 4 columns on desktop, 3 on tablet, 2 on mobile */}
      <div className="flex-1 overflow-y-auto pr-1">
        {pageItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 p-0.5 content-start">
            {pageItems.map((item, idx) => {
              const isBlank = !item.texture || item.texture === 'blank.png';
              const isSelected = isBlank
                ? !selectedTexture || selectedTexture === 'blank.png'
                : selectedTexture === item.texture;

              return (
                <ItemCard
                  key={item.texture || `blank-${idx}`}
                  item={item}
                  isSelected={isSelected}
                  baseTexture={baseTexture}
                  categoryColor={categoryColor}
                  onSelect={() => onSelectItem(isBlank ? undefined : item.texture)}
                  noneLabel={tr.none}
                />
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-neutral-500 gap-2">
            <SlidersHorizontal className="w-8 h-8 opacity-40 text-emerald-400" />
            <p className="text-xs font-bold">No textures match "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Modern Pagination Controls */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/10 select-none text-xs">
        <span className="text-[11px] font-medium text-neutral-400">
          Showing <span className="text-white font-bold">{Math.min(startIndex + 1, filteredItems.length)}</span>–
          <span className="text-white font-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length)}</span> of{' '}
          <span className="text-emerald-400 font-bold">{filteredItems.length}</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={validPage <= 1}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition shadow-sm ${
              validPage > 1
                ? 'bg-[#181c2d] hover:bg-[#222840] border-white/20 text-neutral-200 cursor-pointer active:scale-95'
                : 'opacity-30 cursor-not-allowed bg-black/30 border-white/5 text-neutral-600'
            }`}
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2 py-0.5 rounded-md bg-[#161a2b] border border-white/10 font-mono text-[11px] font-bold text-neutral-300">
            <span className="text-emerald-400 font-bold">{validPage}</span> / {totalPages}
          </div>

          <button
            onClick={handleNextPage}
            disabled={validPage >= totalPages}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition shadow-sm ${
              validPage < totalPages
                ? 'bg-[#181c2d] hover:bg-[#222840] border-white/20 text-neutral-200 cursor-pointer active:scale-95'
                : 'opacity-30 cursor-not-allowed bg-black/30 border-white/5 text-neutral-600'
            }`}
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
