import React, { useEffect, useRef } from 'react';
import { SkinViewer, IdleAnimation } from 'skinview3d';
import { RotateCcw, Camera, User, Download } from 'lucide-react';
import { Translations } from '../data/locales';

interface SkinViewer3DProps {
  skinTextureUrl: string;
  baseTexture: string;
  baseColor: string;
  username: string;
  onUsernameChange?: (name: string) => void;
  tr: Translations;
  onDownloadSkin?: () => void;
}

export const SkinViewer3D: React.FC<SkinViewer3DProps> = ({
  skinTextureUrl,
  username,
  onUsernameChange,
  onDownloadSkin,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const skinCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  // 1. Initialize SkinViewer (Character) with 4px classic arms and Idle animation
  useEffect(() => {
    if (!skinCanvasRef.current || !containerRef.current) return;

    const canvas = skinCanvasRef.current;
    const width = containerRef.current.clientWidth || 280;
    const height = containerRef.current.clientHeight || 380;

    const viewer = new SkinViewer({
      canvas,
      width,
      height,
      skin: skinTextureUrl || undefined,
      model: 'default', // Always 4px classic arms
    });

    viewer.width = width;
    viewer.height = height;
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;

    // Set transparent background
    viewer.renderer.setClearColor(0x000000, 0);

    // Initial camera position & angle
    viewer.camera.position.set(0, 0, 64);
    viewer.camera.lookAt(0, 0, 0);

    // Strictly idle pose
    viewer.animation = new IdleAnimation();
    viewerRef.current = viewer;

    const handleResize = () => {
      if (containerRef.current && viewerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          viewerRef.current.width = w;
          viewerRef.current.height = h;
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  // 2. Update skin texture dynamically (always 4px default model)
  useEffect(() => {
    if (viewerRef.current && skinTextureUrl) {
      viewerRef.current.loadSkin(skinTextureUrl, {
        model: 'default',
      });
    }
  }, [skinTextureUrl]);

  // Reset camera view
  const handleResetCamera = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.position.set(0, 0, 64);
      viewerRef.current.camera.lookAt(0, 0, 0);
      viewerRef.current.controls.reset();
    }
  };

  // Snapshot 3D Preview
  const handleCaptureSnapshot = () => {
    const canvas = skinCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${username || 'multicraft'}-character.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-between select-none overflow-hidden bg-[#0a0d18]/90 rounded-2xl p-2.5 border border-white/10 shadow-2xl backdrop-blur-md"
    >
      {/* Top Header: Username pill & Camera Actions */}
      <div className="w-full flex items-center justify-between gap-1.5 z-10">
        {/* Username pill */}
        <div className="flex items-center gap-1.5 bg-black/60 border border-white/15 rounded-xl px-2.5 py-1 shadow-inner">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange?.(e.target.value)}
            placeholder="Username"
            className="w-24 sm:w-28 text-center text-xs font-mono font-bold text-white bg-transparent outline-none focus:text-emerald-300"
            title="Player Name (click to edit)"
          />
        </div>

        {/* Snapshot & Camera Reset */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCaptureSnapshot}
            className="w-7 h-7 rounded-lg bg-[#181c2d] hover:bg-[#222840] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer shadow-sm active:scale-95"
            title="Take 3D Screenshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            className="w-7 h-7 rounded-lg bg-[#181c2d] hover:bg-[#222840] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer shadow-sm active:scale-95"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative flex-1 w-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden my-1">
        {/* Glowing Pedestal Base */}
        <div className="absolute bottom-4 w-36 h-7 rounded-[100%] bg-[#BEF264]/20 filter blur-md pointer-events-none" />

        {/* Full 3D Character Canvas */}
        <canvas ref={skinCanvasRef} className="w-full h-full touch-none block" />

        {/* Rotation Guide Curve at bottom */}
        <div className="absolute bottom-1 pointer-events-none opacity-40 select-none flex flex-col items-center">
          <svg
            className="w-14 h-5 text-[#BEF264]"
            viewBox="0 0 100 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 18 14 Q 50 2 82 14" />
            <path d="M 76 6 L 82 14 L 73 17" fill="currentColor" />
            <path d="M 82 21 Q 50 33 18 21" />
            <path d="M 24 29 L 18 21 L 27 18" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Bottom Download Button - kept right under the player preview */}
      <div className="w-full pt-1.5 border-t border-white/10 select-none">
        <button
          onClick={onDownloadSkin}
          className="w-full py-2.5 px-3 bg-[#BEF264] hover:bg-[#d5f77e] text-neutral-950 rounded-xl text-xs font-black shadow-lg shadow-[#BEF264]/25 border border-[#BEF264] flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer tracking-wide"
          title="Download the compiled 128x64 HD Multicraft Skin PNG"
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Download Skin (128×64 PNG)</span>
        </button>
      </div>
    </div>
  );
};
