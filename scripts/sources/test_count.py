import urllib.request
import urllib.parse
import json

query = """
[out:json][timeout:90];
area["ISO3166-1"="NG"]["admin_level"="2"]->.ng;
(
  nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|food_court|ice_cream)$"](area.ng);
  nwr["shop"~"^(bakery|butcher|seafood)$"](area.ng);
);
out count;
"""

endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

headers = {
    "User-Agent": "TasteMatch-Audit/1.0 (educational research)"
}

for ep in endpoints:
    print(f"Trying {ep}...")
    try:
        data = urllib.parse.urlencode({"data": query}).encode("utf-8")
        req = urllib.request.Request(ep, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=90) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            print("Response:", res)
            break
    except Exception as e:
        print(f"Failed {ep}: {e}")
