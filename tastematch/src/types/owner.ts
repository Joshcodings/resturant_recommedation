/**
 * src/types/owner.ts
 * ==================
 * Data structures for restaurant owner claims, community profiles, and moderation.
 * Kept strictly in a separate data layer from OpenStreetMap data.
 */

export interface OwnerProfile {
  uid: string; // Target OSM or community uid
  restaurant_name: string;
  owner_name: string;
  whatsapp_phone: string; // Validated 234 format (e.g. 2348012345678)
  opening_hours?: string | null;
  menu_url?: string | null;
  address?: string | null;
  cuisines?: string[];
  payment_methods?: {
    cash?: boolean;
    cards?: boolean;
    mobile_payment?: boolean;
    bank_transfer?: boolean;
    ussd?: boolean;
  };
  delivery?: boolean | null;
  proof_url: string; // Link to Instagram/Google/Facebook/Sign photo
  source: 'owner';
  verified_at: string; // YYYY-MM-DD
  license_note: string;
  attribution: string; // e.g. "Provided by owner, 2026-10-17"
}

export interface OwnerClaimInput {
  placeUid: string;
  restaurantName: string;
  city: string;
  locality?: string;
  ownerName: string;
  whatsappPhone: string; // Digits or +234
  openingHours?: string;
  menuUrl?: string;
  address?: string;
  cuisines?: string[];
  paymentMethods?: {
    cash?: boolean;
    cards?: boolean;
    mobile_payment?: boolean;
    bank_transfer?: boolean;
    ussd?: boolean;
  };
  delivery?: boolean;
  proofUrl: string;
}

export interface TakedownRequestInput {
  placeUid: string;
  restaurantName: string;
  requesterName: string;
  requesterRole: 'owner' | 'authorized_manager' | 'legal_rep';
  contactEmail: string;
  contactPhone: string;
  reason: 'permanently_closed' | 'duplicate' | 'incorrect_ownership' | 'privacy_request' | 'other';
  details: string;
}
