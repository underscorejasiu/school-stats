import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
type SubjectName = 'polish' | 'math' | 'english';

interface SubjectResults {
    candidates_count: number | null;
    average_result: number | null;
    standard_deviation: number | null;
    median: number | null;
    modal: number | null;
}

type YearlyResults = Record<string, Record<SubjectName, SubjectResults>>;

interface RawSchoolRecord {
    'województwo - nazwa': string;
    'powiat - nazwa': string;
    'Gmina - nazwa': string;
    'RSPO': string;
    'rodzaj placówki': string;
    'czy publiczna': string;
    'Nazwa szkoły': string;
    'Miejscowość': string;
    'Ulica nr': string;
    'Identyfikator szkoły'?: string;
    [key: string]: string | undefined; // For dynamic exam result fields
}

interface MergedSchoolInternal {
    'województwo - nazwa': string;
    'powiat - nazwa': string;
    'Gmina - nazwa': string;
    'RSPO': string;
    'rodzaj placówki': string;
    'czy publiczna': string;
    'Nazwa szkoły': string;
    'Miejscowość': string;
    'Ulica nr': string;
    'Identyfikator szkoły'?: string;
    yearly_results: YearlyResults;
}

interface MergedSchoolOutput {
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
    yearly_results: YearlyResults;
}

// Directory containing the JSON files
const dataDir = path.join(__dirname, '../data/raw');

// Get all JSON files
const files: string[] = fs.readdirSync(dataDir)
    .filter((file: string) => file.endsWith('.json'))
    .sort();

// Map to store merged schools by RSPO
const schoolsMap = new Map<string, MergedSchoolInternal>();

// Subject mapping from original field names to final names
const subjectMapping: Record<string, SubjectName> = {
    'Język polski': 'polish',
    'Matematyka': 'math',
    'Język angielski': 'english'
};

// Helper function to extract year from filename
function extractYear(filename: string): number | null {
    const match = filename.match(/(\d{4})\.json$/);
    return match ? parseInt(match[1], 10) : null;
}

// Helper function to parse numeric value (handles empty strings)
function parseNumber(value: string | undefined | null): number | null {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

// Helper function to rebuild school object with correct field order and renamed fields
function rebuildSchoolWithOrder(school: MergedSchoolInternal): MergedSchoolOutput {
    const ordered: MergedSchoolOutput = {
        wojewodztwo: school['województwo - nazwa'],
        powiat: school['powiat - nazwa'],
        gmina: school['Gmina - nazwa'],
        RSPO: school['RSPO'],
        type: school['rodzaj placówki'],
        public: school['czy publiczna'],
        name: school['Nazwa szkoły'],
        city: school['Miejscowość'],
        address: school['Ulica nr'],
        yearly_results: school.yearly_results
    };
    
    // Add 'school_id' if it exists (before yearly_results)
    if (school['Identyfikator szkoły']) {
        ordered.school_id = school['Identyfikator szkoły'];
    }
    
    return ordered;
}

// Helper function to extract exam results from a school record
function extractExamResults(school: RawSchoolRecord): Record<SubjectName, SubjectResults> | null {
    const results: Partial<Record<SubjectName, SubjectResults>> = {};
    
    // Process each subject
    for (const [originalSubject, normalizedSubject] of Object.entries(subjectMapping)) {
        const avgField1 = `[${originalSubject}] wynik średni (%)`;
        const avgField2 = `[${originalSubject}] wynikśredni (%)`;
        const countField = `[${originalSubject}] liczba zdających`;
        const stdDevField = `[${originalSubject}] odchylenie standardowe (%)`;
        const medianField = `[${originalSubject}] mediana (%)`;
        const modalField = `[${originalSubject}] modalna (%)`;
        
        // Try both field name variations for "wynik średni"
        const avgValue = school[avgField1] !== undefined ? school[avgField1] : school[avgField2];
        
        // Only add subject if there's at least a count
        if (school[countField] !== undefined) {
            const subjectResults: SubjectResults = {
                candidates_count: parseNumber(school[countField]),
                average_result: parseNumber(avgValue),
                standard_deviation: parseNumber(school[stdDevField]),
                median: parseNumber(school[medianField]),
                modal: parseNumber(school[modalField])
            };
            
            results[normalizedSubject] = subjectResults;
        }
    }
    
    return Object.keys(results).length > 0 ? (results as Record<SubjectName, SubjectResults>) : null;
}

// Process each file
for (const file of files) {
    const year = extractYear(file);
    if (!year) {
        console.warn(`Could not extract year from filename: ${file}`);
        continue;
    }
    
    const filePath = path.join(dataDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const schools: RawSchoolRecord[] = JSON.parse(fileContent);
    
    console.log(`Processing ${file} (${schools.length} schools, year ${year})...`);
    
    // Process each school in the file
    for (const school of schools) {
        const rspo = school['RSPO'];
        if (!rspo) {
            console.warn(`School missing RSPO in ${file}:`, school['Nazwa szkoły']);
            continue;
        }
        
        // Get or create school entry
        let mergedSchool = schoolsMap.get(rspo);
        if (!mergedSchool) {
            // Build object with renamed fields
            mergedSchool = {
                'województwo - nazwa': school['województwo - nazwa'],
                'powiat - nazwa': school['powiat - nazwa'],
                'Gmina - nazwa': school['Gmina - nazwa'],
                'RSPO': rspo,
                'rodzaj placówki': school['rodzaj placówki'],
                'czy publiczna': school['czy publiczna'],
                'Nazwa szkoły': school['Nazwa szkoły'],
                'Miejscowość': school['Miejscowość'],
                'Ulica nr': school['Ulica nr'],
                yearly_results: {}
            };
            
            // Add 'Identyfikator szkoły' if it exists (before yearly_results)
            if (school['Identyfikator szkoły']) {
                mergedSchool['Identyfikator szkoły'] = school['Identyfikator szkoły'];
            }
            
            schoolsMap.set(rspo, mergedSchool);
        } else {
            // Update 'Identyfikator szkoły' if it exists and wasn't set before
            if (school['Identyfikator szkoły'] && !mergedSchool['Identyfikator szkoły']) {
                mergedSchool['Identyfikator szkoły'] = school['Identyfikator szkoły'];
            }
        }
        
        // Extract and add exam results for this year
        const examResults = extractExamResults(school);
        if (examResults) {
            mergedSchool.yearly_results[year.toString()] = examResults;
        }
    }
}

// Convert map to array and rename all fields in the final output
const mergedSchools: MergedSchoolOutput[] = Array.from(schoolsMap.values())
    .map((school: MergedSchoolInternal) => rebuildSchoolWithOrder(school));

// Sort by RSPO for consistency
mergedSchools.sort((a: MergedSchoolOutput, b: MergedSchoolOutput) => a.RSPO.localeCompare(b.RSPO));

// Write output
const outputPath = path.join(__dirname, '../data/output/merged-schools.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedSchools, null, 2), 'utf8');

console.log(`\nMerged ${mergedSchools.length} unique schools`);
console.log(`Output written to: ${outputPath}`);

// Print some statistics
const yearsWithData = new Set<string>();
mergedSchools.forEach((school: MergedSchoolOutput) => {
    Object.keys(school.yearly_results).forEach((year: string) => yearsWithData.add(year));
});

console.log(`Years with data: ${Array.from(yearsWithData).sort().join(', ')}`);
