import { School } from './types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Raw school data interface matching the geocoded JSON structure
interface RawSchoolData {
  powiat: string;
  gmina: string;
  RSPO: string;
  type: string;
  public: string;
  name: string;
  city: string;
  address: string;
  school_id?: string;
  yearly_results?: Record<string, any>;
  coordinates?: [number, number]; // [lng, lat] - added by geocoding
}

// Cache for loaded schools data
let cachedSchools: School[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

/**
 * Loads schools from the geocoded JSON file
 */
function loadSchoolsData(): RawSchoolData[] {
  const dataPath = join(process.cwd(), 'data', 'output', 'merged-schools-geocoded.json');
  
  if (!existsSync(dataPath)) {
    console.warn('Geocoded schools file not found. Run "npm run geocode-schools" to generate it.');
    return [];
  }

  const fileContent = readFileSync(dataPath, 'utf-8');
  return JSON.parse(fileContent) as RawSchoolData[];
}

/**
 * Transforms raw school data to School interface
 * Filters for schools in Wrocław that have coordinates
 */
function transformSchoolData(rawSchool: RawSchoolData): School | null {
  // Filter for Wrocław schools
  const isWroclaw = 
    rawSchool.powiat === 'Wrocław' || 
    rawSchool.city === 'Wrocław' ||
    rawSchool.gmina === 'Wrocław';

  if (!isWroclaw) {
    return null;
  }

  // Skip schools without coordinates
  if (!rawSchool.coordinates) {
    return null;
  }

  return {
    id: rawSchool.RSPO,
    name: rawSchool.name,
    coordinates: rawSchool.coordinates,
    address: rawSchool.address ? `${rawSchool.address}, ${rawSchool.city}` : undefined,
    type: rawSchool.type || undefined,
    public: rawSchool.public || undefined,
    yearly_results: rawSchool.yearly_results || undefined,
  };
}

/**
 * Gets all schools from the cached data
 * Uses in-memory cache to avoid reading the file on every request
 * This is synchronous and optimized for performance
 */
export function getSchools(): School[] {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedSchools && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSchools;
  }

  // Load and transform data
  const rawData = loadSchoolsData();
  const transformed = rawData
    .map(transformSchoolData)
    .filter((school): school is School => school !== null);

  // Update cache
  cachedSchools = transformed;
  cacheTimestamp = now;

  return transformed;
}

/**
 * Gets a single school by RSPO ID
 */
export function getSchoolById(rspo: string): School | undefined {
  const schools = getSchools();
  return schools.find(school => school.id === rspo);
}

// Export schools array - computed on first access and cached
export const schools: School[] = getSchools();
