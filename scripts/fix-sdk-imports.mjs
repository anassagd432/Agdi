import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

function walkDir(dir) {
  let results = [];
  const list = readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json')) {
      results.push(filePath);
    }
  }
  return results;
}

const dirsToScan = ['src', 'extensions', 'ui'];

let filesChanged = 0;

for (const startDir of dirsToScan) {
  const files = walkDir(startDir);
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      if (content.includes('openclaw/plugin-sdk')) {
        const newContent = content.replace(/openclaw\/plugin-sdk/g, 'agdi/plugin-sdk');
        writeFileSync(file, newContent, 'utf8');
        filesChanged++;
        console.log(`Fixed: ${file}`);
      }
    } catch (err) {
      console.error(`Error reading ${file}: ${err.message}`);
    }
  }
}

console.log(`Done. Changed ${filesChanged} files.`);
