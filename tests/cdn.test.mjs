// The libraries the app loads from jsDelivr are also development dependencies,
// so the browser test can serve them locally. Their versions must stay equal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sources = (dir) =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith('.js') ? [join(dir, e.name)] : [],
  );

test('every library loaded from the CDN has the same version in package.json', () => {
  const deps = JSON.parse(read('package.json')).devDependencies;
  const text = [read('index.html'), ...sources('js').map(read)].join('\n');
  const used = new Map();
  for (const [, pkg, version] of text.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/'"`]+)\//g)) {
    used.set(pkg, [...(used.get(pkg) ?? []), version]);
  }
  assert.deepEqual([...used.keys()].sort(), ['jspdf', 'mathjax', 'three']);
  for (const [pkg, versions] of used) {
    assert.equal(new Set(versions).size, 1, `${pkg} is loaded at several versions: ${versions}`);
    assert.equal(deps[pkg], versions[0], `${pkg}: CDN ${versions[0]}, package.json ${deps[pkg]}`);
  }
});
