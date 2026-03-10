const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const txtPath = path.join(rootDir, 'ligands.txt');
const outPath = path.join(rootDir, 'src', 'data', 'ligands.js');

function normalizeId(raw) {
  return String(raw || '').trim().toUpperCase();
}

function readLigandsTxt() {
  const raw = fs.readFileSync(txtPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const seen = new Set();
  const ids = [];

  for (const line of lines) {
    const id = normalizeId(line);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function writeLigandsTxt(ids) {
  fs.writeFileSync(txtPath, ids.join('\n') + '\n', 'utf8');
}

function renderLigandsJs(ids) {
  const items = ids.map((id) => `  \"${id}\",`).join('\n');
  return `const ligands = [\n${items}\n];\n\nexport default ligands;\n`;
}

function writeLigandsJs(ids) {
  fs.writeFileSync(outPath, renderLigandsJs(ids), 'utf8');
}

function main() {
  if (!fs.existsSync(txtPath)) {
    console.error(`Missing ligands.txt at: ${txtPath}`);
    process.exit(1);
  }

  const ids = readLigandsTxt();
  if (ids.length === 0) {
    console.error('No ligand IDs found in ligands.txt');
    process.exit(1);
  }

  // Keep deterministic ordering: preserve file order, but ensure we write back normalized
  // (trimmed + uppercased + de-duplicated).
  writeLigandsTxt(ids);
  writeLigandsJs(ids);

  console.log(`Synced ${ids.length} ligand IDs -> src/data/ligands.js`);
}

main();
