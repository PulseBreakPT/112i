// Keep UI colours in palette tokens. Layout styles must not introduce fixed ink.
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const source = path.resolve(__dirname, '../src');
const failures = [];
let checked = 0;
for (const directory of [source, path.join(source, 'game')]) {
  for (const name of fs.readdirSync(directory).filter(file => file.endsWith('.css'))) {
    const file = path.join(directory, name);
    postcss.parse(fs.readFileSync(file, 'utf8'), { from: file }).walkDecls(decl => {
      checked++;
      // Root palette defaults are intentional and work before React mounts.
      if (decl.prop.startsWith('--') && decl.parent.selector?.includes(':root')) return;
      if (/#[\da-f]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/i.test(decl.value)) {
        failures.push(`${path.relative(source, file)}:${decl.source.start.line} ${decl.prop}: ${decl.value}`);
      }
    });
  }
}
if (failures.length) {
  console.error('Fixed UI colours found; use a shared theme token:\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Theme audit passed: ${checked} CSS declarations use shared colours or root palette defaults.`);
}
