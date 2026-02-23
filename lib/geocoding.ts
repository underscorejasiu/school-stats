import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cache file for geocoded coordinates
const GEOCODE_CACHE_FILE = join(process.cwd(), 'data', 'output', 'geocode-cache.json');

interface GeocodeCache {
  [address: string]: [number, number] | null;
}

let geocodeCache: GeocodeCache | null = null;

/**
 * Loads the geocode cache from disk
 */
function loadGeocodeCache(): GeocodeCache {
  if (geocodeCache) {
    return geocodeCache;
  }

  if (existsSync(GEOCODE_CACHE_FILE)) {
    try {
      const content = readFileSync(GEOCODE_CACHE_FILE, 'utf-8');
      geocodeCache = JSON.parse(content);
      return geocodeCache!;
    } catch (error) {
      console.warn('Failed to load geocode cache, starting fresh');
      geocodeCache = {};
      return geocodeCache;
    }
  }

  geocodeCache = {};
  return geocodeCache;
}

/**
 * Saves the geocode cache to disk
 */
function saveGeocodeCache() {
  if (!geocodeCache) return;
  
  try {
    writeFileSync(GEOCODE_CACHE_FILE, JSON.stringify(geocodeCache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save geocode cache:', error);
  }
}

/**
 * Cleans Polish address prefixes that can interfere with geocoding
 * Removes prefixes like: ul., bulw., pl., al., os., skwer, rondo
 */
function cleanPolishAddress(address: string): string {
  if (!address) return address;
  
  // Common Polish address prefixes to remove (case-insensitive)
  const prefixes = [
    /^ul\.\s*/i,           // ul. (ulica = street)
    /^bulw\.\s*/i,        // bulw. (bulwar = boulevard)
    /^pl\.\s*/i,           // pl. (plac = square)
    /^al\.\s*/i,           // al. (aleja = avenue)
    /^os\.\s*/i,           // os. (osiedle = housing estate)
    /^skwer\s+/i,          // skwer (square/green space)
    /^rondo\s+/i,          // rondo (roundabout)
    /^ulica\s+/i,          // ulica (full word)
    /^bulwar\s+/i,         // bulwar (full word)
    /^plac\s+/i,           // plac (full word)
    /^aleja\s+/i,          // aleja (full word)
    /^ks\.\s+Prałata\s+/i, // ks. Prałata (full word)
    /^im\.\s+/i,          // im. (full word)
  ];
  
  let cleaned = address.trim();
  
  // Remove each prefix pattern
  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '');
  }
  
  return cleaned.trim();
}

/**
 * Geocodes an address using OpenStreetMap Nominatim API
 * Uses caching to avoid repeated API calls
 */
export async function geocodeAddress(
  schoolId: string,
  address: string,
  city: string = 'Wrocław',
  gmina: string = 'Wrocław',
  powiat: string = 'Wrocławski',
  county: string = 'Dolnośląskie',
  country: string = 'Poland'
): Promise<[number, number] | null> {
  const cache = loadGeocodeCache();
  const cacheKey = `${schoolId}`.toLowerCase();

  // Check cache first
  if (cacheKey in cache) {
    return cache[cacheKey];
  }

  // Clean the address by removing Polish prefixes
  const cleanedAddress = cleanPolishAddress(address);

  // Build query for Nominatim
  const query = encodeURIComponent(`${cleanedAddress}, ${city}, ${gmina}, ${powiat}, ${county}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;

  try {
    // Add delay to respect rate limits (1 request per second)
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'School-Stats-App/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      console.warn(`Geocoding failed for ${cacheKey}: ${response.statusText}`);
      cache[cacheKey] = null;
      saveGeocodeCache();
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      const coordinates: [number, number] = [
        parseFloat(result.lon),
        parseFloat(result.lat),
      ];
      
      // Cache the result
      cache[cacheKey] = coordinates;
      saveGeocodeCache();
      return coordinates;
    }

    // No results found
    cache[cacheKey] = null;
    saveGeocodeCache();
    return null;
  } catch (error) {
    console.error(`Geocoding error for ${cacheKey}:`, error);
    cache[cacheKey] = null;
    saveGeocodeCache();
    return null;
  }
}

/**
 * Batch geocodes multiple addresses with rate limiting
 * Useful for initial setup
 */
export async function batchGeocode(
  addresses: Array<{ address: string; city: string }>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, [number, number] | null>> {
  const results = new Map<string, [number, number] | null>();
  const total = addresses.length;

  for (let i = 0; i < addresses.length; i++) {
    const { address, city } = addresses[i];
    const coordinates = await geocodeAddress(address, city);
    results.set(`${address}, ${city}`, coordinates);
    
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}
