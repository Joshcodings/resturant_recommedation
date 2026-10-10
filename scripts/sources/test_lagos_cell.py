import urllib.request
import urllib.parse
import json

query = """
[out:json][timeout:30];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|food_court|ice_cream)$"](6.3, 3.2, 6.7, 3.6);
  nwr["shop"~"^(bakery|butcher|seafood)$"](6.3, 3.2, 6.7, 3.6);
);
out center meta;
"""

req = urllib.request.Request(
    "https://z.overpass-api.de/api/interpreter",
    data=urllib.parse.urlencode({"data": query}).encode("utf-8"),
    headers={"User-Agent": "TasteMatch-CellTest/1.0"}
)
with urllib.request.urlopen(req, timeout=30) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("Lagos 1-deg cell elements returned:", len(res.get("elements", [])))
