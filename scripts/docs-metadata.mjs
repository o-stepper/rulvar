import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../docs/.vitepress/dist/', import.meta.url));
const siteUrl = 'https://docs.rulvar.com';

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
    }),
  );
  return nested.flat();
}

function attribute(html, tagName, attributeName, attributeValue, valueName) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gu')) ?? [];
  const matching = tags.filter((tag) =>
    new RegExp(`\\b${attributeName}="${attributeValue}"`, 'u').test(tag),
  );
  assert.equal(matching.length, 1, `Expected one ${attributeName}="${attributeValue}" tag`);
  return matching[0].match(new RegExp(`\\b${valueName}="([^"]+)"`, 'u'))?.[1];
}

function expectedUrl(filePath) {
  const outputPath = relative(root, filePath).split(sep).join('/');
  if (outputPath === 'index.html') return `${siteUrl}/`;
  if (outputPath.endsWith('/index.html')) {
    return `${siteUrl}/${outputPath.slice(0, -'index.html'.length)}`;
  }
  return `${siteUrl}/${outputPath.slice(0, -'.html'.length)}`;
}

const files = (await htmlFiles(root)).filter((file) => !file.endsWith(`${sep}404.html`));
assert(files.length > 0, 'No built documentation pages found');

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const expected = expectedUrl(file);
  const canonical = attribute(html, 'link', 'rel', 'canonical', 'href');
  const openGraphUrl = attribute(html, 'meta', 'property', 'og:url', 'content');
  assert.equal(canonical, expected, `Canonical mismatch in ${file}`);
  assert.equal(openGraphUrl, expected, `og:url mismatch in ${file}`);
}

console.log(`Documentation metadata passed for ${files.length} pages.`);
