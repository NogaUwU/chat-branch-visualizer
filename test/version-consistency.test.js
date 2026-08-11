const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = require('../manifest.json');
const selectors = require('../selectors.json');

test('manifest, selector registry, and README badge use the same version', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

  assert.equal(selectors.version, manifest.version);
  assert.match(readme, new RegExp(`Chrome%20Web%20Store-v${manifest.version.replaceAll('.', '\\.')}-blue`));
});
