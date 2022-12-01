import { createContentScript } from '../src/content-script';

// web_accessible_resources 备注
createContentScript({ preloadUrl: './preload.js' });
