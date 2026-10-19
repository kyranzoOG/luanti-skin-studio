# Luanti / MultiCraft Appearance Skin Editor

A standalone, client-side web recreation of the **Luanti/Minetest `edit_skin`** and **MultiCraft Appearance** skin customization system.

Features:
- **MultiCraft Appearance UI**: Lavender-gray panel, dark borders, blue-gray category buttons, green active category, and authentic white selection corner brackets (`⌜ ⌝ ⌞ ⌟`).
- **Responsive CSS Grid**: 4 evenly spaced columns on desktop and 2–3 columns on mobile with zero overflow.
- **Side Sub-Tabs**: Fast switching between Appearance Parts (Clothes Hanger), Color Palette (Artist Palette), and Templates (Shirts/Styles).
- **Interactive 3D Skin Preview**: Real-time 3D character preview powered by Three.js and `skinview3d` with orbit controls, touch rotation, animations (Idle, Walk, Run, Wave), and curved rotation indicator arrows (`⟲ ⟳`).
- **Templates**: Steve (Classic 4px arms) and Alex (Slim 3px arms) presets with quick-switch avatar buttons on the 3D preview.
- **Full Luanti Skin Engine**: Rank-based compositing (`compile_skin`), alpha mask colorization (`^[colorize:color:alpha`), 110 original textures and OBJ models.
- **Color Controls**: 3 rows of rounded color swatches + interactive `[-] [slider] [+]` Red/Green/Blue controls (0–255).
- **Persistence & Export**: Fully client-side with `localStorage` persistence, 64×32 PNG export, skin JSON export/import, and external PNG skin loading.
- **100% Static & GitHub Pages Ready**: Zero backend or server requirements. Relative asset paths.

---

## Deploying to GitHub Pages

This project is configured for GitHub Pages static hosting out of the box.

### Method 1: Automated GitHub Actions (Recommended)

1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and publish the site to `https://<your-username>.github.io/<repository-name>/` whenever changes are pushed to `main`.

### Method 2: Manual / Custom Build

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the static site into `dist/`:
   ```bash
   npm run build
   ```
3. Deploy the contents of the `dist/` directory to GitHub Pages (using `gh-pages` branch or your preferred static deployment tool).

---

## Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Lint and check TypeScript
npm run lint

# Build for production
npm run build
```
