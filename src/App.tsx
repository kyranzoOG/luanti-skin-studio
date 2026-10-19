import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SkinConfig, SkinCategory, SkinItem } from './types/skin';
import {
  getInitialSkin,
  saveSkinToStorage,
  STEVE_DEFAULT,
} from './state/skinStore';
import { compileSkin, preloadAllAssets, registerDynamicItems, resolveItemMask } from './engine/skinComposer';
import { CategoryNav } from './components/CategoryNav';
import { ItemGrid } from './components/ItemGrid';
import { ColorControls } from './components/ColorControls';
import { SkinViewer3D } from './components/SkinViewer3D';
import { LOCALES } from './data/locales';
import { SKIN_ITEMS } from './data/skinItems';
import { BASE_COLORS, NORMAL_COLORS, EYE_COLORS, FOOTWEAR_COLORS } from './data/colors';
import { getAssetUrl } from './utils/assetPath';
import { syncMaskOverridesFromServer } from './services/maskManager';
import {
  CheckCircle2,
  RotateCcw,
  Save,
  Download,
  Upload,
  MoreHorizontal,
} from 'lucide-react';

export default function App() {
  const [skin, setSkin] = useState<SkinConfig>(getInitialSkin);
  const [activeCategory, setActiveCategory] = useState<SkinCategory>('top');
  const [availableItems, setAvailableItems] = useState<SkinItem[]>(SKIN_ITEMS);

  const [compiledTextureUrl, setCompiledTextureUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('kyranzo');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const pngInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const tr = LOCALES.en.tr;

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Preload local skin textures on mount
  useEffect(() => {
    preloadAllAssets().catch((err) => console.warn('Preload notice:', err));
    syncMaskOverridesFromServer().catch((err) => console.warn('Mask sync notice:', err));
  }, []);

  // Compile skin texture whenever state changes
  useEffect(() => {
    let active = true;
    compileSkin(skin).then((res) => {
      if (active) {
        setCompiledTextureUrl(res.dataUrl);
      }
    });

    saveSkinToStorage(skin);

    return () => {
      active = false;
    };
  }, [skin, availableItems]);

  // Compute item counts per category for the navigation
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<SkinCategory, number>> = {};
    for (const item of availableItems) {
      const cat = item.type as SkinCategory;
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [availableItems]);

  // Handle selecting an item in the active category
  const handleSelectItem = useCallback(
    (texture?: string) => {
      setSkin((prev) => {
        const next: SkinConfig = { ...prev };
        if (texture) {
          (next as Record<string, any>)[activeCategory] = texture;
        } else {
          delete (next as Record<string, any>)[activeCategory];
        }
        return next;
      });
    },
    [activeCategory]
  );

  // Handle color change for active category
  const handleColorChange = useCallback(
    (color: string) => {
      const colorKey = `${activeCategory}_color` as keyof SkinConfig;
      setSkin((prev) => ({
        ...prev,
        [colorKey]: color,
      }));
    },
    [activeCategory]
  );

  // Reset to default Steve appearance
  const handleReset = useCallback(() => {
    setSkin({ ...STEVE_DEFAULT, arm_size: 'default' });
    showToast('Reset to default skin appearance!');
  }, []);

  // Export 128x64 HD PNG file
  const handleExportPng = useCallback(async () => {
    const { canvas } = await compileSkin(skin);
    const link = document.createElement('a');
    link.download = `multicraft-skin-${username || 'custom'}-128x64.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Exported 128×64 HD Skin PNG!');
  }, [skin, username]);

  // Export JSON profile
  const handleExportJson = useCallback(() => {
    const jsonStr = JSON.stringify(skin, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `multicraft-skin-${username || 'profile'}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast('Exported skin JSON!');
  }, [skin, username]);

  // Import JSON profile
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object' && parsed.base) {
            parsed.arm_size = 'default';
            setSkin(parsed);
            showToast('Skin loaded from JSON!');
          }
        } catch {
          alert('Invalid skin JSON file.');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // Import PNG skin
  const handleImportPng = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          setCompiledTextureUrl(url);
          showToast('External PNG skin loaded!');
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const currentColorKey = `${activeCategory}_color` as keyof SkinConfig;

  const currentColor =
    currentColorKey && skin[currentColorKey]
      ? (skin[currentColorKey] as string)
      : activeCategory === 'base'
      ? BASE_COLORS[0]
      : activeCategory === 'eye'
      ? EYE_COLORS[0]
      : activeCategory === 'footwear'
      ? FOOTWEAR_COLORS[0]
      : NORMAL_COLORS[0];

  const activeTexture = skin[activeCategory as keyof SkinConfig] as string | undefined;

  const activeItem = useMemo(() => {
    if (!activeTexture) return null;
    const found = availableItems.find((i) => i.texture === activeTexture);
    const mask = resolveItemMask(activeTexture, found?.mask);
    if (found) {
      return { ...found, mask };
    }
    return {
      type: activeCategory,
      texture: activeTexture,
      mask,
    } as SkinItem;
  }, [activeTexture, availableItems, activeCategory]);

  return (
    <div className="min-h-screen w-full bg-black bg-pistachio-grid text-neutral-100 flex items-center justify-center p-2 sm:p-3 md:p-4 select-none overflow-x-hidden">
      {/* Outer Cyber Window Frame */}
      <div className="relative w-full max-w-7xl flex items-stretch md:h-[88vh] md:max-h-[880px] md:min-h-[650px]">
        {/* Main High-Tech Window Panel */}
        <div className="flex-1 w-full bg-[#0c0e17]/95 border-2 border-[#BEF264]/30 rounded-2xl sm:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_30px_rgba(190,242,100,0.1)] flex flex-col overflow-hidden z-10 backdrop-blur-xl h-full">
          {/* Top Window Header */}
          <header className="px-3 sm:px-5 py-3 bg-[#111422] border-b border-[#BEF264]/20 flex items-center justify-between gap-2">
            {/* Left Header Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#BEF264]/10 border border-[#BEF264]/40 flex items-center justify-center shadow-inner">
                <div
                  className="w-5 h-5 pixelated"
                  style={{
                    backgroundImage: `url(${getAssetUrl('skintexture/edit_skin_icons.png')})`,
                    backgroundSize: '20px 180px',
                    backgroundPosition: '0px 0px',
                  }}
                />
              </div>

              <div>
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-wide flex items-center gap-2">
                  <span>Skin Studio</span>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#BEF264]/15 text-[#BEF264] border border-[#BEF264]/30">
                    HD
                  </span>
                </h1>
              </div>
            </div>

            {/* Right Header Buttons */}
            <div className="flex items-center gap-2">
              {/* Quick Save button */}
              <button
                onClick={() => {
                  saveSkinToStorage(skin);
                  showToast(tr.savedToast);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#161a2b] hover:bg-[#20253d] border border-white/10 text-neutral-200 hover:text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                title="Save Skin"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>

              {/* Quick Export 128x64 PNG */}
              <button
                onClick={handleExportPng}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#BEF264] hover:bg-[#d5f77e] text-neutral-950 font-black rounded-xl text-xs shadow-md shadow-[#BEF264]/20 border border-[#BEF264] transition active:scale-95 cursor-pointer"
                title="Download 128x64 PNG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export 128×64 PNG</span>
              </button>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-8 h-8 rounded-xl border border-white/10 bg-[#161a2b] hover:bg-[#20253d] text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-90 shadow-sm cursor-pointer"
                title="Reset to Template Defaults"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* More Menu dropdown button */}
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center transition shadow-sm cursor-pointer ${
                    isMenuOpen ? 'bg-[#BEF264] text-neutral-950 border-[#BEF264]' : 'bg-[#161a2b] hover:bg-[#20253d] text-neutral-300'
                  }`}
                  title="Tools & Settings"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-11 w-48 bg-[#161a2c] border border-white/15 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs font-bold text-neutral-200 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        handleExportJson();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{tr.exportJson}</span>
                    </button>

                    <button
                      onClick={() => {
                        jsonInputRef.current?.click();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{tr.importJson}</span>
                    </button>

                    <button
                      onClick={() => {
                        pngInputRef.current?.click();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{tr.importPng}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Hidden File Inputs */}
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJson}
            className="hidden"
          />
          <input
            ref={pngInputRef}
            type="file"
            accept="image/png"
            onChange={handleImportPng}
            className="hidden"
          />

          {/* Responsive 3-Column Studio Grid:
              Column 1: Category Sidebar
              Column 2: Center Item Grid + Dynamic Color Controls Studio
              Column 3: 3D Character Viewport
          */}
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-[180px_1fr_270px] lg:grid-cols-[200px_1fr_300px] xl:grid-cols-[220px_1fr_320px] overflow-hidden">
            {/* Left Column: Category Navigation */}
            <aside className="w-full bg-[#0d0f1b]/80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col p-2 overflow-y-auto">
              <CategoryNav
                activeCategory={activeCategory}
                onSelectCategory={(cat) => setActiveCategory(cat)}
                tr={tr}
                categoryCounts={categoryCounts}
              />
            </aside>

            {/* Center Column: Item Grid + Bottom Color Palette Studio */}
            <main className="flex-1 flex flex-col bg-[#0f1220]/90 overflow-hidden border-b md:border-b-0 md:border-r border-white/10">
              <div className="flex-1 flex flex-col overflow-hidden">
                <ItemGrid
                  category={activeCategory}
                  items={availableItems}
                  selectedTexture={skin[activeCategory]}
                  baseTexture={skin.base}
                  categoryColor={currentColor}
                  onSelectItem={handleSelectItem}
                  username={username}
                  tr={tr}
                />
              </div>

              {/* Bottom Color Palette & RGB Sliders Studio */}
              <ColorControls
                category={activeCategory}
                activeItem={activeItem}
                currentColor={currentColor}
                onColorChange={handleColorChange}
                tr={tr}
              />
            </main>

            {/* Right Column: 3D Character Preview (skinview3d) */}
            <section className="w-full h-full bg-[#0d0f1b]/80 p-2 sm:p-3 flex flex-col justify-between overflow-hidden relative">
              <SkinViewer3D
                skinTextureUrl={compiledTextureUrl}
                baseTexture={skin.base}
                baseColor={skin.base_color}
                username={username}
                onUsernameChange={setUsername}
                tr={tr}
                onDownloadSkin={handleExportPng}
              />
            </section>
          </div>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#161a2c] text-white px-4 py-2 rounded-xl shadow-2xl border border-[#BEF264]/60 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#BEF264]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
