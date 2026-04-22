#!/usr/bin/env python3
"""Scan routes/ directory and generate routes.json with GPX metadata."""

import json
import math
import re
import sys
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

REPO_ROOT = Path(__file__).parent.parent
ROUTES_DIR = REPO_ROOT / "routes"
OUT_FILE = REPO_ROOT / "routes.json"

NS = {"gpx": "http://www.topografix.com/GPX/1/1"}

REGION_MAP = [
    (re.compile(r"allg", re.I), "allgau", "Allgäu"),
    (re.compile(r"toscana|toskana", re.I), "toscana", "Toscana"),
    (re.compile(r"japan", re.I), "japan", "Japan"),
    (re.compile(r"norway", re.I), "norway", "Norway"),


]


def region_from_path(path: Path):
    rel = str(path.relative_to(REPO_ROOT))
    for pattern, rid, label in REGION_MAP:
        if pattern.search(rel):
            return rid, label
    return "other", "Other"


def name_from_filename(stem: str) -> str:
    words = re.sub(r"[-_]+", " ", stem).strip().split()
    result = []
    for w in words:
        if w.isupper() and len(w) > 1:
            result.append(w)
        else:
            result.append(w.capitalize())
    return " ".join(result)


def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371000.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def simplify_pts(pts, target=300):
    """Step-sample trackpoints down to at most `target` points."""
    n = len(pts)
    if n <= target:
        return [[round(p[0], 5), round(p[1], 5)] for p in pts]
    step = n / target
    result = [[round(pts[int(i * step)][0], 5), round(pts[int(i * step)][1], 5)] for i in range(target)]
    result[-1] = [round(pts[-1][0], 5), round(pts[-1][1], 5)]
    return result


def compute_bbox(pts):
    """Return [min_lat, min_lon, max_lat, max_lon]."""
    lats = [p[0] for p in pts]
    lons = [p[1] for p in pts]
    return [round(min(lats), 5), round(min(lons), 5), round(max(lats), 5), round(max(lons), 5)]


def parse_gpx(path: Path):
    try:
        tree = ET.parse(path)
    except ET.ParseError as e:
        print(f"  WARN: could not parse {path.name}: {e}", file=sys.stderr)
        return None, 0.0, 0, []

    root = tree.getroot()

    # Detect namespace
    ns_match = re.match(r"\{(.+?)\}", root.tag)
    ns = {"gpx": ns_match.group(1)} if ns_match else {}
    tag = lambda t: f"{{%s}}%s" % (ns["gpx"], t) if ns else t

    # Track name
    name_el = root.find(f".//{tag('name')}")
    gpx_name = name_el.text.strip() if name_el is not None and name_el.text else None

    # Collect trackpoints
    pts = []
    for trkpt in root.findall(f".//{tag('trkpt')}"):
        try:
            lat = float(trkpt.get("lat"))
            lon = float(trkpt.get("lon"))
        except (TypeError, ValueError):
            continue
        ele_el = trkpt.find(tag("ele"))
        ele = float(ele_el.text) if ele_el is not None and ele_el.text else None
        pts.append((lat, lon, ele))

    if not pts:
        return gpx_name, 0.0, 0, []

    dist = sum(haversine(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1])
               for i in range(len(pts) - 1))

    gain = 0
    for i in range(1, len(pts)):
        if pts[i][2] is not None and pts[i-1][2] is not None:
            d = pts[i][2] - pts[i-1][2]
            if d > 0:
                gain += d

    return gpx_name, dist, int(gain), pts


def url_encode_path(path: Path) -> str:
    rel = path.relative_to(REPO_ROOT)
    parts = []
    for part in rel.parts:
        encoded = ""
        for ch in part:
            if ord(ch) > 127 or ch in " #%?&=+":
                encoded += "".join(f"%{b:02X}" for b in ch.encode("utf-8"))
            else:
                encoded += ch
        parts.append(encoded)
    return "/".join(parts)


def natural_key(path: Path):
    parts = path.parts
    def to_int(s):
        return int(s) if s.isdigit() else s.lower()
    return [to_int(c) for part in parts for c in re.split(r"(\d+)", part)]


def main():
    gpx_files = sorted(ROUTES_DIR.rglob("*.gpx"), key=natural_key)
    if not gpx_files:
        print("No GPX files found under routes/", file=sys.stderr)
        sys.exit(1)

    routes = []
    for gpx_path in gpx_files:
        region_id, region_label = region_from_path(gpx_path)
        _, dist_m, gain_m, pts = parse_gpx(gpx_path)

        display_name = name_from_filename(gpx_path.stem)

        routes.append({
            "path": url_encode_path(gpx_path),
            "name": display_name,
            "region": region_id,
            "region_label": region_label,
            "distance_km": round(dist_m / 1000, 1),
            "elevation_gain_m": gain_m,
            "bbox": compute_bbox(pts) if pts else None,
            "polyline": simplify_pts(pts) if pts else [],
        })

        print(f"  {region_label:10}  {display_name[:40]:40}  {dist_m/1000:.1f} km  {gain_m} hm  {len(pts)} pts → {min(len(pts), 300)}")

    manifest = {
        "generated": date.today().isoformat(),
        "routes": routes,
    }

    OUT_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"\nWrote {len(routes)} routes → {OUT_FILE.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
