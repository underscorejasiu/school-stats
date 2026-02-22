import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { geocodeAddress } from '../lib/geocoding';

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

  // Filter for Wrocław schools
  const wroclawSchools = rawSchools.filter(
    school =>
      school.powiat === 'Wrocław' ||
      school.city === 'Wrocław' ||
      school.gmina === 'Wrocław'
  );

  console.log(`Found ${wroclawSchools.length} schools in Wrocław`);

  console.log('Starting geocoding (this may take a while due to rate limits)...');
  console.log('Progress will be shown below:');

  // Geocode all schools and add coordinates to the data
  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < wroclawSchools.length; i++) {
    const school = wroclawSchools[i];
    
    // Skip if already has coordinates
    if (school.coordinates) {
      geocoded++;
      console.log(`[${i + 1}/${wroclawSchools.length}] ⊙ ${school.name} - Already has coordinates`);
      continue;
    }
    
    try {
      const coordinates = await geocodeAddress(school.address, school.city, 'Dolnośląskie', 'Poland');
      school.coordinates = coordinates || undefined;
      
      if (coordinates) {
        geocoded++;
        console.log(`[${i + 1}/${wroclawSchools.length}] ✓ ${school.name} - ${coordinates}`);
      } else {
        failed++;
        console.log(`[${i + 1}/${wroclawSchools.length}] ✗ ${school.name} - Failed to geocode`);
      }
    } catch (error) {
      failed++;
      console.error(`[${i + 1}/${wroclawSchools.length}] ✗ Error geocoding ${school.name}:`, error);
      school.coordinates = undefined;
    }
  }

  // Create the geocoded output with all schools (not just Wrocław)
  // But only add coordinates to Wrocław schools
  const allSchools = rawSchools.map(school => {
    const wroclawSchool = wroclawSchools.find(ws => ws.RSPO === school.RSPO);
    if (wroclawSchool && wroclawSchool.coordinates) {
      return {
        ...school,
        coordinates: wroclawSchool.coordinates,
      };
    }
    return school;
  });

  // Save merged geocoded file
  const outputPath = join(process.cwd(), 'data', 'output', 'merged-schools-geocoded.json');
  writeFileSync(outputPath, JSON.stringify(allSchools, null, 2), 'utf-8');

  console.log('\n=== Geocoding Complete ===');
  console.log(`Total schools processed: ${wroclawSchools.length}`);
  console.log(`Successfully geocoded: ${geocoded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Geocoded file saved to: ${outputPath}`);
  console.log(`\nNote: The output file contains all schools, with coordinates added for Wrocław schools.`);
}

// Run the script
main().catch(console.error);
