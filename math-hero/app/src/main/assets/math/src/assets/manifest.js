/**
 * Compatibility re-export. The canonical manifest lives in assetManager.js.
 * New code must import ASSET_MANIFEST from this module or assetManager.js,
 * never maintain a second list of paths.
 */
export {
  ASSET_MANIFEST,
  ENEMY_ASSET_MAP,
  BOSS_ASSET_MAP,
  BG_ASSET_MAP,
} from './assetManager.js';
