import urllib.request
import urllib.parse
import json
import time

subtiles = [
    ("tile_lat_6.0_7.0_lon_4.5_6.5.json", 6.0, 4.5, 7.0, 6.5),
    ("tile_lat_7.0_8.0_lon_4.5_5.5.json", 7.0, 4.5, 8.0, 5.5),
    ("tile_lat_7.0_8.0_lon_5.5_6.5.json", 7.0, 5.5, 8.0, 6.5),
]

mirrors = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

all_sub = []
for fname, s, w, n, e in subtiles:
    query = f"""
    [out:json][timeout:60];
    (
      nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|food_court|ice_cream)$"]({s}, {w}, {n}, {e});
      nwr["shop"~"^(bakery|butcher|seafood)$"]({s}, {w}, {n}, {e});
    );
    out center meta;
    """
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    for m in mirrors:
        try:
            req = urllib.request.Request(m, data=data, headers={"User-Agent": "TasteMatch-Tile8/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                elems = res.get("elements", [])
                print(f"{fname}: {len(elems)} elements from {m.split('/')[2]}")
                all_sub.extend(elems)
                break
        except Exception as err:
            continue
    time.sleep(1)

out_file = "data/raw/osm_tiles/tile_lat_6.0_8.0_lon_4.5_6.5.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump({"elements": all_sub}, f)
print(f"Tile 8 ({len(all_sub)} elements) successfully saved to {out_file}!")
