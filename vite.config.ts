import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

import fs from 'fs';

function maskStoragePlugin() {
  return {
    name: 'mask-storage-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/save-masks' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filePath = path.resolve(__dirname, 'src/data/maskOverrides.json');
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

              // Also persist into src/data/supabaseTextures.ts so subsequent builds have masks directly baked into the items
              try {
                const catalogPath = path.resolve(__dirname, 'src/data/supabaseTextures.ts');
                if (fs.existsSync(catalogPath)) {
                  const catalogContent = fs.readFileSync(catalogPath, 'utf8');
                  const match = catalogContent.match(/export const SUPABASE_TEXTURE_ITEMS:\s*SkinItem\[\]\s*=\s*(\[[\s\S]*\]);/);
                  if (match) {
                    const items = JSON.parse(match[1]);
                    for (const item of items) {
                      if (data[item.texture] && data[item.texture] !== 'none') {
                        item.mask = data[item.texture];
                      } else if (data[item.texture] === 'none' || (item.texture in data && !data[item.texture])) {
                        delete item.mask;
                      }
                    }
                    const updatedContent = `import { SkinItem } from "../types/skin";\n\nexport const SUPABASE_TEXTURE_ITEMS: SkinItem[] = ${JSON.stringify(items, null, 2)};\n`;
                    fs.writeFileSync(catalogPath, updatedContent, 'utf8');
                  }
                }
              } catch (catErr) {
                console.warn('Could not sync to supabaseTextures.ts:', catErr);
              }

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: Object.keys(data).length }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.url === '/api/load-masks' && req.method === 'GET') {
          try {
            const filePath = path.resolve(__dirname, 'src/data/maskOverrides.json');
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath, 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(content);
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end('{}');
            }
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), maskStoragePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
