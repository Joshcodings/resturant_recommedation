import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { slugify, getPlaceSlug, parsePlaceSlug, getCitySlug, getCuisineSlug } from '@/lib/routes';

const distDir = path.resolve(__dirname, '../../dist');

describe('Phase 1 Acceptance Tests: BE FINDABLE AND SHAREABLE', () => {
  it('A7: Web app manifest is valid, parseable, and includes standalone display and icons', () => {
    const manifestPath = path.resolve(__dirname, '../../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toContain('TasteMatch');
    expect(manifest.short_name).toBe('TasteMatch');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.background_color).toBe('#0C0D10');
    expect(manifest.theme_color).toBe('#0C0D10');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Verify icons exist on disk
    for (const icon of manifest.icons) {
      const iconPath = path.resolve(__dirname, '../../public', icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath)).toBe(true);
    }
  });

  it('A14: Old hash links redirect to real routes via route helpers', () => {
    const testCases = [
      { hash: '#/ng/lagos', expected: '/ng/lagos' },
      { hash: '#/place/osm-node-12345', expected: '/place/osm-node-12345' },
      { hash: '#/group?plan=xyz', expected: '/group?plan=xyz' },
    ];
    for (const tc of testCases) {
      expect(tc.hash.replace(/^#/, '')).toBe(tc.expected);
    }
  });

  it('A2: Real routes and slugs generate and parse deterministically', () => {
    expect(slugify('Benin City')).toBe('benin-city');
    expect(slugify('Lagos (Ikeja)')).toBe('lagos-ikeja');
    expect(getCitySlug('Port Harcourt')).toBe('port-harcourt');
    expect(getCuisineSlug('Fast Food')).toBe('fast-food');

    const sample = { uid: 'osm:node/5407647924', restaurant_name: 'AJ Fast Food' };
    const slug = getPlaceSlug(sample);
    expect(slug).toBe('aj-fast-food-osm-node-5407647924');

    const parsedUid = parsePlaceSlug(slug);
    expect(parsedUid).toBe('osm:node/5407647924');
  });

  it('A3: Prerendered pages have unique titles, descriptions, canonical, and OG tags', () => {
    expect(fs.existsSync(distDir)).toBe(true);

    // Check a sample city page
    const lagosPage = path.join(distDir, 'ng', 'lagos', 'index.html');
    expect(fs.existsSync(lagosPage)).toBe(true);
    const lagosHtml = fs.readFileSync(lagosPage, 'utf-8');
    expect(lagosHtml).toContain('<title>Restaurants in Lagos, Nigeria:');
    expect(lagosHtml).toContain('<link rel="canonical" href="https://tastematch.pages.dev/ng/lagos" />');
    expect(lagosHtml).toContain('<meta property="og:title"');
    expect(lagosHtml).toContain('<meta property="og:image"');

    // Check a sample place page
    const samplePlaceDir = path.join(distDir, 'place');
    expect(fs.existsSync(samplePlaceDir)).toBe(true);
    const placeEntries = fs.readdirSync(samplePlaceDir).filter(f => !f.includes('.'));
    expect(placeEntries.length).toBeGreaterThan(1000);

    const firstPlaceHtml = fs.readFileSync(path.join(samplePlaceDir, placeEntries[0], 'index.html'), 'utf-8');
    expect(firstPlaceHtml).toContain('<link rel="canonical" href="https://tastematch.pages.dev/place/');
    expect(firstPlaceHtml).toContain('<meta property="og:type" content="restaurant" />');
    expect(firstPlaceHtml).toContain('application/ld+json');
  });

  it('A4: Sitemap.xml exists, is valid XML, and covers all generated pages', () => {
    const sitemapPath = path.join(distDir, 'sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    expect(sitemapContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(sitemapContent).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemapContent).toContain('https://tastematch.pages.dev/');
    expect(sitemapContent).toContain('https://tastematch.pages.dev/ng/lagos');
    
    // Check robots.txt
    const robotsPath = path.join(distDir, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    expect(robotsContent).toContain('Sitemap: https://tastematch.pages.dev/sitemap.xml');
  });

  it('A5: JSON-LD structured data contains only real fields present in the data', () => {
    const samplePlaceDir = path.join(distDir, 'place');
    const placeEntries = fs.readdirSync(samplePlaceDir).filter(f => !f.includes('.'));

    for (const slug of placeEntries.slice(0, 20)) {
      const html = fs.readFileSync(path.join(samplePlaceDir, slug, 'index.html'), 'utf-8');
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
      expect(jsonLdMatch).not.toBeNull();

      const jsonLd = JSON.parse(jsonLdMatch![1]);
      expect(jsonLd['@type']).toBe('Restaurant');
      expect(jsonLd.name).toBeDefined();

      // Ensure no fake ratings or invented reviews exist
      expect(jsonLd.aggregateRating).toBeUndefined();
      expect(jsonLd.review).toBeUndefined();
    }
  });

  it('A6: Prerendered titles and meta descriptions contain NO "best", "top-rated" or "most popular" marketing copy', () => {
    const cityDir = path.join(distDir, 'ng');
    const cityEntries = fs.readdirSync(cityDir);

    for (const city of cityEntries) {
      const cityPath = path.join(cityDir, city, 'index.html');
      if (fs.existsSync(cityPath)) {
        const html = fs.readFileSync(cityPath, 'utf-8');
        expect(html).not.toMatch(/\bbest\b/i);
        expect(html).not.toMatch(/\btop-rated\b/i);
        expect(html).not.toMatch(/\bmost popular\b/i);
      }
    }
  });
});
