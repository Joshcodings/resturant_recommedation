/**
 * src/config/site.ts
 * ==================
 * Global site and administrative configuration for TasteMatch.
 *
 * NOTE: ADMIN_WHATSAPP_NUMBER is intentionally left empty by default.
 * The repo owner fills this in when ready to accept direct WhatsApp submissions.
 * Never hard-code an admin personal phone number.
 */

export const REPO_OWNER = 'Joshcodings';
export const REPO_NAME = 'resturant_recommedation';
export const GITHUB_REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

/**
 * Admin WhatsApp number in 234 format (e.g. '2348012345678').
 * Set via environment variable or directly here by the site administrator.
 * Empty by default.
 */
export const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER || '';

/**
 * Returns whether an admin WhatsApp number is configured.
 */
export function hasAdminWhatsApp(): boolean {
  return typeof ADMIN_WHATSAPP_NUMBER === 'string' && ADMIN_WHATSAPP_NUMBER.trim().length >= 10;
}

/**
 * Canonical site URL
 */
export const SITE_URL = 'https://tastematch.pages.dev';
