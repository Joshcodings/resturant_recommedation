/**
 * src/config/i18nDrafts.ts
 * ========================
 * Multilingual draft translations for core TasteMatch actions, labels, and notices.
 * 
 * STRICT COMPLIANCE (Hard Rule 7):
 * "Any Nigerian Pidgin, Yoruba, Igbo, or Hausa text is draft and must be marked
 *  'needs native-speaker review'."
 * 
 * Languages supported:
 * - English (en, default)
 * - Nigerian Pidgin (pcm)
 * - Yorùbá (yo)
 * - Igbo (ig)
 * - Hausa (ha)
 */

export const DRAFT_DISCLAIMER = '(draft — needs native-speaker review)';

export type SupportedLocale = 'en' | 'pcm' | 'yo' | 'ig' | 'ha';

export interface LanguageOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
  sublabel?: string;
  isDraft: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    isDraft: false,
  },
  {
    code: 'pcm',
    label: 'Nigerian Pidgin',
    nativeLabel: 'Naija Pidgin',
    sublabel: DRAFT_DISCLAIMER,
    isDraft: true,
  },
  {
    code: 'yo',
    label: 'Yorùbá',
    nativeLabel: 'Èdè Yorùbá',
    sublabel: DRAFT_DISCLAIMER,
    isDraft: true,
  },
  {
    code: 'ig',
    label: 'Igbo',
    nativeLabel: 'Asụsụ Igbo',
    sublabel: DRAFT_DISCLAIMER,
    isDraft: true,
  },
  {
    code: 'ha',
    label: 'Hausa',
    nativeLabel: 'Harshen Hausa',
    sublabel: DRAFT_DISCLAIMER,
    isDraft: true,
  },
];

export interface Translations {
  // Navigation
  nav_discover: string;
  nav_group: string;
  nav_insights: string;
  nav_about: string;

  // Actions & Controls
  search_placeholder: string;
  filter_open_now: string;
  filter_data_saver: string;
  btn_add_place: string;
  btn_compare: string;
  btn_food_run: string;
  btn_owambe_crawl: string;
  state_capitals_title: string;

  // Group Mode
  group_hero_title: string;

  // Compare & Attributes
  compare_title: string;
  attr_payment_methods: string;
  attr_backup_power: string;
  attr_air_conditioning: string;
  attr_open_now: string;
  attr_nearest_landmark: string;
  attr_price_range: string;
  attr_cost_for_two: string;

  // Notices
  unrated_notice: string;
  draft_disclaimer_notice: string;
}

export const TRANSLATIONS: Record<SupportedLocale, Translations> = {
  en: {
    nav_discover: 'Discover',
    nav_group: 'Group',
    nav_insights: 'Insights',
    nav_about: 'About',
    search_placeholder: 'Search dishes (jollof, suya, amala, egusi, shawarma, asun...) or names',
    filter_open_now: 'Open Now',
    filter_data_saver: 'Data Saver',
    btn_add_place: 'Add a Place',
    btn_compare: 'Compare',
    btn_food_run: 'Food Run Planner',
    btn_owambe_crawl: 'Owambe Crawl Planner',
    state_capitals_title: '36 State Capitals',
    group_hero_title: 'Where are we eating?',
    compare_title: 'Compare Restaurants',
    attr_payment_methods: 'Payment Methods',
    attr_backup_power: 'Backup Power / Generator',
    attr_air_conditioning: 'Air Conditioning (AC)',
    attr_open_now: 'Open Now Status',
    attr_nearest_landmark: 'Nearest Landmark',
    attr_price_range: 'Price range',
    attr_cost_for_two: 'Cost for two',
    unrated_notice: 'No ratings available for this city. Results are ordered by cuisine match, nearness, listing completeness and freshness, not by quality.',
    draft_disclaimer_notice: '',
  },
  pcm: {
    nav_discover: 'Find Chop (draft — needs native-speaker review)',
    nav_group: 'Chop with Dem (draft — needs native-speaker review)',
    nav_insights: 'Data Gist (draft — needs native-speaker review)',
    nav_about: 'About TasteMatch (draft — needs native-speaker review)',
    search_placeholder: 'Search joint or chop (suya, jollof, amala, shawarma...) (draft — needs native-speaker review)',
    filter_open_now: 'Dey Open Now (draft — needs native-speaker review)',
    filter_data_saver: 'Data Saver (draft — needs native-speaker review)',
    btn_add_place: 'Add New Joint (draft — needs native-speaker review)',
    btn_compare: 'Compare Joints (draft — needs native-speaker review)',
    btn_food_run: 'Food Run Planner (draft — needs native-speaker review)',
    btn_owambe_crawl: 'Owambe Crawl Planner (draft — needs native-speaker review)',
    state_capitals_title: 'State Capitals (draft — needs native-speaker review)',
    group_hero_title: 'Where we dey go chop? (draft — needs native-speaker review)',
    compare_title: 'Compare Joints (draft — needs native-speaker review)',
    attr_payment_methods: 'How to Pay (Cash/POS/Transfer) (draft — needs native-speaker review)',
    attr_backup_power: 'Gen / Light Available (draft — needs native-speaker review)',
    attr_air_conditioning: 'AC Dey (draft — needs native-speaker review)',
    attr_open_now: 'Open Now (draft — needs native-speaker review)',
    attr_nearest_landmark: 'Nearest Landmark (draft — needs native-speaker review)',
    attr_price_range: 'Pocket Level (draft — needs native-speaker review)',
    attr_cost_for_two: 'Chop Money for Two (draft — needs native-speaker review)',
    unrated_notice: 'No star rating for here. Places dey arranged by chop match, nearness, and details (draft — needs native-speaker review).',
    draft_disclaimer_notice: 'Pidgin translations are provisional and need native-speaker review (Hard Rule 7).',
  },
  yo: {
    nav_discover: 'Wá Oúnjẹ (draft — needs native-speaker review)',
    nav_group: 'Jẹun Pẹ̀lú Ẹgbẹ́ (draft — needs native-speaker review)',
    nav_insights: 'Ìròyìn Data (draft — needs native-speaker review)',
    nav_about: 'Nípa TasteMatch (draft — needs native-speaker review)',
    search_placeholder: 'Wá oúnjẹ tàbí ilé-oúnjẹ (àmàlà, jollof, sùyà...) (draft — needs native-speaker review)',
    filter_open_now: 'Ó Ṣí Lọ́wọ́lọ́wọ́ (draft — needs native-speaker review)',
    filter_data_saver: 'Pà mọ́ Data (draft — needs native-speaker review)',
    btn_add_place: 'Fi Ilé-oúnjẹ Kún (draft — needs native-speaker review)',
    btn_compare: 'Ṣe Àfiwé (draft — needs native-speaker review)',
    btn_food_run: 'Ètò Ìrìn-àjò Oúnjẹ (draft — needs native-speaker review)',
    btn_owambe_crawl: 'Ètò Ìrìn-àjò Ọwambẹ (draft — needs native-speaker review)',
    state_capitals_title: 'Àwọn Olú-ìlú Ìpínlẹ̀ (draft — needs native-speaker review)',
    group_hero_title: 'Níbo ni a ti fẹ́ jẹun? (draft — needs native-speaker review)',
    compare_title: 'Ṣe Àfiwé Àwọn Ilé-oúnjẹ (draft — needs native-speaker review)',
    attr_payment_methods: 'Ọ̀nà Ìsanwó (Owó/Káàdì/POS) (draft — needs native-speaker review)',
    attr_backup_power: 'Iná / Ẹ̀rọ Amúnáwá (Generator) (draft — needs native-speaker review)',
    attr_air_conditioning: 'Iná Afẹ́fẹ́ Tutù (AC) (draft — needs native-speaker review)',
    attr_open_now: 'Bóyá Ó Ṣí Lọ́wọ́lọ́wọ́ (draft — needs native-speaker review)',
    attr_nearest_landmark: 'Ibi Ìdánimọ̀ Tó Súnmọ́ Jù (draft — needs native-speaker review)',
    attr_price_range: 'Iye Owó (draft — needs native-speaker review)',
    attr_cost_for_two: 'Iye Owó fún Ènìyàn Méjì (draft — needs native-speaker review)',
    unrated_notice: 'Kò sí ìwọ̀n ìràwọ̀ fún ìlú yìí. Àwọn àbájáde jẹ́ títò nípa oúnjẹ, súnmọ́, àti ìmúdàgba (draft — needs native-speaker review).',
    draft_disclaimer_notice: 'Àwọn ọ̀rọ̀ Yorùbá wọ̀nyí jẹ́ àkọ́kọ́ṣe, wọ́n sì nílò àyẹ̀wò olùsọ èdè abínibí (Hard Rule 7).',
  },
  ig: {
    nav_discover: 'Chọọ Nri (draft — needs native-speaker review)',
    nav_group: 'Rie Nri na Otu (draft — needs native-speaker review)',
    nav_insights: 'Nkọwa Data (draft — needs native-speaker review)',
    nav_about: 'Maka TasteMatch (draft — needs native-speaker review)',
    search_placeholder: 'Chọọ nri ma ọ bụ ebe nri (suya, jollof, egusi...) (draft — needs native-speaker review)',
    filter_open_now: 'Meghe Ugbu a (draft — needs native-speaker review)',
    filter_data_saver: 'Chekwa Data (draft — needs native-speaker review)',
    btn_add_place: 'Tinye Ebe Nri Ọhụrụ (draft — needs native-speaker review)',
    btn_compare: 'Tụlee Ebe Nri (draft — needs native-speaker review)',
    btn_food_run: 'Atụmatụ Mgbasa Nri (draft — needs native-speaker review)',
    btn_owambe_crawl: 'Atụmatụ Njegharị Nri (draft — needs native-speaker review)',
    state_capitals_title: 'Isi Obodo Steeti (draft — needs native-speaker review)',
    group_hero_title: 'Ebee ka anyị ga-eri nri? (draft — needs native-speaker review)',
    compare_title: 'Tụlee Ebe Nri (draft — needs native-speaker review)',
    attr_payment_methods: 'Ụzọ Ịkwụ Ụgwọ (Ego/Kaadị/POS) (draft — needs native-speaker review)',
    attr_backup_power: 'Ọkụ Injin (Generator) (draft — needs native-speaker review)',
    attr_air_conditioning: 'Ikuku Oyi (AC) (draft — needs native-speaker review)',
    attr_open_now: 'Meghe Ugbu a (draft — needs native-speaker review)',
    attr_nearest_landmark: 'Ebe Ama Ama Dị Nso (draft — needs native-speaker review)',
    attr_price_range: 'Ọnụego (draft — needs native-speaker review)',
    attr_cost_for_two: 'Ọnụ Nri Maka Mmadụ Abụọ (draft — needs native-speaker review)',
    unrated_notice: 'Enweghị ọkwa kpakpando maka obodo a. E depụtara nsonaazụ site na ụdị nri na ịdị nso (draft — needs native-speaker review).',
    draft_disclaimer_notice: 'Nsụgharị Igbo a bụ nke ndepụta mbụ, ọ chọkwara nlegharị anya nke onye asụsụ ala ya (Hard Rule 7).',
  },
  ha: {
    nav_discover: 'Nemi Abinci (draft — needs native-speaker review)',
    nav_group: 'Cin Abinci Tare (draft — needs native-speaker review)',
    nav_insights: 'Bayanin Bayanai (draft — needs native-speaker review)',
    nav_about: 'Game da TasteMatch (draft — needs native-speaker review)',
    search_placeholder: 'Bincika abinci ko sunan wuri (suya, tuwo, jollof...) (draft — needs native-speaker review)',
    filter_open_now: 'A Buɗe Yanzu (draft — needs native-speaker review)',
    filter_data_saver: 'Adana Bayanai (draft — needs native-speaker review)',
    btn_add_place: 'Ƙara Wurin Abinci (draft — needs native-speaker review)',
    btn_compare: 'Kwatanta Wurare (draft — needs native-speaker review)',
    btn_food_run: 'Tsarin Neman Abinci (draft — needs native-speaker review)',
    btn_owambe_crawl: 'Tsarin Yawon Bikin Abinci (draft — needs native-speaker review)',
    state_capitals_title: 'Babban Biranen Jihohi (draft — needs native-speaker review)',
    group_hero_title: 'Ina za mu ci abinci? (draft — needs native-speaker review)',
    compare_title: 'Kwatanta Wuraren Abinci (draft — needs native-speaker review)',
    attr_payment_methods: 'Hanyar Biyan Kuɗi (Kuɗi/Katin/POS) (draft — needs native-speaker review)',
    attr_backup_power: 'Wutar Janareto (Generator) (draft — needs native-speaker review)',
    attr_air_conditioning: 'Na\'urar Sanyaya (AC) (draft — needs native-speaker review)',
    attr_open_now: 'Halin Buɗewa Yanzu (draft — needs native-speaker review)',
    attr_nearest_landmark: 'Wurin Shaida Mafi Kusa (draft — needs native-speaker review)',
    attr_price_range: 'Matsayin Kuɗi (draft — needs native-speaker review)',
    attr_cost_for_two: 'Kuɗin Abinci na Mutum Biyu (draft — needs native-speaker review)',
    unrated_notice: 'Babu taurarin kimantawa a wannan birni. Ana jera sakamako ta nau\'in abinci da kusanci (draft — needs native-speaker review).',
    draft_disclaimer_notice: 'Fassarar Hausa da aka yi ta zama samfuri ne kawai, tana buƙatar bita daga mai jin yaren asali (Hard Rule 7).',
  },
};
