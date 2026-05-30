export const FAVICON_SIZE = 16;
// Largest source this tool will analyze. Not a Safari limit (Safari downscales
// anything), but 512 is the biggest "real" favicon/PWA icon size, and capping
// here bounds runtime and keeps the framing honest.
export const MAX_SOURCE_SIZE = 512;
export const ALPHA_OPAQUE = 250;
export const ALPHA_VISIBLE = 16;
export const MIN_VISIBLE_PIXELS = 4;
export const CONTRAST_THRESHOLD = 2.5;

export const TAB_LIGHT = '#E8E8E8';
export const TAB_DARK = '#282828';
export const ACCENT_LIGHT_MODE = '#000000';
export const ACCENT_DARK_MODE = '#FFFFFF';
export const EDGE_OPAQUE_RATIO = 0.75;
export const TRANSPARENT_EDGE_RATIO = 0.6;
