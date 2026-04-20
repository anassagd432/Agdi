const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'assets') continue;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walkDir(filePath));
      } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
        results.push(filePath);
      }
    }
  } catch (e) {}
  return results;
}

const files = walkDir('./ui');
let c = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  content = content.replace( />OpenClaw</g, '>Agdi<');
  content = content.replace( /\"OpenClaw\"/g, '\"Agdi\"');
  content = content.replace( /openclaw gateway/gi, 'agdi gateway');
  content = content.replace( /openclaw login/gi, 'agdi login');
  content = content.replace( /openclaw doctor/gi, 'agdi doctor');
  content = content.replace( /docs\.openclaw\.ai/gi, 'docs.agdi.ai');
  content = content.replace( /openclaw security/gi, 'agdi security');
  content = content.replace( /openclaw dashboard/gi, 'agdi dashboard');
  content = content.replace( /openclaw app/gi, 'agdi app');
  content = content.replace( /openclaw devices/gi, 'agdi devices');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Rebranded ui:', f);
    c++;
  }
}
console.log('Done ui, changed:', c);
