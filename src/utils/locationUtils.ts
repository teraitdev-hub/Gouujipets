/**
 * locationUtils.ts — Production-grade location utilities for GouujiPets
 * Haversine distance, road distance via DistanceMatrix API, sorting, and service radius checks.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface FullLocation extends Coordinates {
  formatted_address: string;
  place_id?: string;
  street?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  accuracy?: number;
  timestamp?: string;
}

export interface RoadDistanceResult {
  distanceText: string;   // e.g. "2.4 km"
  durationText: string;   // e.g. "8 mins"
  distanceValue: number;  // metres
  durationValue: number;  // seconds
}

// In-memory cache: key = "lat1,lng1->lat2,lng2"
const distanceCache = new Map<string, RoadDistanceResult>();

/**
 * Haversine formula — fast straight-line distance in km.
 * Used for initial proximity filtering before expensive API calls.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format straight-line distance for UI display.
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/**
 * Get road distance + ETA via Google Maps DistanceMatrix API.
 * Results are cached in-memory for the session.
 */
export async function getRoadDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<RoadDistanceResult | null> {
  const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
  if (distanceCache.has(cacheKey)) return distanceCache.get(cacheKey)!;

  if (typeof window === 'undefined' || !(window as any).google?.maps) return null;

  try {
    const service = new (window as any).google.maps.DistanceMatrixService();
    const response = await service.getDistanceMatrix({
      origins: [new (window as any).google.maps.LatLng(origin.lat, origin.lng)],
      destinations: [new (window as any).google.maps.LatLng(destination.lat, destination.lng)],
      travelMode: (window as any).google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: 'bestguess',
      },
    });

    const element = response?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') return null;

    const result: RoadDistanceResult = {
      distanceText: element.distance.text,
      durationText: element.duration_in_traffic?.text || element.duration.text,
      distanceValue: element.distance.value,
      durationValue: element.duration_in_traffic?.value || element.duration.value,
    };

    distanceCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('DistanceMatrix error:', err);
    return null;
  }
}

/**
 * Sort facilities by straight-line distance from user location.
 * Uses haversine for speed. Call getRoadDistance separately for display.
 */
export function sortByDistance<T extends { latitude?: number; longitude?: number; lat?: number; lng?: number }>(
  facilities: T[],
  userLoc: Coordinates
): T[] {
  return [...facilities].sort((a, b) => {
    const aLat = a.latitude ?? a.lat ?? 0;
    const aLng = a.longitude ?? a.lng ?? 0;
    const bLat = b.latitude ?? b.lat ?? 0;
    const bLng = b.longitude ?? b.lng ?? 0;
    const distA = haversineDistance(userLoc.lat, userLoc.lng, aLat, aLng);
    const distB = haversineDistance(userLoc.lat, userLoc.lng, bLat, bLng);
    return distA - distB;
  });
}

/**
 * Check if userLoc is within a partner's service radius.
 */
export function isWithinServiceRadius(
  userLoc: Coordinates,
  partnerLat: number,
  partnerLng: number,
  serviceRadiusKm: number
): boolean {
  return haversineDistance(userLoc.lat, userLoc.lng, partnerLat, partnerLng) <= serviceRadiusKm;
}

/**
 * Get straight-line distance string for a facility from user location.
 * Returns null if facility has no coordinates.
 */
export function getDistanceLabel(
  facility: { latitude?: number; longitude?: number; lat?: number; lng?: number },
  userLoc: Coordinates | null
): string | null {
  if (!userLoc) return null;
  const fLat = facility.latitude ?? facility.lat;
  const fLng = facility.longitude ?? facility.lng;
  if (fLat == null || fLng == null) return null;
  const km = haversineDistance(userLoc.lat, userLoc.lng, fLat, fLng);
  return formatDistance(km);
}

/**
 * Reverse geocode a set of coordinates to get formatted address and component details.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<FullLocation | null> {
  if (!window.google || !window.google.maps) {
    console.warn("Google Maps API not loaded for reverse geocoding, falling back to OSM.");
  } else {
  
  const geocoder = new window.google.maps.Geocoder();
  try {
    const response = await geocoder.geocode({ location: { lat, lng } });
    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      
      let city = '';
      let state = '';
      let country = '';
      let postal_code = '';
      let area = '';

      for (const component of result.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('country')) {
          country = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          postal_code = component.long_name;
        }
        if (component.types.includes('sublocality_level_1') || component.types.includes('neighborhood')) {
          area = component.long_name;
        }
      }
      
      return {
        lat,
        lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        city: city || area || state,
        state,
        country,
        postal_code,
        area: area || city,
      };
    }
  } catch (err) {
    console.error("Reverse Geocoding failed with Google, falling back to OSM:", err);
  }

  }
  
  // Fallback to OSM (Nominatim) if Google Maps is unavailable or failed
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      const parts = [
        a.house_number,
        a.road || a.pedestrian,
        a.suburb || a.neighbourhood || a.village,
        a.city || a.town || a.county,
        a.state
      ].filter(Boolean);

      const city = a.city || a.town || a.village || '';
      const state = a.state || '';
      const area = a.suburb || a.neighbourhood || a.county || '';

      return {
        lat,
        lng,
        formatted_address: parts.length > 0 ? parts.join(', ') : data.display_name,
        city: city || area || state,
        state,
        country: a.country || 'India',
        postal_code: a.postcode || '',
        area: area || city,
      };
    }
  } catch (osmErr) {
    console.error("OSM Reverse Geocoding also failed:", osmErr);
  }

  return null;
}
