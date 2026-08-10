const fs = require('fs');
const file = 'app/src/main/assets/math/src/assets/assetManager.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'return key ? this.get(key) : null;',
  'return key ? this.get(key) : this.fallbackImage;'
).replace(
  'if (!key) return null;',
  'if (!key) return this.fallbackImage;'
).replace(
  'return key ? this.get(key) : null;',
  'return key ? this.get(key) : this.fallbackImage;'
).replace(
  'return key ? this.get(key) : null;',
  'return key ? this.get(key) : this.fallbackImage;'
);

fs.writeFileSync(file, content);
console.log("AssetManager patched again");
