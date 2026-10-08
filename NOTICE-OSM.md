# OpenStreetMap Attribution

This project incorporates data from [OpenStreetMap](https://www.openstreetmap.org/) to supplement coverage in newly launched regions (e.g., Nigeria).

**License:**  
The data from OpenStreetMap is made available under the [Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/).  
Any rights in individual contents of the database are licensed under the [Database Contents License](https://opendatacommons.org/licenses/dbcl/1-0/).

**© OpenStreetMap contributors.**

## Extracted Data

The following datasets in this repository are derived directly from OpenStreetMap via the Overpass API:
- `data/processed/restaurants_ng.json` (Nigeria records)
- `tastematch/public/data/restaurants_ng.json`
- `tastematch/public/data/manifest.json`
- `data/manifest.json`

## Processing & Use
- The data is retrieved asynchronously offline and is not fetched dynamically by the live application.
- The raw nodes/ways are converted to match the generic `Restaurant` schema, with a `data_source: "OpenStreetMap"` flag appended.
- OpenStreetMap derived records are stored in standalone files, separate from the primary Zomato dataset (`restaurants.json`). They are merged at runtime by the client-side DataLoader.

If you modify or build upon this OpenStreetMap data, you must distribute the result under the same license (ODbL).
