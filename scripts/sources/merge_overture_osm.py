#!/usr/bin/env python3
"""
scripts/sources/merge_overture_osm.py
=======================================
Implements strict logged deduplication between OpenStreetMap Nigeria places and
Overture Maps Places (CDLA Permissive 2.0).

Rules:
1. Match criteria: same normalised name AND distance <= 50 meters.
2. Keep the richer record: fill missing phone, website, cuisines from Overture without overwriting OSM facts.
3. Keep separate data layer: Overture attributes tagged with source.
4. Log every merge to data/processed/overture_osm_merge_log.json.
5. Report per-city breakdown: how many places, phones, websites, and categories Overture adds.
6. Do NOT present Overture confidence as quality (aggregate_rating remains null unless real).
"""

import json
import math
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
OSM_BASELINE_PATH = REPO_ROOT / "data" / "processed" / "restaurants_ng_osm_baseline.json"
OSM_PATH = OSM_BASELINE_PATH if OSM_BASELINE_PATH.exists() else (REPO_ROOT / "data" / "processed" / "restaurants_ng_full.json")
OVERTURE_PATH = REPO_ROOT / "data" / "raw" / "overture_places_ng.json"
MERGE_LOG_PATH = REPO_ROOT / "data" / "processed" / "overture_osm_merge_log.json"
REPORT_PATH = REPO_ROOT / "data" / "processed" / "overture_summary_report.json"
OUTPUT_PATH = REPO_ROOT / "data" / "processed" / "restaurants_ng_full.json"

DEFAULT_MIN_CONFIDENCE = 0.5
MAX_MATCH_DISTANCE_METERS = 50.0

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def normalize_name(name: str) -> str:
    if not name:
        return ""
    s = name.lower().strip()
    # Remove punctuation
    s = re.sub(r"[^\w\s]", "", s)
    # Remove common corporate/restaurant noise tokens for matching
    noise_tokens = {
        "ltd", "limited", "plc", "ent", "enterprises", "nigeria",
        "restaurant", "eatery", "kitchen", "cafe", "bar", "lounge",
        "fast", "food", "and", "&"
    }
    tokens = [t for t in s.split() if t not in noise_tokens]
    clean = " ".join(tokens)
    return clean or s

def clean_phone(phone_str: str | None) -> str | None:
    if not phone_str:
        return None
    # Strip non-digits except leading +
    s = phone_str.strip()
    digits = re.sub(r"[^\d+]", "", s)
    if digits.startswith("+234") and len(digits) == 14:
        return digits
    if digits.startswith("234") and len(digits) == 13:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+234{digits[1:]}"
    return digits or None

def extract_overture_category(item: dict) -> str | None:
    basic = item.get("basic_category")
    if basic:
        return basic.replace("_", " ").title()
    tax = item.get("taxonomy") or {}
    primary = tax.get("primary")
    if primary:
        return primary.replace("_", " ").title()
    hierarchy = tax.get("hierarchy") or []
    if hierarchy:
        return hierarchy[-1].replace("_", " ").title()
    return None

def main(min_confidence: float = DEFAULT_MIN_CONFIDENCE) -> None:
    print(f"=== TasteMatch Overture & OpenStreetMap Logged Deduplication ===")
    print(f"Confidence threshold: >= {min_confidence}")
    print(f"Max match distance: {MAX_MATCH_DISTANCE_METERS} meters")
    
    if not OSM_PATH.exists():
        print(f"ERROR: {OSM_PATH} not found", file=sys.stderr)
        sys.exit(1)
        
    if not OVERTURE_PATH.exists():
        print(f"ERROR: {OVERTURE_PATH} not found", file=sys.stderr)
        sys.exit(1)
        
    with open(OSM_PATH, "r", encoding="utf-8") as f:
        osm_places = json.load(f)
    print(f"Loaded {len(osm_places)} OSM records from {OSM_PATH.name}")
    
    with open(OVERTURE_PATH, "r", encoding="utf-8") as f:
        overture_raw = json.load(f)
    print(f"Loaded {len(overture_raw)} Overture raw records from {OVERTURE_PATH.name}")
    
    # Filter by confidence
    overture_places = [
        p for p in overture_raw
        if (p.get("confidence") or 0.0) >= min_confidence
    ]
    print(f"Retained {len(overture_places)} Overture records with confidence >= {min_confidence}")
    
    # Pre-index OSM places by approximate spatial grid (0.01 deg ~= 1.1 km)
    spatial_index: dict[tuple[int, int], list[dict]] = defaultdict(list)
    for p in osm_places:
        lat = p.get("latitude")
        lon = p.get("longitude")
        if lat and lon:
            cell = (int(math.floor(lat * 100)), int(math.floor(lon * 100)))
            spatial_index[cell].append(p)
            
    merge_logs = []
    merged_overture_ids = set()
    
    city_stats = defaultdict(lambda: {
        "osm_baseline": 0,
        "overture_new_places": 0,
        "overture_merges": 0,
        "phones_added": 0,
        "websites_added": 0,
        "categories_added": 0,
    })
    
    for p in osm_places:
        city = p.get("city", "Unassigned")
        city_stats[city]["osm_baseline"] += 1
        
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # 1. Attempt Deduplication against OSM records
    for ov in overture_places:
        ov_id = ov.get("id")
        ov_name = (ov.get("names") or {}).get("primary") or ""
        norm_ov_name = normalize_name(ov_name)
        
        bbox = ov.get("bbox") or {}
        ov_lat = (bbox.get("ymin", 0) + bbox.get("ymax", 0)) / 2.0
        ov_lon = (bbox.get("xmin", 0) + bbox.get("xmax", 0)) / 2.0
        
        if not norm_ov_name or not ov_lat or not ov_lon:
            continue
            
        # Check neighboring spatial cells
        cell_lat = int(math.floor(ov_lat * 100))
        cell_lon = int(math.floor(ov_lon * 100))
        
        candidates = []
        for dlat in (-1, 0, 1):
            for dlon in (-1, 0, 1):
                candidates.extend(spatial_index.get((cell_lat + dlat, cell_lon + dlon), []))
                
        best_match = None
        min_dist = float("inf")
        
        for cand in candidates:
            c_lat = cand.get("latitude")
            c_lon = cand.get("longitude")
            if not c_lat or not c_lon:
                continue
                
            dist_m = haversine_meters(ov_lat, ov_lon, c_lat, c_lon)
            if dist_m > MAX_MATCH_DISTANCE_METERS:
                continue
                
            c_name = cand.get("restaurant_name") or cand.get("name") or ""
            norm_c_name = normalize_name(c_name)
            
            # Check name match
            if norm_ov_name == norm_c_name or norm_ov_name in norm_c_name or norm_c_name in norm_ov_name:
                if dist_m < min_dist:
                    min_dist = dist_m
                    best_match = cand
                    
        if best_match:
            # Merged match found! Keep richer record without overwriting OSM facts
            merged_overture_ids.add(ov_id)
            city = best_match.get("city", "Unassigned")
            city_stats[city]["overture_merges"] += 1
            
            fields_enriched = []
            
            # Enrich phone if OSM is missing phone
            ov_phones = ov.get("phones") or []
            if not best_match.get("phone") and ov_phones:
                cleaned = clean_phone(ov_phones[0])
                if cleaned:
                    best_match["phone"] = cleaned
                    fields_enriched.append("phone")
                    city_stats[city]["phones_added"] += 1
                    
            # Enrich website if OSM is missing website
            ov_websites = ov.get("websites") or []
            if not best_match.get("website") and ov_websites:
                best_match["website"] = ov_websites[0]
                fields_enriched.append("website")
                city_stats[city]["websites_added"] += 1
                
            # Enrich category / cuisine if missing
            ov_cat = extract_overture_category(ov)
            if ov_cat:
                c_cuisines = best_match.get("cuisines") or ""
                if not c_cuisines or c_cuisines.lower() == "unknown":
                    best_match["cuisines"] = ov_cat
                    best_match["cuisineList"] = [ov_cat]
                    fields_enriched.append("cuisines")
                    city_stats[city]["categories_added"] += 1
                    
            # Tag provenance in metadata
            best_match.setdefault("data_sources", ["OpenStreetMap"])
            if "Overture Maps" not in best_match["data_sources"]:
                best_match["data_sources"].append("Overture Maps")
                
            best_match["overture_meta"] = {
                "id": ov_id,
                "confidence": round(ov.get("confidence", 0.0), 3),
                "merged_at": timestamp,
            }
            
            merge_logs.append({
                "type": "merge_enrichment",
                "osm_uid": best_match.get("uid"),
                "osm_name": best_match.get("name"),
                "overture_id": ov_id,
                "overture_name": ov_name,
                "distance_meters": round(min_dist, 2),
                "fields_enriched": fields_enriched,
                "timestamp": timestamp,
            })
            
    # 2. Add remaining non-matched Overture records as separate new places
    new_places_added = []
    
    # City bounds matcher for unassigned Overture places
    # Use existing city centroids from OSM to classify city for Overture places
    # Load verified OSM locality nodes from raw cache for locality resolution
    localities_by_city: dict[str, list[dict]] = {}
    for p in RAW_DIR.glob("localities_*.json"):
        city_slug = p.stem.replace("localities_", "").replace("_admin", "").replace("_around", "")
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            elements = data.get("elements", [])
            locs = []
            for el in elements:
                lat = el.get("lat") or (el.get("center") or {}).get("lat")
                lon = el.get("lon") or (el.get("center") or {}).get("lon")
                tags = el.get("tags") or {}
                name = tags.get("name") or tags.get("name:en")
                if lat is not None and lon is not None and name:
                    locs.append({"name": name, "lat": float(lat), "lon": float(lon)})
            if locs:
                localities_by_city[city_slug] = locs
        except Exception:
            pass

    city_centroids = {}
    for city, stats in city_stats.items():
        c_places = [p for p in osm_places if p.get("city") == city and p.get("latitude")]
        if c_places:
            avg_lat = sum(p["latitude"] for p in c_places) / len(c_places)
            avg_lon = sum(p["longitude"] for p in c_places) / len(c_places)
            city_centroids[city] = (avg_lat, avg_lon)
            
    for ov in overture_places:
        ov_id = ov.get("id")
        if ov_id in merged_overture_ids:
            continue
            
        ov_name = (ov.get("names") or {}).get("primary") or ""
        if not ov_name:
            continue
            
        bbox = ov.get("bbox") or {}
        ov_lat = (bbox.get("ymin", 0) + bbox.get("ymax", 0)) / 2.0
        ov_lon = (bbox.get("xmin", 0) + bbox.get("xmax", 0)) / 2.0
        
        # Determine city from address or closest city centroid within 35 km
        addrs = ov.get("addresses") or []
        addr_locality = addrs[0].get("locality") if addrs else None
        addr_region = addrs[0].get("region") if addrs else None
        
        assigned_city = "Lagos"  # default if within Lagos bounds
        closest_city = None
        min_c_dist = float("inf")
        
        for city_name, (clat, clon) in city_centroids.items():
            d = haversine_meters(ov_lat, ov_lon, clat, clon)
            if d < min_c_dist:
                min_c_dist = d
                closest_city = city_name
                
        if closest_city and min_c_dist <= 35000:
            assigned_city = closest_city
        elif addr_locality and addr_locality in city_stats:
            assigned_city = addr_locality
        elif addr_region and addr_region in city_stats:
            assigned_city = addr_region

        # Resolve locality via address or nearest verified OSM locality node within 4 km
        resolved_locality = addr_locality
        if not resolved_locality:
            city_slug = assigned_city.lower().strip()
            cand_locs = localities_by_city.get(city_slug) or []
            if cand_locs:
                best_d = 4000.0  # 4km
                best_loc = None
                for cl in cand_locs:
                    d = haversine_meters(ov_lat, ov_lon, cl["lat"], cl["lon"])
                    if d < best_d:
                        best_d = d
                        best_loc = cl["name"]
                if best_loc:
                    resolved_locality = best_loc
            
        ov_phones = ov.get("phones") or []
        clean_p = clean_phone(ov_phones[0]) if ov_phones else None
        
        ov_websites = ov.get("websites") or []
        web = ov_websites[0] if ov_websites else None
        
        cat = extract_overture_category(ov)
        
        # Create separate place record
        new_record = {
            "uid": f"overture:{ov_id}",
            "restaurant_id": f"ov_{ov_id[:8]}",
            "name": ov_name,
            "restaurant_name": ov_name,
            "country": "Nigeria",
            "country_code": "NG",
            "city": assigned_city,
            "locality": resolved_locality or None,
            "address": addrs[0].get("freeform") or (f"{resolved_locality}, {assigned_city}" if resolved_locality else assigned_city),
            "latitude": round(ov_lat, 6),
            "longitude": round(ov_lon, 6),
            "hasCoords": True,
            "cuisines": cat or "Unknown",
            "cuisineList": [cat] if cat else [],
            "phone": clean_p,
            "website": web,
            "opening_hours": None,  # Real data only: unknown = null
            "aggregate_rating": None,  # Unknown = null. Do not present Overture confidence as quality!
            "rating_text": None,
            "votes": None,
            "price_range": None,
            "data_source": "Overture Maps",
            "data_sources": ["Overture Maps"],
            "licence": "CDLA Permissive 2.0",
            "attribution": "Data © Overture Maps Foundation, licensed under CDLA Permissive 2.0. https://overturemaps.org",
            "overture_confidence": round(ov.get("confidence", 0.0), 3),
        }
        
        new_places_added.append(new_record)
        city_stats[assigned_city]["overture_new_places"] += 1
        if clean_p:
            city_stats[assigned_city]["phones_added"] += 1
        if web:
            city_stats[assigned_city]["websites_added"] += 1
        if cat:
            city_stats[assigned_city]["categories_added"] += 1
            
    # Combine dataset
    combined_places = osm_places + new_places_added
    combined_places.sort(key=lambda x: str(x.get("uid", "")))
    
    print("\n============================================================")
    print("OVERTURE MAPS MERGE & ENRICHMENT REPORT")
    print("============================================================")
    print(f"OSM Baseline Places:            {len(osm_places):>6}")
    print(f"Overture Matched & Enriched:    {len(merged_overture_ids):>6}")
    print(f"Overture New Places Added:      {len(new_places_added):>6}")
    print(f"Total Enriched Nigeria Dataset: {len(combined_places):>6}")
    print("------------------------------------------------------------")
    print(f"{'City':<20} | {'Base':>5} | {'Merges':>6} | {'New':>5} | {'Phones':>6} | {'Web':>5} | {'Cat':>5}")
    print("------------------------------------------------------------")
    
    for city, st in sorted(city_stats.items(), key=lambda x: -x[1]["overture_new_places"] - x[1]["overture_merges"]):
        if st["overture_new_places"] > 0 or st["overture_merges"] > 0:
            print(f"{city:<20} | {st['osm_baseline']:>5} | {st['overture_merges']:>6} | {st['overture_new_places']:>5} | {st['phones_added']:>6} | {st['websites_added']:>5} | {st['categories_added']:>5}")
    print("============================================================\n")
    
    # Save outputs
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(combined_places, f, indent=2, ensure_ascii=False)
    print(f"Saved merged dataset to {OUTPUT_PATH}")
    
    with open(MERGE_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(merge_logs, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(merge_logs)} logged merges to {MERGE_LOG_PATH}")
    
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(dict(city_stats), f, indent=2, ensure_ascii=False)
    print(f"Saved summary report to {REPORT_PATH}")

if __name__ == "__main__":
    main()
