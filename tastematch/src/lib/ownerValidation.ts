/**
 * src/lib/ownerValidation.ts
 * ===========================
 * Validation and URL generators for Nigerian phone numbers, owner claims,
 * WhatsApp ordering, and GitHub issue form submissions.
 */

import { GITHUB_REPO_URL, ADMIN_WHATSAPP_NUMBER } from '@/config/site';
import type { OwnerClaimInput, TakedownRequestInput } from '@/types/owner';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Validates and normalizes a phone number to strictly 234 format (e.g. 2348012345678).
 * Nigerian numbers: country code 234 + 10 digits = 13 digits total.
 */
export function validateNigerian234Phone(rawPhone: string | null | undefined): PhoneValidationResult {
  if (!rawPhone || !rawPhone.trim()) {
    return { isValid: false, normalized: '', error: 'WhatsApp phone number is required.' };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Handle local Nigerian format starting with 0 (e.g. 08012345678 -> 2348012345678)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }

  // Handle number entered without country code or 0 (e.g. 8012345678 -> 2348012345678)
  if (cleaned.length === 10 && /^[789][01]\d{8}$/.test(cleaned)) {
    cleaned = '234' + cleaned;
  }

  // Strict check: must start with 234 and have exactly 13 digits
  const nigerianRegex = /^234(70|80|81|90|91|71)\d{8}$/;
  const general234Regex = /^234\d{10}$/;

  if (!general234Regex.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Phone number must be a valid Nigerian number in 234 format (e.g. 2348012345678 or 08012345678).',
    };
  }

  // Soft check for common mobile prefixes (70, 80, 81, 90, 91)
  if (!nigerianRegex.test(cleaned)) {
    // We still accept general 234+10 digits in case of new network ranges, but format is confirmed valid
    return { isValid: true, normalized: cleaned };
  }

  return { isValid: true, normalized: cleaned };
}

/**
 * Validates URL format for proof links (Instagram, Google Maps, Facebook, website, or photo link)
 */
export function validateProofUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || !rawUrl.trim()) return false;
  try {
    const url = new URL(rawUrl.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generates an Order-on-WhatsApp direct link using a validated 234 number.
 * Returns null if the phone number is invalid.
 */
export function generateWhatsAppOrderUrl(phone: string | null | undefined, restaurantName: string): string | null {
  const validation = validateNigerian234Phone(phone);
  if (!validation.isValid) return null;

  const message = `Hello! I found ${restaurantName} on TasteMatch. I'd like to place an order.`;
  return `https://wa.me/${validation.normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Formats owner claim details as plain text for direct WhatsApp message to admin.
 */
export function generateOwnerClaimWhatsAppText(claim: OwnerClaimInput): string {
  const lines = [
    `*TasteMatch Restaurant Owner Claim*`,
    `------------------------------------`,
    `*Restaurant:* ${claim.restaurantName}`,
    `*Place UID:* ${claim.placeUid}`,
    `*City/Locality:* ${claim.locality ? `${claim.locality}, ` : ''}${claim.city}`,
    `*Owner/Manager:* ${claim.ownerName}`,
    `*WhatsApp Phone:* ${claim.whatsappPhone}`,
    claim.openingHours ? `*Hours:* ${claim.openingHours}` : null,
    claim.cuisines?.length ? `*Cuisines:* ${claim.cuisines.join(', ')}` : null,
    claim.menuUrl ? `*Menu Link:* ${claim.menuUrl}` : null,
    claim.delivery !== undefined ? `*Delivery:* ${claim.delivery ? 'Yes' : 'No'}` : null,
    `*Proof of Ownership:* ${claim.proofUrl}`,
    `------------------------------------`,
    `I confirm this data is accurate and request verification for our listing.`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generates WhatsApp URL pre-filled to send owner claim to TasteMatch admin.
 * If targetAdminNumber is not provided, defaults to ADMIN_WHATSAPP_NUMBER from site config.
 */
export function getAdminClaimWhatsAppUrl(claim: OwnerClaimInput, customAdminNumber?: string): string | null {
  const adminNum = (customAdminNumber || ADMIN_WHATSAPP_NUMBER).trim();
  const validation = validateNigerian234Phone(adminNum);
  if (!validation.isValid) return null;

  const text = generateOwnerClaimWhatsAppText(claim);
  return `https://wa.me/${validation.normalized}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates GitHub Issue Form URL for claiming a restaurant.
 */
export function generateOwnerClaimGitHubIssueUrl(claim: OwnerClaimInput): string {
  const title = `[Owner Claim] ${claim.restaurantName} (${claim.city})`;
  const body = [
    `### Restaurant Name`,
    claim.restaurantName,
    ``,
    `### Place UID`,
    claim.placeUid,
    ``,
    `### City & Locality`,
    `${claim.locality ? `${claim.locality}, ` : ''}${claim.city}`,
    ``,
    `### Owner / Manager Name`,
    claim.ownerName,
    ``,
    `### Owner WhatsApp Phone (234 Format)`,
    claim.whatsappPhone,
    ``,
    `### Opening Hours`,
    claim.openingHours || 'Not specified',
    ``,
    `### Cuisines`,
    claim.cuisines?.join(', ') || 'Not specified',
    ``,
    `### Menu Link or Photo URL`,
    claim.menuUrl || 'None',
    ``,
    `### Delivery Available`,
    claim.delivery ? 'Yes' : 'No',
    ``,
    `### Proof of Ownership (Social Link or Signboard Photo)`,
    claim.proofUrl,
    ``,
    `### Declaration`,
    `- [x] I confirm I am the authorized owner or manager of this establishment.`,
    `- [x] I consent to TasteMatch publishing this business contact info for discovery and WhatsApp orders.`,
  ].join('\n');

  return `${GITHUB_REPO_URL}/issues/new?template=restaurant_claim.yml&labels=owner-claim&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generates GitHub Issue URL for takedown / correction requests (7-day SLA).
 */
export function generateTakedownGitHubIssueUrl(input: TakedownRequestInput): string {
  const title = `[Takedown/Correction] ${input.restaurantName} (${input.placeUid})`;
  const body = [
    `### Restaurant Name`,
    input.restaurantName,
    ``,
    `### Place UID`,
    input.placeUid,
    ``,
    `### Requester Name`,
    input.requesterName,
    ``,
    `### Requester Role`,
    input.requesterRole,
    ``,
    `### Contact Email / Phone`,
    `${input.contactEmail} / ${input.contactPhone}`,
    ``,
    `### Reason for Request`,
    input.reason,
    ``,
    `### Details / Correction Required`,
    input.details,
    ``,
    `### 7-Day SLA Acknowledgment`,
    `- [x] I understand this request will be reviewed within 7 business days under the TasteMatch Takedown Policy.`,
  ].join('\n');

  return `${GITHUB_REPO_URL}/issues/new?template=takedown_request.yml&labels=takedown-request&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generates copy-paste WhatsApp status text for owners.
 */
export function generateStatusShareText(restaurantName: string, placeSlug: string): string {
  return `🍽️ Find us on TasteMatch (${restaurantName})! Check out our verified menu, opening hours, and order directly on WhatsApp: https://tastematch.pages.dev/place/${placeSlug}`;
}
