# TasteMatch

> Data-driven restaurant recommendations powered by the public Zomato dataset.
> Built as a static React + Vite + TypeScript web app — **$0 infrastructure**.

## Quick Start

```bash
cd tastematch
npm install
npm run dev
# → http://localhost:5173/
```

Open `http://localhost:5173/#/styleguide` to preview the design system.

---

## Project Structure

```
tastematch/
├── public/
│   ├── data/restaurants.json   # 7,403 restaurants, 15 countries
│   └── favicon.svg
├── src/
│   ├── config/
│   │   ├── emojis.ts           # Cuisine → emoji map
│   │   └── presets.ts          # Mood preset hard-filter config
│   ├── context/
│   │   └── ThemeContext.tsx    # Dark/light theme (OS-sync + localStorage)
│   ├── lib/
│   │   ├── dataLoader.ts       # Fetch + parse restaurants.json
│   │   ├── formatters.ts       # WCAG contrast utils, formatters
│   │   └── recommendation.ts  # Core recommendation engine (pure)
│   ├── types/
│   │   ├── restaurant.ts
│   │   └── recommendation.ts
│   ├── views/
│   │   └── StyleguideView.tsx  # /styleguide dev route
│   ├── App.tsx                 # HashRouter shell + nav
│   ├── index.css               # Ink & Lime design tokens
│   └── main.tsx
├── vite.config.ts
└── package.json
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (HMR) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Free Deployment

### Vercel (Recommended)

```bash
npm run build
# Then drag the `dist/` folder into vercel.com/new
# OR connect your GitHub repo — Vercel auto-detects Vite
```

No configuration needed. Vercel serves the `dist/` output directory automatically.

### Netlify

1. `npm run build`
2. Drag `dist/` to **netlify.com/drop**
3. Add `public/_redirects` for SPA routing (already included in `public/`):
   ```
   /* /index.html 200
   ```

### GitHub Pages

Set `VITE_BASE` to your repo name before building:

```bash
VITE_BASE=/your-repo-name/ npm run build
```

Then push the `dist/` folder to your `gh-pages` branch, or use this GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd tastematch && npm ci
      - run: cd tastematch && VITE_BASE=/your-repo-name/ npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: tastematch/dist
```

---

## Data Notes

- **Source**: Public Zomato restaurant dataset via Kaggle.
- **Size**: 7,403 rated restaurants across 15 countries.
- **Regional skew**: ~90% of records are from the Delhi NCR region (India).
- **Snapshot**: The dataset has no explicit date but appears several years old. Restaurants may have closed or changed.
- **Excluded**: Restaurants with no ratings or zero votes are not included.
- **Weighted rating**: Bayesian estimate pulling ratings with few votes toward the city average (or country average for cities with <30 rated restaurants).
- **Coordinates**: Restaurants with missing or zero lat/lng coordinates are excluded from the map view.

---

## Design System

**"Ink & Lime"** — dark-first, single lime accent (`#C8F03C`), zero decoration.

- **Fonts**: Space Grotesk (headings/numbers) + Inter (body/UI)
- **Dark default**: `#0C0D10` background, `#F3F2EE` text, no shadows
- **Light mode**: `#F4F3EF` background, `#101216` text, hairline shadows only
- **Accent rule**: Lime is a fill/indicator only — never text on light backgrounds

Visit `/#/styleguide` in the running app to inspect all tokens, contrast ratios (computed live in code), typography, and components.
