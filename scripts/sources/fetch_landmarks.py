#!/usr/bin/env python3
"""
scripts/sources/fetch_landmarks.py
==================================
Fetches real named landmarks for major Nigerian cities from OpenStreetMap via Overpass API.
Appends to existing collected landmarks for missing cities.
"""

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROCESSED_DIR = REPO_ROOT / "data" / "processed"
PUBLIC_DATA_DIR = REPO_ROOT / "tastematch" / "public" / "data"

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

CITY_BBOXES = [
    {"city": "Enugu", "bbox": (6.38, 7.45, 6.55, 7.60)},
    {"city": "Ikeja", "bbox": (6.56, 3.30, 6.63, 3.39)},
    {"city": "Kano", "bbox": (11.90, 8.45, 12.10, 8.65)},
    {"city": "Port Harcourt", "bbox": (4.75, 6.90, 4.95, 7.15)},
    {"city": "Warri", "bbox": (5.45, 5.65, 5.60, 5.85)},
    {"city": "Owerri", "bbox": (5.40, 6.95, 5.55, 7.15)},
    {"city": "Calabar", "bbox": (4.90, 8.25, 5.05, 8.45)},
    {"city": "Uyo", "bbox": (4.98, 7.85, 5.12, 8.00)},
]

GENERIC_NAMES = {"church", "mosque", "hotel", "hospital", "market", "school", "station"}

def determine_category(tags):
    if tags.get("aeroway") == "aerodrome":
        return "airport"
    amenity = tags.get("amenity")
    if amenity in ("university", "college"):
        return "university"
    if amenity == "hospital":
        return "hospital"
    if amenity == "marketplace" or tags.get("shop") == "market":
        return "market"
    if tags.get("shop") == "mall":
        return "mall"
    if tags.get("leisure") in ("stadium", "sports_centre"):
        return "stadium"
    if amenity == "bus_station":
        return "bus_park"
    if tags.get("tourism") == "hotel":
        return "hotel"
    if amenity == "place_of_worship":
        return "religious_centre"
    return "landmark"

def main():
    existing_file = PROCESSED_DIR / "landmarks_ng.json"
    all_landmarks = []
    seen_ids = set()

    if existing_file.exists():
        with open(existing_file, "r", encoding="utf-8") as f:
            all_landmarks = json.load(f)
        for lm in all_landmarks:
            seen_ids.add(lm["uid"])
        print(f"Loaded {len(all_landmarks)} existing landmarks.")

    print(f"Fetching remaining {len(CITY_BBOXES)} cities...")

    for idx, c in enumerate(CITY_BBOXES, start=1):
        city = c["city"]
        s, w, n, e = c["bbox"]
        print(f"[{idx}/{len(CITY_BBOXES)}] Fetching for {city}...")

        query = f"""
        [out:json][timeout:25];
        (
          nwr["aeroway"="aerodrome"]["name"]({s}, {w}, {n}, {e});
          nwr["amenity"="university"]["name"]({s}, {w}, {n}, {e});
          nwr["amenity"="college"]["name"]({s}, {w}, {n}, {e});
          nwr["amenity"="hospital"]["name"]({s}, {w}, {n}, {e});
          nwr["amenity"="marketplace"]["name"]({s}, {w}, {n}, {e});
          nwr["shop"="mall"]["name"]({s}, {w}, {n}, {e});
          nwr["leisure"="stadium"]["name"]({s}, {w}, {n}, {e});
          nwr["amenity"="bus_station"]["name"]({s}, {w}, {n}, {e});
          nwr["tourism"="hotel"]["name"]({s}, {w}, {n}, {e});
          nwr["amenity"="place_of_worship"]["name"]({s}, {w}, {n}, {e});
        );
        out center 35;
        """

        data = urllib.parse.urlencode({"data": query}).encode("utf-8")
        req = urllib.request.Request(
            OVERPASS_URL,
            data=data,
            headers={"User-Agent": "TasteMatchApp/1.0 (info@tastematch.org)"}
        )

        city_count = 0
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                elements = res.get("elements", [])
                for el in elements:
                    osm_id = el.get("id")
                    osm_type = el.get("type", "node")
                    uid = f"osm:{osm_type}/{osm_id}"
                    if uid in seen_ids:
                        continue

                    tags = el.get("tags", {})
                    name = tags.get("name")
                    if not name or len(name.strip()) < 4:
                        continue
                    clean_name = name.strip()
                    if clean_name.lower() in GENERIC_NAMES:
                        continue

                    lat_val = el.get("lat") or (el.get("center", {}).get("lat") if "center" in el else None)
                    lon_val = el.get("lon") or (el.get("center", {}).get("lon") if "center" in el else None)
                    if lat_val is None or lon_val is None:
                        continue

                    seen_ids.add(uid)
                    category = determine_category(tags)

                    all_landmarks.append({
                        "uid": uid,
                        "name": clean_name,
                        "category": category,
                        "city": city,
                        "latitude": round(lat_val, 6),
                        "longitude": round(lon_val, 6),
                    })
                    city_count += 1
            print(f"  -> {city}: found {city_count} landmarks")
        except Exception as err:
            print(f"  -> {city} failed: {err}")

        time.sleep(4.0)

    print(f"\nTotal real landmarks collected: {len(all_landmarks)}")

    # Sort deterministically
    all_landmarks.sort(key=lambda x: (x["city"], x["category"], x["name"]))

    counts = {}
    for lm in all_landmarks:
        counts[lm["city"]] = counts.get(lm["city"], 0) + 1
    print("Landmarks per city:", counts)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED_DIR / "landmarks_ng.json", "w", encoding="utf-8") as f:
        json.dump(all_landmarks, f, indent=2, ensure_ascii=False)

    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(PUBLIC_DATA_DIR / "landmarks_ng.json", "w", encoding="utf-8") as f:
        json.dump(all_landmarks, f, indent=2, ensure_ascii=False)

    print("Saved landmarks to data/processed/landmarks_ng.json and tastematch/public/data/landmarks_ng.json")

if __name__ == "__main__":
    main()
