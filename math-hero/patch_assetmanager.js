const fs = require('fs');
const file = 'app/src/main/assets/math/src/assets/assetManager.js';
let content = fs.readFileSync(file, 'utf8');

// Add a fallback image to AssetManager constructor
content = content.replace(
  'this._ready = false;\n  }',
  'this._ready = false;\n    // Fallback 1x1 transparent image\n    this.fallbackImage = new Image();\n    this.fallbackImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";\n  }'
);

// Modify get(key) to return fallbackImage if not cached
content = content.replace(
  'get(key) {\n    return this.cache.get(key) || null;\n  }',
  'get(key) {\n    return this.cache.get(key) || this.fallbackImage;\n  }'
);

fs.writeFileSync(file, content);
console.log("AssetManager patched");
