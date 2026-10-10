"""Fetch and simplify official NYC DCP borough boundaries for the web map."""
import json
import urllib.request
from pathlib import Path

SOURCE = "https://data.cityofnewyork.us/resource/gthc-hcne.geojson"
TARGET = Path(__file__).resolve().parents[1] / "apps" / "web" / "public" / "boroughs.geojson"
TOLERANCE = 0.0008


def distance_sq(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    if dx == dy == 0:
        return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
    t = max(0, min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
    return (point[0] - start[0] - t * dx) ** 2 + (point[1] - start[1] - t * dy) ** 2


def simplify(points):
    if len(points) < 8:
        return points
    first, last = points[0], points[-1]
    pivot = max(range(1, len(points) - 1), key=lambda i: distance_sq(points[i], first, last))
    if distance_sq(points[pivot], first, last) <= TOLERANCE * TOLERANCE:
        result = [first, last]
    else:
        result = simplify(points[: pivot + 1])[:-1] + simplify(points[pivot:])
    return result


def simplify_ring(ring):
    if len(ring) < 8:
        return ring
    opened = ring[:-1]
    first = opened[0]
    pivot = max(range(1, len(opened)), key=lambda i: (opened[i][0] - first[0]) ** 2 + (opened[i][1] - first[1]) ** 2)
    result = simplify(opened[: pivot + 1])[:-1] + simplify(opened[pivot:] + [first])
    return result if len(result) >= 4 else ring


with urllib.request.urlopen(SOURCE, timeout=60) as response:
    collection = json.load(response)

features = []
for feature in collection["features"]:
    geometry = feature["geometry"]
    if geometry["type"] != "MultiPolygon":
        raise ValueError("Unexpected geometry type")
    polygons = [[simplify_ring(ring) for ring in polygon] for polygon in geometry["coordinates"]]
    features.append({
        "type": "Feature",
        "geometry": {"type": "MultiPolygon", "coordinates": polygons},
        "properties": {"boroname": feature["properties"]["boroname"]},
    })

TARGET.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
print(f"Wrote {TARGET} with {len(features)} official borough features ({TARGET.stat().st_size:,} bytes)")
