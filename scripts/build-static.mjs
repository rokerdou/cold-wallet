import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const offlineDir = path.join(projectRoot, 'offline');
const indexPath = path.join(distDir, 'index.html');
const outputPath = path.join(offlineDir, 'omnivault-offline.html');

function resolveAssetPath(assetPath) {
  const normalized = assetPath.replace(/^\.\//, '').replace(/^\//, '');
  return path.join(distDir, normalized);
}

let html = await readFile(indexPath, 'utf8');

html = html.replace(
  /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_match, href) => {
    const css = readFileSync(resolveAssetPath(href), 'utf8');
    return `<style>\n${css}\n</style>`;
  },
);

html = html.replace(
  /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
  (_match, src) => {
    const js = readFileSync(resolveAssetPath(src), 'utf8');
    return `<script type="module">\n${js}\n</script>`;
  },
);

await mkdir(offlineDir, { recursive: true });
await writeFile(outputPath, html, 'utf8');

console.log(`Wrote ${path.relative(projectRoot, outputPath)}`);
