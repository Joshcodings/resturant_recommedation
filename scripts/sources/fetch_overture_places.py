#!/usr/bin/env python3
"""
scripts/sources/fetch_overture_places.py
=========================================
Extracts food and beverage places in Nigeria from Overture Maps Places release (2026-09-23.1).
License: CDLA Permissive 2.0 (Community Data License Agreement - Permissive 2.0)
Attribution: "Data © Overture Maps Foundation, licensed under CDLA Permissive 2.0. https://overturemaps.org"

Filters:
- Bounding Box: Nigeria (lon 2.6 - 14.7, lat 4.0 - 14.0)
- Country: "NG"
- Taxonomy / Category: food_and_drink (restaurant, cafe, bar, fast_food, bakery, pub, lounge, etc.)
- Confidence: >= 0.5 (configurable, default 0.5)

Outputs:
- data/raw/overture_places_ng.json
"""

import json
import os
import sys
import time
from pathlib import Path
import pyarrow.parquet as pq
import pyarrow.fs as pafs

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "data" / "raw"
OUTPUT_FILE = RAW_DIR / "overture_places_ng.json"

DEFAULT_CONFIDENCE_THRESHOLD = 0.5
OVERTURE_RELEASE = "2026-09-23.1"
S3_BASE = f"overturemaps-us-west-2/release/{OVERTURE_RELEASE}/theme=places/type=place"

ATTRIBUTION = "Data © Overture Maps Foundation, licensed under CDLA Permissive 2.0. https://overturemaps.org"
LICENCE = "CDLA Permissive 2.0"

FOOD_CATEGORIES = {
    "restaurant", "cafe", "fast_food", "bar", "pub", "bakery", "food_court",
    "meal_takeaway", "meal_delivery", "ice_cream_shop", "coffee_shop", "diner",
    "bistro", "steakhouse", "pizzeria", "seafood_restaurant", "buffet", "casual_eatery",
    "food_truck", "lounge", "smoothie_juice_bar", "dessert_shop", "shawarma_restaurant",
    "african_restaurant", "bar_and_grill", "grill", "canteen"
}

def is_food_place(basic_category: str | None, taxonomy: dict | None) -> bool:
    if basic_category and basic_category.lower() in FOOD_CATEGORIES:
        return True
    if taxonomy and isinstance(taxonomy, dict):
        primary = (taxonomy.get("primary") or "").lower()
        if primary in FOOD_CATEGORIES:
            return True
        hierarchy = taxonomy.get("hierarchy") or []
        for h in hierarchy:
            if isinstance(h, str) and (h.lower() in FOOD_CATEGORIES or h.lower() == "food_and_drink"):
                return True
    return False

def extract_overture_nigeria(min_confidence: float = DEFAULT_CONFIDENCE_THRESHOLD) -> list[dict]:
    fs = pafs.S3FileSystem(anonymous=True, region="us-west-2")
    files = fs.get_file_info(pafs.FileSelector(S3_BASE, recursive=False))
    
    # Parts 7, 8, 9 contain Nigeria longitude slice [2.6, 14.7]
    names = {f.base_name.split("-")[1]: f.path for f in files}
    target_parts = [p for num, p in names.items() if num in ("00007", "00008", "00009")]
    
    print(f"Scanning {len(target_parts)} partition files for Nigeria (confidence >= {min_confidence})...")
    
    columns = [
        "id", "names", "confidence", "addresses", "phones", "websites",
        "socials", "basic_category", "taxonomy", "bbox"
    ]
    
    ng_places = []
    
    for path in target_parts:
        t0 = time.time()
        base_name = Path(path).name
        print(f"Checking metadata for {base_name[:30]}...")
        pf = pq.ParquetFile(path, filesystem=fs)
        
        # Identify row groups with NG country in statistics
        ng_rgs = []
        for rg_idx in range(pf.num_row_groups):
            rg_meta = pf.metadata.row_group(rg_idx)
            for c in range(rg_meta.num_columns):
                col = rg_meta.column(c)
                if "country" in col.path_in_schema and col.is_stats_set:
                    if col.statistics.min <= "NG" <= col.statistics.max:
                        ng_rgs.append(rg_idx)
                        break
        
        print(f"  Found {len(ng_rgs)} candidate row groups in {base_name[:20]}")
        
        for idx, rg_idx in enumerate(ng_rgs):
            try:
                rg = pf.read_row_group(rg_idx, columns=columns)
                for r in rg.to_pylist():
                    conf = r.get("confidence") or 0.0
                    if conf < min_confidence:
                        continue
                    
                    addrs = r.get("addresses") or []
                    is_ng = any(isinstance(a, dict) and a.get("country") == "NG" for a in addrs)
                    
                    bbox = r.get("bbox") or {}
                    xmin = bbox.get("xmin", -999)
                    ymin = bbox.get("ymin", -999)
                    in_bbox = (2.6 <= xmin <= 14.7) and (4.0 <= ymin <= 14.0)
                    
                    if not (is_ng or in_bbox):
                        continue
                    
                    if not is_food_place(r.get("basic_category"), r.get("taxonomy")):
                        continue
                    
                    ng_places.append(r)
            except Exception as e:
                print(f"    Warning: row group {rg_idx} error: {e}")
                
            if (idx + 1) % 15 == 0 or idx == len(ng_rgs) - 1:
                print(f"    Progress: {idx + 1}/{len(ng_rgs)} RGs processed, total places so far: {len(ng_places)}")
                
        print(f"  Completed {base_name[:20]} in {time.time()-t0:.1f}s")
        
    return ng_places

def main():
    print(f"=== Overture Maps Places Pipeline ===")
    print(f"Attribution: {ATTRIBUTION}")
    print(f"Licence: {LICENCE}")
    print(f"Release: {OVERTURE_RELEASE}")
    print(f"Confidence threshold: {DEFAULT_CONFIDENCE_THRESHOLD}")
    print(f"=====================================")
    
    places = extract_overture_nigeria(DEFAULT_CONFIDENCE_THRESHOLD)
    print(f"\nTotal extracted Nigerian food & drink places: {len(places)}")
    
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(places, f, indent=2, ensure_ascii=False)
    print(f"Successfully saved {len(places)} places to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
