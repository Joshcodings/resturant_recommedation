/**
 * src/config/nigerianCapitals.ts
 * ==============================
 * Comprehensive index of all 36 Nigerian States + Federal Capital Territory (FCT).
 * Used for Feature 10: State Capital Switcher.
 */

export interface NigerianStateCapital {
  state: string;
  capital: string;
  zone: 'North Central' | 'North East' | 'North West' | 'South East' | 'South South' | 'South West';
  lat: number;
  lng: number;
  aliases?: string[];
}

export const NIGERIAN_STATE_CAPITALS: NigerianStateCapital[] = [
  { state: 'Abia', capital: 'Umuahia', zone: 'South East', lat: 5.526, lng: 7.489 },
  { state: 'Adamawa', capital: 'Yola', zone: 'North East', lat: 9.209, lng: 12.481 },
  { state: 'Akwa Ibom', capital: 'Uyo', zone: 'South South', lat: 5.037, lng: 7.912 },
  { state: 'Anambra', capital: 'Awka', zone: 'South East', lat: 6.22, lng: 7.072 },
  { state: 'Bauchi', capital: 'Bauchi', zone: 'North East', lat: 10.315, lng: 9.844 },
  { state: 'Bayelsa', capital: 'Yenagoa', zone: 'South South', lat: 4.927, lng: 6.264 },
  { state: 'Benue', capital: 'Makurdi', zone: 'North Central', lat: 7.732, lng: 8.521 },
  { state: 'Borno', capital: 'Maiduguri', zone: 'North East', lat: 11.833, lng: 13.151 },
  { state: 'Cross River', capital: 'Calabar', zone: 'South South', lat: 4.975, lng: 8.341 },
  { state: 'Delta', capital: 'Asaba', zone: 'South South', lat: 6.198, lng: 6.732 },
  { state: 'Ebonyi', capital: 'Abakaliki', zone: 'South East', lat: 6.324, lng: 8.113 },
  { state: 'Edo', capital: 'Benin City', zone: 'South South', lat: 6.335, lng: 5.603 },
  { state: 'Ekiti', capital: 'Ado-Ekiti', zone: 'South West', lat: 7.621, lng: 5.221 },
  { state: 'Enugu', capital: 'Enugu', zone: 'South East', lat: 6.458, lng: 7.546 },
  { state: 'Federal Capital Territory', capital: 'Abuja', zone: 'North Central', lat: 9.0765, lng: 7.3986 },
  { state: 'Gombe', capital: 'Gombe', zone: 'North East', lat: 10.289, lng: 11.167 },
  { state: 'Imo', capital: 'Owerri', zone: 'South East', lat: 5.485, lng: 7.035 },
  { state: 'Jigawa', capital: 'Dutse', zone: 'North West', lat: 11.756, lng: 9.338 },
  { state: 'Kaduna', capital: 'Kaduna', zone: 'North West', lat: 10.51, lng: 7.416 },
  { state: 'Kano', capital: 'Kano', zone: 'North West', lat: 12.002, lng: 8.591 },
  { state: 'Katsina', capital: 'Katsina', zone: 'North West', lat: 12.99, lng: 7.601 },
  { state: 'Kebbi', capital: 'Birnin Kebbi', zone: 'North West', lat: 12.453, lng: 4.197 },
  { state: 'Kogi', capital: 'Lokoja', zone: 'North Central', lat: 7.802, lng: 6.743 },
  { state: 'Kwara', capital: 'Ilorin', zone: 'North Central', lat: 8.496, lng: 4.542 },
  { state: 'Lagos', capital: 'Lagos', zone: 'South West', lat: 6.5244, lng: 3.3792, aliases: ['Ikeja'] },
  { state: 'Nasarawa', capital: 'Lafia', zone: 'North Central', lat: 8.493, lng: 8.515 },
  { state: 'Niger', capital: 'Minna', zone: 'North Central', lat: 9.613, lng: 6.556 },
  { state: 'Ogun', capital: 'Abeokuta', zone: 'South West', lat: 7.147, lng: 3.361 },
  { state: 'Ondo', capital: 'Akure', zone: 'South West', lat: 7.257, lng: 5.205 },
  { state: 'Osun', capital: 'Osogbo', zone: 'South West', lat: 7.782, lng: 4.541, aliases: ['Oshogbo'] },
  { state: 'Oyo', capital: 'Ibadan', zone: 'South West', lat: 7.377, lng: 3.947 },
  { state: 'Plateau', capital: 'Jos', zone: 'North Central', lat: 9.896, lng: 8.858 },
  { state: 'Rivers', capital: 'Port Harcourt', zone: 'South South', lat: 4.815, lng: 7.049 },
  { state: 'Sokoto', capital: 'Sokoto', zone: 'North West', lat: 13.005, lng: 5.247 },
  { state: 'Taraba', capital: 'Jalingo', zone: 'North East', lat: 8.893, lng: 11.359 },
  { state: 'Yobe', capital: 'Damaturu', zone: 'North East', lat: 11.747, lng: 11.96 },
  { state: 'Zamfara', capital: 'Gusau', zone: 'North West', lat: 12.162, lng: 6.661 },
];

export const GEOPOLITICAL_ZONES = [
  'All',
  'North Central',
  'North East',
  'North West',
  'South East',
  'South South',
  'South West',
] as const;

export type GeopoliticalZone = (typeof GEOPOLITICAL_ZONES)[number];
