// Single source of truth for the app version. Sourced from package.json at
// build time via NEXT_PUBLIC_APP_VERSION (see next.config.js).
export const APP_VERSION = process.env['NEXT_PUBLIC_APP_VERSION'] ?? '0.0.0';

// Developer contact for bug reports, sourced from package.json `bugs.email`
// via NEXT_PUBLIC_BUG_EMAIL (see next.config.js).
export const BUG_EMAIL = process.env['NEXT_PUBLIC_BUG_EMAIL'] ?? '';
