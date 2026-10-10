import urllib.request
import urllib.parse
import json

quads = [
    ("SW", (4.2, 2.6, 9.0, 8.0)),
    ("SE", (4.2, 8.0, 9.0, 14.7)),
    ("NW", (9.0, 2.6, 14.0, 8.0)),
    ("NE", (9.0, 8.0, 14.0, 14.7)),
]

for name, (s, w, n, e) in quads:
    query = f"""
    [out:json][timeout:60];
    (
      nwr["amenity"~"^(restaurant|fast_food|cafe|bar|pub|food_court|ice_cream)$"]({s}, {w}, {n}, {e});
      nwr["shop"~"^(bakery|butcher|seafood)$"]({s}, {w}, {n}, {e});
    );
    out count;
    """
    req = urllib.request.Request(
        "https://z.overpass-api.de/api/interpreter",
        data=urllib.parse.urlencode({"data": query}).encode("utf-8"),
        headers={"User-Agent": "TasteMatch-BBoxTest/1.0"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"Quadrant {name} count:", res["elements"][0]["tags"])
