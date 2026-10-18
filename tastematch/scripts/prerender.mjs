import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const dataFilePath = path.resolve(rootDir, '../data/processed/restaurants_ng_full.json');

const BASE_URL = 'https://tastematch.pages.dev';

function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPlaceSlug(restaurant) {
  const cleanUid = restaurant.uid.replace(/[:/]/g, '-').toLowerCase();
  const nameSlug = restaurant.restaurant_name ? slugify(restaurant.restaurant_name) : '';
  return nameSlug ? `${nameSlug}-${cleanUid}` : cleanUid;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateOgSvg({ title, subtitle, tag, details = [] }) {
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safeTag = escapeXml(tag);

  const detailElements = details.slice(0, 3).map((d, i) => {
    const x = 80 + i * 360;
    return `
      <g transform="translate(${x}, 440)">
        <rect width="330" height="70" rx="12" fill="#18191E" stroke="#27272A" stroke-width="1.5"/>
        <text x="20" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#A1A1AA" letter-spacing="1">${escapeXml(d.label)}</text>
        <text x="20" y="54" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#F4F5F6">${escapeXml(d.value)}</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0C0D10" />
          <stop offset="100%" stop-color="#14151B" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <rect x="0" y="0" width="1200" height="6" fill="#C8F03C"/>
      <g transform="translate(80, 70)">
        <circle cx="10" cy="14" r="8" fill="#C8F03C"/>
        <text x="30" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#F4F5F6" letter-spacing="-0.5">tastematch</text>
        <rect x="190" y="0" width="230" height="30" rx="6" fill="#18191E" stroke="#27272A"/>
        <text x="205" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" fill="#C8F03C" letter-spacing="1">OPENSTREETMAP DATA</text>
      </g>
      ${safeTag ? `
      <g transform="translate(80, 160)">
        <rect width="${Math.min(safeTag.length * 12 + 24, 400)}" height="32" rx="16" fill="rgba(200, 240, 60, 0.12)" stroke="rgba(200, 240, 60, 0.3)"/>
        <text x="16" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#C8F03C">${safeTag}</text>
      </g>
      ` : ''}
      <text x="80" y="${safeTag ? 260 : 220}" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="800" fill="#FFFFFF" letter-spacing="-1">
        ${safeTitle}
      </text>
      <text x="80" y="${safeTag ? 315 : 275}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#A1A1AA">
        ${safeSubtitle}
      </text>
      ${detailElements}
      <line x1="80" y1="560" x2="1120" y2="560" stroke="#27272A" stroke-width="1"/>
      <text x="80" y="595" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#71717A">
        tastematch.pages.dev · Verified restaurant discovery without sponsored rankings
      </text>
      <text x="1120" y="595" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#C8F03C" text-anchor="end">
        WhatsApp Links · Offline Ready
      </text>
    </svg>
  `;
}

async function renderPngFromSvg(svg) {
  try {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    return resvg.render().asPng();
  } catch (err) {
    console.warn('Failed to render PNG via resvg:', err.message);
    return null;
  }
}

async function prerender() {
  console.log('--- TasteMatch Build-Time Prerendering & Open Graph Generation ---');
  if (!fs.existsSync(distDir)) {
    console.error('dist/ directory not found. Please run vite build first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  const restaurants = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
  console.log(`Loaded ${restaurants.length} Nigeria places from ${dataFilePath}`);

  // Create og directories
  const ogDir = path.join(distDir, 'og');
  const ogPlacesDir = path.join(ogDir, 'places');
  const ogCitiesDir = path.join(ogDir, 'cities');
  const ogCuisinesDir = path.join(ogDir, 'cuisines');
  fs.mkdirSync(ogPlacesDir, { recursive: true });
  fs.mkdirSync(ogCitiesDir, { recursive: true });
  fs.mkdirSync(ogCuisinesDir, { recursive: true });

  const urlsForSitemap = [];
  const bannedKeywords = [/\bbest\b/i, /\btop-rated\b/i, /\bmost popular\b/i];

  function verifyNoForbiddenCopy(str, context) {
    for (const pattern of bannedKeywords) {
      if (pattern.test(str)) {
        throw new Error(`Forbidden marketing copy detected in ${context}: "${str.match(pattern)[0]}"`);
      }
    }
  }

  // 1. Home Page OG Image & Pre-render
  console.log('Generating Home page OG assets...');
  const homeOgSvg = generateOgSvg({
    title: 'TasteMatch Nigeria & Worldwide',
    subtitle: '1,263 verified restaurant listings across 58 cities in Nigeria',
    tag: 'OPEN RESTAURANT DIRECTORY',
    details: [
      { label: 'Coverage', value: '58 Cities in Nigeria' },
      { label: 'Verified Listings', value: '1,263 Places' },
      { label: 'Data Source', value: 'OpenStreetMap' }
    ]
  });
  const homeOgPng = await renderPngFromSvg(homeOgSvg);
  if (homeOgPng) {
    fs.writeFileSync(path.join(distDir, 'og-default.png'), homeOgPng);
    fs.writeFileSync(path.join(rootDir, 'public/og-default.png'), homeOgPng);
  }
  urlsForSitemap.push({ loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' });

  // 2. City Pages (Cities with >= 25 places)
  const cityCounts = {};
  for (const r of restaurants) {
    cityCounts[r.city] = (cityCounts[r.city] || 0) + 1;
  }
  const bigCities = Object.entries(cityCounts)
    .filter(([_, count]) => count >= 25)
    .sort((a, b) => b[1] - a[1]);

  console.log(`Generating ${bigCities.length} City pages (>= 25 places)...`);
  for (const [cityName, count] of bigCities) {
    const citySlug = slugify(cityName);
    const cityCanonical = `${BASE_URL}/ng/${citySlug}`;
    const cityTitle = `Restaurants in ${cityName}, Nigeria: ${count} Listings from OpenStreetMap | TasteMatch`;
    const cityDesc = `Browse ${count} verified restaurant listings in ${cityName}, Nigeria with opening hours, phone numbers, and coordinates from OpenStreetMap.`;
    
    verifyNoForbiddenCopy(cityTitle, `City Title (${cityName})`);
    verifyNoForbiddenCopy(cityDesc, `City Desc (${cityName})`);

    const cityOgSvg = generateOgSvg({
      title: `${cityName} Restaurant Directory`,
      subtitle: `${count} verified listings from OpenStreetMap · Nigeria`,
      tag: 'CITY COVERAGE',
      details: [
        { label: 'City', value: cityName },
        { label: 'Listings', value: `${count} Places` },
        { label: 'Data Source', value: 'OpenStreetMap' }
      ]
    });
    fs.writeFileSync(path.join(ogCitiesDir, `${citySlug}.svg`), cityOgSvg);
    const cityOgPng = await renderPngFromSvg(cityOgSvg);
    if (cityOgPng) {
      fs.writeFileSync(path.join(ogCitiesDir, `${citySlug}.png`), cityOgPng);
    }

    const cityOgImageUrl = `${BASE_URL}/og/cities/${citySlug}.png`;
    const cityJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: cityTitle,
      description: cityDesc,
      url: cityCanonical,
    };

    let cityHtml = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(cityTitle)}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeHtml(cityDesc)}" />`)
      .replace(/<link rel="canonical".*?>/g, '')
      .replace(/<\/head>/, `  <link rel="canonical" href="${cityCanonical}" />\n  <meta property="og:title" content="${escapeHtml(cityTitle)}" />\n  <meta property="og:description" content="${escapeHtml(cityDesc)}" />\n  <meta property="og:url" content="${cityCanonical}" />\n  <meta property="og:image" content="${cityOgImageUrl}" />\n  <meta property="og:type" content="website" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="${escapeHtml(cityTitle)}" />\n  <meta name="twitter:description" content="${escapeHtml(cityDesc)}" />\n  <meta name="twitter:image" content="${cityOgImageUrl}" />\n  <script type="application/ld+json">${JSON.stringify(cityJsonLd)}</script>\n</head>`)
      .replace(/<div id="root"><\/div>/, `<div id="root"><noscript><div style="padding:24px;font-family:sans-serif;"><h1>${escapeHtml(cityTitle)}</h1><p>${escapeHtml(cityDesc)}</p><p>JavaScript is required to use full search and interactive map features.</p></div></noscript></div>`);

    const cityOutDir = path.join(distDir, 'ng', citySlug);
    fs.mkdirSync(cityOutDir, { recursive: true });
    fs.writeFileSync(path.join(cityOutDir, 'index.html'), cityHtml);

    urlsForSitemap.push({ loc: cityCanonical, priority: '0.8', changefreq: 'weekly' });
  }

  // 3. City + Cuisine Pages (>= 3 places matching cuisine TAG)
  const cityCuisineMap = {};
  for (const r of restaurants) {
    if (cityCounts[r.city] >= 25 && r.cuisines) {
      const list = r.cuisines
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s.toLowerCase() !== 'unspecified' && s.toLowerCase() !== 'other');
      for (const c of list) {
        const key = `${r.city}:::${c}`;
        cityCuisineMap[key] = (cityCuisineMap[key] || 0) + 1;
      }
    }
  }

  const bigCityCuisines = Object.entries(cityCuisineMap)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  console.log(`Generating ${bigCityCuisines.length} City + Cuisine pages (>= 3 tagged places)...`);
  for (const [key, count] of bigCityCuisines) {
    const [cityName, cuisineName] = key.split(':::');
    const citySlug = slugify(cityName);
    const cuisineSlug = slugify(cuisineName);
    const cuisineCanonical = `${BASE_URL}/ng/${citySlug}/${cuisineSlug}`;
    const cuisineTitle = `${cuisineName} places in ${cityName}: ${count} listings from OpenStreetMap | TasteMatch`;
    const cuisineDesc = `Find ${count} ${cuisineName.toLowerCase()} restaurants and food spots in ${cityName}, Nigeria from OpenStreetMap data.`;

    verifyNoForbiddenCopy(cuisineTitle, `Cuisine Title (${key})`);
    verifyNoForbiddenCopy(cuisineDesc, `Cuisine Desc (${key})`);

    const cuisineOgSvg = generateOgSvg({
      title: `${cuisineName} in ${cityName}`,
      subtitle: `${count} verified food spots · OpenStreetMap Nigeria`,
      tag: 'CUISINE DIRECTORY',
      details: [
        { label: 'City', value: cityName },
        { label: 'Cuisine Tag', value: cuisineName },
        { label: 'Listings', value: `${count} Places` }
      ]
    });
    fs.writeFileSync(path.join(ogCuisinesDir, `${citySlug}-${cuisineSlug}.svg`), cuisineOgSvg);
    const cuisineOgPng = await renderPngFromSvg(cuisineOgSvg);
    if (cuisineOgPng) {
      fs.writeFileSync(path.join(ogCuisinesDir, `${citySlug}-${cuisineSlug}.png`), cuisineOgPng);
    }

    const cuisineOgImageUrl = `${BASE_URL}/og/cuisines/${citySlug}-${cuisineSlug}.png`;
    const cuisineJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: cuisineTitle,
      description: cuisineDesc,
      url: cuisineCanonical,
    };

    let cuisineHtml = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(cuisineTitle)}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeHtml(cuisineDesc)}" />`)
      .replace(/<link rel="canonical".*?>/g, '')
      .replace(/<\/head>/, `  <link rel="canonical" href="${cuisineCanonical}" />\n  <meta property="og:title" content="${escapeHtml(cuisineTitle)}" />\n  <meta property="og:description" content="${escapeHtml(cuisineDesc)}" />\n  <meta property="og:url" content="${cuisineCanonical}" />\n  <meta property="og:image" content="${cuisineOgImageUrl}" />\n  <meta property="og:type" content="website" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="${escapeHtml(cuisineTitle)}" />\n  <meta name="twitter:description" content="${escapeHtml(cuisineDesc)}" />\n  <meta name="twitter:image" content="${cuisineOgImageUrl}" />\n  <script type="application/ld+json">${JSON.stringify(cuisineJsonLd)}</script>\n</head>`)
      .replace(/<div id="root"><\/div>/, `<div id="root"><noscript><div style="padding:24px;font-family:sans-serif;"><h1>${escapeHtml(cuisineTitle)}</h1><p>${escapeHtml(cuisineDesc)}</p></div></noscript></div>`);

    const cuisineOutDir = path.join(distDir, 'ng', citySlug, cuisineSlug);
    fs.mkdirSync(cuisineOutDir, { recursive: true });
    fs.writeFileSync(path.join(cuisineOutDir, 'index.html'), cuisineHtml);

    urlsForSitemap.push({ loc: cuisineCanonical, priority: '0.7', changefreq: 'weekly' });
  }

  // 4. Place Pages (All 1,263 Nigeria places)
  console.log(`Generating ${restaurants.length} Place pages...`);
  let samplePlaceHead = '';

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    const placeSlug = getPlaceSlug(r);
    const citySlug = slugify(r.city);
    const placeCanonical = `${BASE_URL}/place/${placeSlug}`;
    const locationStr = r.locality ? `${r.locality}, ${r.city}` : r.city;
    const placeTitle = `${r.restaurant_name} in ${locationStr}, Nigeria: Listing from OpenStreetMap | TasteMatch`;
    
    const descParts = [`${r.restaurant_name} in ${locationStr}, Nigeria.`];
    if (r.cuisines && r.cuisines.toLowerCase() !== 'unspecified') {
      descParts.push(`Cuisines: ${r.cuisines}.`);
    }
    if (r.address) {
      descParts.push(`Address: ${r.address}.`);
    }
    descParts.push('Verified OpenStreetMap listing.');
    const placeDesc = descParts.join(' ');

    const templateTitle = `in ${locationStr}, Nigeria: Listing from OpenStreetMap | TasteMatch`;
    verifyNoForbiddenCopy(templateTitle, `Place Title Template`);
    const templateDesc = `in ${locationStr}, Nigeria. Verified OpenStreetMap listing.`;
    verifyNoForbiddenCopy(templateDesc, `Place Desc Template`);

    // Place SVG Card (instant vector card for every place)
    const placeOgSvg = generateOgSvg({
      title: r.restaurant_name,
      subtitle: `${locationStr} · Nigeria`,
      tag: 'RESTAURANT LISTING',
      details: [
        { label: 'Cuisines', value: r.cuisines && r.cuisines.toLowerCase() !== 'unspecified' ? r.cuisines : 'Local & African' },
        { label: 'Hours', value: r.opening_hours || 'Not specified on OSM' },
        { label: 'Data Source', value: 'OpenStreetMap' }
      ]
    });
    fs.writeFileSync(path.join(ogPlacesDir, `${placeSlug}.svg`), placeOgSvg);

    // Also render sample PNGs (for first 10 places and fallback to city PNG)
    let placeOgImageUrl = `${BASE_URL}/og/cities/${citySlug}.png`;
    if (i < 10) {
      const placePng = await renderPngFromSvg(placeOgSvg);
      if (placePng) {
        fs.writeFileSync(path.join(ogPlacesDir, `${placeSlug}.png`), placePng);
        placeOgImageUrl = `${BASE_URL}/og/places/${placeSlug}.png`;
      }
    }

    // JSON-LD with strictly REAL fields only
    const restaurantJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: r.restaurant_name,
      url: placeCanonical,
    };
    if (r.locality || r.address || r.city) {
      restaurantJsonLd.address = {
        '@type': 'PostalAddress',
        addressLocality: r.locality || r.city,
        addressRegion: r.city,
        addressCountry: 'NG',
        ...(r.address ? { streetAddress: r.address } : {}),
      };
    }
    if (r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0) {
      restaurantJsonLd.geo = {
        '@type': 'GeoCoordinates',
        latitude: r.latitude,
        longitude: r.longitude,
      };
    }
    if (r.phone) {
      restaurantJsonLd.telephone = r.phone;
    }
    if (r.opening_hours) {
      restaurantJsonLd.openingHours = r.opening_hours;
    }
    if (r.website) {
      restaurantJsonLd.sameAs = r.website;
    }
    if (r.cuisines && r.cuisines.toLowerCase() !== 'unspecified') {
      restaurantJsonLd.servesCuisine = r.cuisines.split(',').map(s => s.trim()).filter(Boolean);
    }

    const headInjections = `  <link rel="canonical" href="${placeCanonical}" />\n  <meta property="og:title" content="${escapeHtml(placeTitle)}" />\n  <meta property="og:description" content="${escapeHtml(placeDesc)}" />\n  <meta property="og:url" content="${placeCanonical}" />\n  <meta property="og:image" content="${placeOgImageUrl}" />\n  <meta property="og:type" content="restaurant" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="${escapeHtml(placeTitle)}" />\n  <meta name="twitter:description" content="${escapeHtml(placeDesc)}" />\n  <meta name="twitter:image" content="${placeOgImageUrl}" />\n  <script type="application/ld+json">${JSON.stringify(restaurantJsonLd)}</script>\n</head>`;

    if (i === 0) {
      samplePlaceHead = headInjections;
    }

    const placeFallbackContent = `
      <noscript>
        <div style="padding:24px;font-family:sans-serif;max-width:640px;margin:0 auto;color:#F4F5F6;background:#0C0D10;">
          <h1>${escapeHtml(r.restaurant_name)}</h1>
          <p><strong>Location:</strong> ${escapeHtml(locationStr)}, Nigeria</p>
          ${r.address ? `<p><strong>Address:</strong> ${escapeHtml(r.address)}</p>` : ''}
          ${r.cuisines ? `<p><strong>Cuisines:</strong> ${escapeHtml(r.cuisines)}</p>` : ''}
          ${r.opening_hours ? `<p><strong>Opening Hours:</strong> ${escapeHtml(r.opening_hours)}</p>` : ''}
          ${r.phone ? `<p><strong>Phone:</strong> ${escapeHtml(r.phone)}</p>` : ''}
          <p><em>Source: OpenStreetMap data. No sponsored rankings.</em></p>
        </div>
      </noscript>
    `;

    let placeHtml = baseHtml
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(placeTitle)}</title>`)
      .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeHtml(placeDesc)}" />`)
      .replace(/<link rel="canonical".*?>/g, '')
      .replace(/<\/head>/, headInjections)
      .replace(/<div id="root"><\/div>/, `<div id="root">${placeFallbackContent}</div>`);

    const placeOutDir = path.join(distDir, 'place', placeSlug);
    fs.mkdirSync(placeOutDir, { recursive: true });
    fs.writeFileSync(path.join(placeOutDir, 'index.html'), placeHtml);

    urlsForSitemap.push({ loc: placeCanonical, priority: '0.6', changefreq: 'monthly' });
  }

  // 5. Generate Sitemap.xml
  console.log(`Generating sitemap.xml with ${urlsForSitemap.length} URLs...`);
  const today = new Date().toISOString().split('T')[0];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsForSitemap.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
  fs.writeFileSync(path.join(rootDir, 'public/sitemap.xml'), sitemapXml);
  const sitemapStat = fs.statSync(path.join(distDir, 'sitemap.xml'));

  // 6. Generate Robots.txt
  console.log('Generating robots.txt...');
  const robotsTxt = `# TasteMatch Robots.txt
User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt);
  fs.writeFileSync(path.join(rootDir, 'public/robots.txt'), robotsTxt);

  console.log('--- Prerender Complete ---');
  console.log(`Total URLs generated: ${urlsForSitemap.length}`);
  console.log(`Sitemap size: ${(sitemapStat.size / 1024).toFixed(1)} KB`);
  console.log('Sample Page Head:\n', samplePlaceHead);

  return {
    pageCount: urlsForSitemap.length,
    sitemapSizeKB: (sitemapStat.size / 1024).toFixed(1),
    samplePlaceHead,
  };
}

prerender().catch(err => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
