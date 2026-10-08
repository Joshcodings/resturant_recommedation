#!/usr/bin/env python3
"""
scripts/validate_datasets.py
============================
Exit-code-1 validator for all TasteMatch datasets.
Asserts:
  - No duplicate restaurant IDs
  - No ID range collision (Zomato < 20,000,000; Nigerian OSM >= 10,000,000,000,000)
  - Every OSM record has null for rating, votes, weighted_rating, price_range, average_cost_for_two
  - Coords within valid bounds (Nigeria: lat 4.0-14.5, lon 2.5-15.0)
  - Required fields present
Prints complete coverage report.
"""

import json
import sys
from pathlib import Path
from collections import Counter

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).parent.parent
ZOMATO_PATH = REPO_ROOT / "tastematch" / "public" / "data" / "restaurants.json"
NG_PATH = REPO_ROOT / "data" / "processed" / "restaurants_ng.json"
MANIFEST_PATH = REPO_ROOT / "data" / "manifest.json"


def main() -> None:
    errors: list[str] = []

    print("=" * 60)
    print("TASTEMATCH DATASET VALIDATOR")
    print("=" * 60)

    # 1. Load Zomato
    zomato_records = []
    if ZOMATO_PATH.exists():
        with open(ZOMATO_PATH, "r", encoding="utf-8") as f:
            zomato_records = json.load(f)
        print(f"Loaded {len(zomato_records)} Zomato records from {ZOMATO_PATH.name}")
    else:
        errors.append(f"Zomato dataset missing: {ZOMATO_PATH}")

    # 2. Load Nigeria OSM
    ng_records = []
    if NG_PATH.exists():
        with open(NG_PATH, "r", encoding="utf-8") as f:
            ng_records = json.load(f)
        print(f"Loaded {len(ng_records)} Nigeria OSM records from {NG_PATH.name}")
    else:
        errors.append(f"Nigeria dataset missing: {NG_PATH}")

    # 3. Load manifest
    manifest_records = []
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest_records = json.load(f)
        print(f"Loaded manifest with {len(manifest_records)} entries")
    else:
        errors.append(f"Manifest missing: {MANIFEST_PATH}")

    # ID Uniqueness & Range Checks
    all_ids = set()
    for r in zomato_records:
        rid = r.get("restaurant_id")
        if rid in all_ids:
            errors.append(f"Duplicate ID in Zomato: {rid}")
        all_ids.add(rid)
        if rid is not None and rid >= 20_000_000:
            errors.append(f"Zomato ID exceeds 20M limit: {rid} ({r.get('restaurant_name')})")

    for r in ng_records:
        rid = r.get("restaurant_id")
        if rid in all_ids:
            errors.append(f"Duplicate or colliding ID in Nigeria: {rid}")
        all_ids.add(rid)
        if rid is not None and rid < 10_000_000_000_000:
            errors.append(f"Nigeria ID below 10T base: {rid} ({r.get('restaurant_name')})")

    # OSM Null Safety & Field Integrity
    osm_required_fields = ["restaurant_id", "restaurant_name", "country", "city", "cuisines"]
    for i, r in enumerate(ng_records):
        name = r.get("restaurant_name", f"Index {i}")

        for field in osm_required_fields:
            if field not in r or r[field] is None:
                errors.append(f"Missing required field '{field}' in OSM record: {name}")

        # OSM records MUST have null ratings, votes, cost, and price
        forbidden_fields = [
            "aggregate_rating",
            "votes",
            "weighted_rating",
            "price_range",
            "average_cost_for_two",
        ]
        for field in forbidden_fields:
            if r.get(field) is not None:
                errors.append(
                    f"OSM record '{name}' has non-null '{field}': {r.get(field)!r} (must be null)"
                )

        # Coordinate checks
        lat = r.get("latitude")
        lon = r.get("longitude")
        if lat is not None and lon is not None:
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                errors.append(f"Coordinates out of world bounds for '{name}': {lat}, {lon}")
            # Nigeria geographical bounds
            if not (4.0 <= lat <= 14.5 and 2.5 <= lon <= 15.0):
                errors.append(f"Coordinates outside Nigeria bounds for '{name}': {lat}, {lon}")

    # Manifest verification
    for entry in manifest_records:
        fn = entry.get("file")
        if fn == "restaurants_ng.json":
            count = entry.get("recordCount")
            if count != len(ng_records):
                errors.append(
                    f"Manifest recordCount mismatch: manifest says {count}, file has {len(ng_records)}"
                )

    # Coverage Report for Nigeria
    print("\n" + "=" * 60)
    print("NIGERIA OVERALL COVERAGE REPORT")
    print("=" * 60)
    n = len(ng_records)
    if n > 0:
        cities = Counter(r.get("city") for r in ng_records)
        place_types = Counter(r.get("place_type") for r in ng_records)
        with_cuisine = sum(1 for r in ng_records if r.get("cuisines") not in ("Unspecified", "Other", None, ""))
        with_locality = sum(1 for r in ng_records if r.get("locality") not in (None, ""))
        with_hours = sum(1 for r in ng_records if r.get("opening_hours") not in (None, ""))
        with_phone = sum(1 for r in ng_records if r.get("phone") not in (None, ""))
        with_web = sum(1 for r in ng_records if r.get("website") not in (None, ""))
        with_booking = sum(1 for r in ng_records if r.get("has_table_booking") is not None)
        with_addr = sum(1 for r in ng_records if r.get("address") not in (None, ""))

        print(f"Total records:        {n}")
        print(f"Cities breakdown:")
        for city, count in cities.most_common():
            print(f"  - {city:16s}: {count:4d} ({count/n*100:.1f}%)")
        print(f"Field coverage:")
        print(f"  - With cuisine:     {with_cuisine:4d} / {n} ({with_cuisine/n*100:.1f}%)")
        print(f"  - With locality:    {with_locality:4d} / {n} ({with_locality/n*100:.1f}%)")
        print(f"  - With hours:       {with_hours:4d} / {n} ({with_hours/n*100:.1f}%)")
        print(f"  - With phone:       {with_phone:4d} / {n} ({with_phone/n*100:.1f}%)")
        print(f"  - With website:     {with_web:4d} / {n} ({with_web/n*100:.1f}%)")
        print(f"  - With booking:     {with_booking:4d} / {n} ({with_booking/n*100:.1f}%)")
        print(f"  - With address:     {with_addr:4d} / {n} ({with_addr/n*100:.1f}%)")
        print(f"Place types:")
        for pt, count in place_types.most_common():
            print(f"  - {pt or 'unspecified':16s}: {count:4d}")
    print("=" * 60)

    if errors:
        print(f"\n❌ VALIDATION FAILED with {len(errors)} error(s):", file=sys.stderr)
        for err in errors[:25]:
            print(f"  - {err}", file=sys.stderr)
        if len(errors) > 25:
            print(f"  ... and {len(errors) - 25} more", file=sys.stderr)
        sys.exit(1)

    print("\n✓ All dataset validations passed successfully (0 errors).")
    sys.exit(0)


if __name__ == "__main__":
    main()
