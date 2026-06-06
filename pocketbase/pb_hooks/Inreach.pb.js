/// <reference path="../pb_data/types.d.ts" />

const POLL_INTERVAL_MINUTES = 10;

cronAdd("inreach_poll", `*/${POLL_INTERVAL_MINUTES} * * * *`, function () {
  const MAPSHARE_URL = $os.getenv("INREACH_MAPSHARE_URL");
  const MAPSHARE_PASSWORD = $os.getenv("INREACH_MAPSHARE_PASSWORD");

  if (!MAPSHARE_URL) {
    console.log("[inreach] INREACH_MAPSHARE_URL not set, skipping poll");
    return;
  }

  // ---------------------------------------------------------------------------
  // Base64 encoder (goja has no btoa)
  // ---------------------------------------------------------------------------
  function base64Encode(str) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      result +=
        chars[a >> 2] +
        chars[((a & 3) << 4) | (b >> 4)] +
        (i - 2 < str.length ? chars[((b & 15) << 2) | (c >> 6)] : "=") +
        (i - 1 < str.length ? chars[c & 63] : "=");
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // XML helpers
  // ---------------------------------------------------------------------------
  function getTagContent(str, tag) {
    const open = "<" + tag + ">";
    const close = "</" + tag + ">";
    const start = str.indexOf(open);
    if (start === -1) return "";
    return str.substring(start + open.length, str.indexOf(close, start));
  }

  function getExtendedDataValue(str, name) {
    const search = 'name="' + name + '"';
    const idx = str.indexOf(search);
    if (idx === -1) return "";
    const after = str.substring(idx);
    return getTagContent(after, "value");
  }

  function parseElevation(raw) {
    const match = raw.match(/^[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  // ---------------------------------------------------------------------------
  // Fetch feed
  // ---------------------------------------------------------------------------
  let res;
  try {
    const credentials = base64Encode(":" + MAPSHARE_PASSWORD);
    res = $http.send({
      url: MAPSHARE_URL,
      method: "GET",
      timeout: 30,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; inreach-tracker/1.0)",
        Authorization: "Basic " + credentials,
      },
    });
  } catch (e) {
    console.error("[inreach] HTTP fetch failed:", e);
    return;
  }

  if (res.statusCode !== 200) {
    console.error(
      "[inreach] Unexpected status " + res.statusCode + ": " + res.raw,
    );
    return;
  }

  // ---------------------------------------------------------------------------
  // Parse KML manually
  // ---------------------------------------------------------------------------
  const kml = res.raw;

  if (kml.indexOf("<Placemark") === -1) {
    console.warn("[inreach] Response does not look like KML. First 300 chars:", kml.substring(0, 300));
    return;
  }

  const placemarks = [];
  const placemarkRegex = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g;
  let match;
  while ((match = placemarkRegex.exec(kml)) !== null) {
    if (match[1].indexOf("<Point>") !== -1) {
      placemarks.push(match[1]);
    }
  }

  if (placemarks.length === 0) {
    console.log("[inreach] No point placemarks found in feed");
    return;
  }

  // ---------------------------------------------------------------------------
  // Ingest records
  // ---------------------------------------------------------------------------
  const collection = $app.findCollectionByNameOrId("inreach");

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];

    const externalId = getExtendedDataValue(pm, "Id");

    if (!externalId) {
      console.warn("[inreach] Placemark missing Id, skipping");
      continue;
    }

    // Skip if already stored
    try {
      $app.findFirstRecordByData("inreach", "externalId", externalId);
      skipped++;
      continue;
    } catch (_) {
      // Not found — safe to insert
    }

    // Parse timestamp
    const timestamp = getTagContent(pm, "when");

    // Parse coordinates (lon,lat,alt)
    let coords = null;
    const coordStr = getTagContent(pm, "coordinates");
    if (coordStr) {
      const parts = coordStr.trim().split(",");
      if (parts.length >= 2) {
        coords = {
          lon: parseFloat(parts[0]),
          lat: parseFloat(parts[1]),
        };
      }
    }

    // Parse elevation
    const altitude = parseElevation(getExtendedDataValue(pm, "Elevation"));

    // Build raw snapshot of all ExtendedData fields
    const rawData = {};
    const dataRegex = /name="([^"]+)"[\s\S]*?<value>([\s\S]*?)<\/value>/g;
    let dataMatch;
    while ((dataMatch = dataRegex.exec(pm)) !== null) {
      rawData[dataMatch[1]] = dataMatch[2];
    }

    // Save record
    const record = new Record(collection);
    record.set("externalId", externalId);
    record.set("timestamp", timestamp);
    record.set("altitude", altitude);
    record.set("raw", rawData);

    if (coords) {
      record.set("location", { lon: coords.lon, lat: coords.lat });

      let timezone = "";
      try {
        const tzRes = $http.send({
          url: "https://timeapi.io/api/timezone/coordinate?latitude=" + coords.lat + "&longitude=" + coords.lon,
          method: "GET",
          timeout: 10,
        });
        if (tzRes.statusCode === 200) {
          const tzData = JSON.parse(tzRes.raw);
          timezone = tzData.timeZone || "";
        }
      } catch (e) {
        console.warn("[inreach] Timezone lookup failed:", e);
      }
      record.set("timezone", timezone);
    }

    try {
      $app.save(record);
      inserted++;
    } catch (e) {
      console.error(
        "[inreach] Failed to save record for externalId",
        externalId,
        e,
      );
    }
  }

  console.log(
    "[inreach] Done — inserted: " +
      inserted +
      ", skipped (already stored): " +
      skipped,
  );
});
