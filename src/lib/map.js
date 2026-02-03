/* functions to fetch activity data */

/* functios to help with heightmap */

export function getCoordsWithEle(geojson) {
  const feature = geojson?.features?.[0];
  const coords = feature?.geometry?.coordinates || [];
  // coords: [[lon, lat, ele], ...]
  return coords.filter(
    (c) => Array.isArray(c) && c.length >= 3 && Number.isFinite(c[2])
  );
}

export function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

export function heightmapFromGeojson(geojson) {
  const coords = getCoordsWithEle(geojson);

  let dist = 0;
  let prev = null;

  const profile = [];

  for (const [lon, lat, ele] of coords) {
    if (prev) {
      dist += calcDistance(prev.lat, prev.lon, lat, lon);
    }

    profile.push({
      d: Math.round(dist), // meters from start
      e: Math.round(ele * 10) / 10, // elevation (keep 0.1m precision)
    });

    prev = { lat, lon };
  }

  return profile;
}
