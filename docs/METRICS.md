# TasteMatch — Launch Metrics & Weekly Review Guide

> **Core Principle**: Real data only. No invented visitor counts, no fake "X people searched this today" badges, no simulated reviews. Unknown is strictly `null`.
> **Privacy Architecture**: 100% cookie-less via GoatCounter. Zero IP storage (daily discarded salt), zero canvas/device fingerprinting, zero personal data, and strictly **zero coordinates** transmitted.

---

## 1. Owner Launch Targets (Inputs to Fill In)

Fill in your specific targets for the launch phase below:

| Metric Target | Target Value (Owner Input) | Baseline / Launch Day | Current Actual |
| :--- | :--- | :--- | :--- |
| **Launch Area** | *[e.g. Ikeja, Lagos]* | Ikeja (85 places, 27.4% completeness) | *[Fill weekly]* |
| **Weekly Active Diners (Pageviews)** | *[e.g. 500 / week]* | 0 | *[Fill weekly]* |
| **Weekly Unique Searches** | *[e.g. 150 / week]* | 0 | *[Fill weekly]* |
| **Weekly Dish Searches** | *[e.g. 100 / week]* | 0 | *[Fill weekly]* |
| **Claimed & Verified Restaurants** | *[e.g. 10 restaurants in Ikeja]* | 0 | *[Fill weekly]* |
| **WhatsApp Order Clicks** | *[e.g. 25 orders / week]* | 0 | *[Fill weekly]* |
| **WhatsApp Recommendation Shares** | *[e.g. 40 shares / week]* | 0 | *[Fill weekly]* |
| **PWA App Installs (Accepted)** | *[e.g. 30 installs / week]* | 0 | *[Fill weekly]* |
| **Community Added Places** | *[e.g. 15 places / week]* | 0 | *[Fill weekly]* |
| **Launch Area Completeness Target** | *[e.g. 50% completeness in Ikeja]* | 27.4% | *[Fill weekly]* |

---

## 2. Event Catalog (Strictly Whitelisted)

TasteMatch tracks **only** the following 11 events. Any attempt to record other events or send coordinates/PII is blocked at runtime by `tastematch/src/lib/analytics.ts`:

| Event Name | Trigger Context | Payload Data Sent | Forbidden / Stripped Data |
| :--- | :--- | :--- | :--- |
| `page_view` | URL route change (`/`, `/ng/:city`, `/place/:slug`) | Clean URL path (`path`), title | No query params containing personal tokens |
| `search` | "Find restaurants" button clicked | City name (`city`), Cuisine category (`cuisine`) | **Zero GPS coordinates**, zero device data |
| `dish_search` | Dish query or quick dish chip clicked | Dish keyword / tag (`cuisineTag`), length | Zero personal queries or credentials |
| `near_me_click` | "Near me" GPS locator clicked | Event trigger only (`type: 'near_me_click'`) | **Zero coordinates sent** (lat/lon resolved in memory only) |
| `place_opened` | Restaurant details drawer opened | Place UID (`placeUid`, e.g. `osm:node/123`) | No diner identity, no user history |
| `whatsapp_share_clicked` | WhatsApp share button or link clicked | Share method (`shareType`, e.g. `NativeSheet`, `WebLink`) | **Zero recipient phone numbers**, zero message bodies |
| `owner_whatsapp_order_clicked` | "Order on WhatsApp" button clicked | Place UID (`placeUid`) | **Zero diner phone numbers**, zero owner phone numbers in event |
| `claim_form_started` | Owner clicks "Claim your restaurant" | Place UID (`placeUid`) | Zero draft form inputs |
| `claim_submitted` | Owner submits verified claim form | Place UID (`placeUid`) | **Zero owner contact info**, zero proof links sent to analytics |
| `add_place_submitted` | Community member submits new food spot | City name (`city`) | **Zero coordinates**, zero contributor phone/email |
| `install_prompt_accepted` | User accepts "Add to Home Screen" | Event trigger only | Zero device serials or browser fingerprints |

---

## 3. Analytics Dashboard Access

TasteMatch uses **GoatCounter** for privacy-first, cookie-less dashboard reporting:

1. **Dashboard URL**: `https://[your-code].goatcounter.com`
2. **Access**: Log in with your GoatCounter owner account.
3. **No Private /stats Page Needed**: Public and internal stats are viewed directly in the GoatCounter UI, ensuring no backend maintenance and zero server costs ($0 budget).
4. **Custom Event Reports**: In GoatCounter, filter by path prefix `event/` to inspect conversion funnels (e.g. `event/claim_form_started` vs. `event/claim_submitted`).

---

## 4. Weekly Review Checklist

Run through this checklist every Monday morning:

- [ ] **Check GoatCounter Dashboard**:
  - Note total pageviews and unique sessions for the past 7 days.
  - Review top search queries and popular dish searches.
- [ ] **Inspect Owner Funnel**:
  - Compare `claim_form_started` vs `claim_submitted`.
  - Review open GitHub issues created from claim forms (`.github/ISSUE_TEMPLATE/claim_restaurant.yml`).
  - Merge verified owner pull requests into `tastematch/src/data/community/owners_ng.json`.
- [ ] **Review WhatsApp Order Impact**:
  - Note count of `owner_whatsapp_order_clicked` events.
  - Follow up with onboarded restaurant owners on WhatsApp to ask about order volume and feedback.
- [ ] **Monitor Launch Area Completeness**:
  - Open TasteMatch `/ng/lagos` (or chosen launch area).
  - Inspect the Launch Area Completeness meter.
  - Check the top 20 gaps worklist and verify if any have been updated on OpenStreetMap or via Community submissions.
- [ ] **Check Dataset Health & CI**:
  - Verify that GitHub Actions CI runs clean on main.
  - Verify monthly data refresh PR runs without regressions.
