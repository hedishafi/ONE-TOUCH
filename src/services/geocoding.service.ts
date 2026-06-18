/**
 * Geocoding Service
 * Converts addresses to coordinates using Nominatim (OpenStreetMap)
 * Includes fallback and error handling
 */

export interface GeocodingResult {
  lat: number;
  lon: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    country?: string;
  };
  boundingbox: [string, string, string, string];
}

export interface ReverseGeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_BASE_URL = 'https://photon.komoot.io';

// Rate limiting: Nominatim requires 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

/**
 * Forward geocoding: Address → Coordinates
 * Uses Nominatim with Photon fallback
 */
export async function geocodeAddress(address: string, countryCode = 'ET'): Promise<GeocodingResult | null> {
  try {
    // Try Nominatim first
    await waitForRateLimit();
    
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '1',
      countrycodes: countryCode.toLowerCase(),
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': 'OneTouch-HomeServices/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Nominatim request failed');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name,
        address: data[0].address || {},
        boundingbox: data[0].boundingbox,
      };
    }

    // Fallback to Photon if Nominatim returns no results
    return await geocodeWithPhoton(address);
  } catch (error) {
    console.error('Geocoding error:', error);
    
    // Try Photon as fallback
    try {
      return await geocodeWithPhoton(address);
    } catch (fallbackError) {
      console.error('Photon fallback failed:', fallbackError);
      return null;
    }
  }
}

/**
 * Photon geocoding fallback
 */
async function geocodeWithPhoton(address: string): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    q: address,
    limit: '1',
  });

  const response = await fetch(`${PHOTON_BASE_URL}/api/?${params}`);
  
  if (!response.ok) {
    throw new Error('Photon request failed');
  }

  const data = await response.json();
  
  if (data.features && data.features.length > 0) {
    const feature = data.features[0];
    return {
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      display_name: feature.properties.name || '',
      address: {
        house_number: feature.properties.housenumber,
        road: feature.properties.street,
        city: feature.properties.city,
        country: feature.properties.country,
      },
      boundingbox: ['0', '0', '0', '0'], // Photon doesn't provide bounding box
    };
  }

  return null;
}

/**
 * Reverse geocoding: Coordinates → Address
 */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodingResult | null> {
  try {
    await waitForRateLimit();
    
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        'User-Agent': 'OneTouch-HomeServices/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    
    if (data && data.lat) {
      return {
        lat: data.lat,
        lon: data.lon,
        display_name: data.display_name,
        address: data.address || {},
      };
    }

    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Validate if coordinates are within expected bounds (Ethiopia)
 */
export function validateCoordinates(lat: number, lon: number, country = 'ET'): boolean {
  // Ethiopia bounds: lat 3-15, lon 33-48
  if (country === 'ET') {
    return lat >= 3 && lat <= 15 && lon >= 33 && lon <= 48;
  }
  
  // General validation
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Format address for display
 */
export function formatAddress(result: GeocodingResult | ReverseGeocodingResult): string {
  const parts: string[] = [];
  
  if (result.address.house_number) parts.push(result.address.house_number);
  if (result.address.road) parts.push(result.address.road);
  if (result.address.suburb) parts.push(result.address.suburb);
  if (result.address.city) parts.push(result.address.city);
  
  return parts.join(', ') || result.display_name;
}
