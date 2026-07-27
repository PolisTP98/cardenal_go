import axios from 'axios';

// Bounding box bias for Querétaro / UPQ region
// minLon, minLat, maxLon, maxLat
const QUERETARO_BBOX = '-100.6,20.4,-100.2,20.7';

const geocodeCache = new Map();
const reverseCache = new Map();

/**
 * Searches location suggestions based on text input.
 * Uses Photon API (fast, OSM based) with fallback to OpenStreetMap Nominatim API.
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    // 1. Try Photon API (Fast, built on OSM) biased to Querétaro coords (20.5891, -100.4376)
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&lat=20.5891&lon=-100.4376&limit=6&lang=es`;
    const response = await axios.get(photonUrl, { timeout: 4000 });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const results = response.data.features.map((feat) => {
        const props = feat.properties;
        const coords = feat.geometry.coordinates; // [lon, lat]
        const name = props.name || props.street || cleanQuery;
        const parts = [
          props.name,
          props.street ? (props.housenumber ? `${props.street} ${props.housenumber}` : props.street) : null,
          props.district || props.suburb || props.city || props.county,
          props.state,
        ].filter(Boolean);

        const address = parts.length > 0 ? Array.from(new Set(parts)).join(', ') : name;

        return {
          id: `photon-${props.osm_id || Math.random()}`,
          name: name,
          address: address,
          latitude: coords[1],
          longitude: coords[0],
        };
      });

      geocodeCache.set(cacheKey, results);
      return results;
    }
  } catch (err) {
    console.log('Photon geocode fallback to Nominatim:', err.message);
  }

  try {
    // 2. Fallback: OpenStreetMap Nominatim API with viewbox for Querétaro
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&viewbox=${QUERETARO_BBOX}&bounded=0&limit=6&accept-language=es`;
    const response = await axios.get(nominatimUrl, {
      headers: { 'User-Agent': 'CardenalGoApp/1.0' },
      timeout: 5000,
    });

    if (response.data && Array.isArray(response.data)) {
      const results = response.data.map((item) => ({
        id: `nom-${item.place_id}`,
        name: item.display_name.split(',')[0],
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));

      geocodeCache.set(cacheKey, results);
      return results;
    }
  } catch (err) {
    console.warn('Geocoding error:', err.message);
  }

  return [];
}

/**
 * Reverse geocodes coordinates (latitude, longitude) into a human-readable display address.
 */
export async function reverseGeocode(latitude, longitude) {
  if (!latitude || !longitude) return null;

  const key = `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;
  if (reverseCache.has(key)) {
    return reverseCache.get(key);
  }

  try {
    // 1. Try Photon Reverse API
    const photonUrl = `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&lang=es`;
    const response = await axios.get(photonUrl, { timeout: 4000 });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const props = response.data.features[0].properties;
      const parts = [
        props.name,
        props.street ? (props.housenumber ? `${props.street} ${props.housenumber}` : props.street) : null,
        props.district || props.suburb || props.city,
        props.state,
      ].filter(Boolean);

      const addressStr = parts.length > 0 ? Array.from(new Set(parts)).join(', ') : `Ubicación (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

      reverseCache.set(key, addressStr);
      return addressStr;
    }
  } catch (err) {
    console.log('Photon reverse fallback to Nominatim:', err.message);
  }

  try {
    // 2. Fallback: Nominatim Reverse API
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`;
    const response = await axios.get(nomUrl, {
      headers: { 'User-Agent': 'CardenalGoApp/1.0' },
      timeout: 5000,
    });

    if (response.data && response.data.display_name) {
      const parts = response.data.display_name.split(',');
      const shortAddress = parts.slice(0, 3).join(',').trim();
      reverseCache.set(key, shortAddress);
      return shortAddress;
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err.message);
  }

  const fallbackStr = `Ubicación (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`;
  reverseCache.set(key, fallbackStr);
  return fallbackStr;
}
