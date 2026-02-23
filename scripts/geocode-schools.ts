import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { geocodeAddress } from '../lib/geocoding';

interface RawSchoolData {
  wojewodztwo: string;
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
  coordinates?: [number, number]; // Will be added by geocoding
}

/**
 * Script to geocode all Wrocław schools and merge coordinates into the data
 * Creates merged-schools-geocoded.json with all data including coordinates
 * Run this once to generate the geocoded file: npm run geocode-schools
 */
async function main() {
  console.log('Loading schools data...');
  const dataPath = join(process.cwd(), 'data', 'output', 'merged-schools.json');
  const fileContent = readFileSync(dataPath, 'utf-8');
  const rawSchools: RawSchoolData[] = JSON.parse(fileContent);

  const schools = rawSchools;

  console.log(`Found ${schools.length} schools in Wrocław`);

  console.log('Starting geocoding (this may take a while due to rate limits)...');
  console.log('Progress will be shown below:');

  // Geocode all schools and add coordinates to the data
  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < schools.length; i++) {
    const school = schools[i];
    
    // Skip if already has coordinates
    if (school.coordinates) {
      geocoded++;
      console.log(`[${i + 1}/${schools.length}] ⊙ ${school.name} - Already has coordinates`);
      continue;
    }
    
    try {
      const coordinates = await geocodeAddress(school.RSPO, school.address, school.city,  school.gmina, school.powiat, school.wojewodztwo, 'Poland');
      school.coordinates = coordinates || undefined;
      
      if (coordinates) {
        geocoded++;
        console.log(`[${i + 1}/${schools.length}] ✓ ${school.name} - ${coordinates}`);
      } else {
        failed++;
        console.log(`[${i + 1}/${schools.length}] ✗ ${school.name} - Failed to geocode`);
      }
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${schools.length}] ✗ Error geocoding ${school.name}:`, error);
      school.coordinates = undefined;
    }
  }

  const allSchoolsWithCoordinates = rawSchools.filter(school => school.coordinates !== undefined);

  // Save merged geocoded file
  const outputPath = join(process.cwd(), 'data', 'output', 'merged-schools-geocoded.json');
  writeFileSync(outputPath, JSON.stringify(allSchoolsWithCoordinates, null, 2), 'utf-8');

  console.log('\n=== Geocoding Complete ===');
  console.log(`Total schools processed: ${schools.length}`);
  console.log(`Successfully geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Geocoded file saved to: ${outputPath}`);
  console.log(`\nNote: The output file contains all schools, with coordinates added for Wrocław schools.`);
}

// Run the script
main().catch(console.error);
