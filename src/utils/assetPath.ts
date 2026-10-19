/**
 * Resolves static asset URLs with support for GitHub Pages base path.
 */
export function getAssetUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('data:') || relativePath.startsWith('blob:') || relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Get base URL configured in Vite (e.g., './' or '/repo-name/')
  const base = import.meta.env.BASE_URL || './';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;

  return `${cleanBase}${cleanPath}`;
}
