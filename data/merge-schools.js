const fs = require('fs');
const path = require('path');

// Directory containing the JSON files
const dataDir = path.join(__dirname, 'raw');

// Get all JSON files
const files = fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.json'))
    .sort();

// Map to store merged schools by RSPO
const schoolsMap = new Map();

// Subject mapping from original field names to final names
const subjectMapping = {
    'Język polski': 'polish',
    'Matematyka': 'math',
    'Język angielski': 'english'
};

// Helper function to extract year from filename
function extractYear(filename) {
    const match = filename.match(/(\d{4})\.json$/);
    return match ? parseInt(match[1]) : null;
}

// Helper function to parse numeric value (handles empty strings)
function parseNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

// Helper function to rebuild school object with correct field order and renamed fields
function rebuildSchoolWithOrder(school) {
    const ordered = {
        'powiat': school['powiat - nazwa'],
        'gmina': school['Gmina - nazwa'],
        'RSPO': school['RSPO'],
        'type': school['rodzaj placówki'],
        'public': school['czy publiczna'],
        'name': school['Nazwa szkoły'],
        'city': school['Miejscowość'],
        'address': school['Ulica nr']
    };
    
    // Add 'school_id' if it exists (before yearly_results)
    if (school['Identyfikator szkoły']) {
        ordered['school_id'] = school['Identyfikator szkoły'];
    }
    
    // Add yearly_results at the end
    ordered.yearly_results = school.yearly_results;
    
    return ordered;
}

// Helper function to extract exam results from a school record
function extractExamResults(school) {
    const results = {};
    
    // Process each subject
    for (const [originalSubject, normalizedSubject] of Object.entries(subjectMapping)) {
        const subjectResults = {};
        
        const avgValue = `[${originalSubject}] wynik średni (%)`;
        const countField = `[${originalSubject}] liczba zdających`;
        const stdDevField = `[${originalSubject}] odchylenie standardowe (%)`;
        const medianField = `[${originalSubject}] mediana (%)`;
        const modalField = `[${originalSubject}] modalna (%)`;
        
        // Only add subject if there's at least a count
        if (school[countField] !== undefined) {
            subjectResults['candidates_count'] = parseNumber(school[countField]);
            subjectResults['average_result'] = parseNumber(school[avgValue]);
            subjectResults['standard_deviation'] = parseNumber(school[stdDevField]);
            subjectResults['median'] = parseNumber(school[medianField]);
            subjectResults['modal'] = parseNumber(school[modalField]);
            
            results[normalizedSubject] = subjectResults;
        }
    }
    
    return Object.keys(results).length > 0 ? results : null;
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
    const schools = JSON.parse(fileContent);
    
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
                'powiat - nazwa': school['powiat - nazwa'],
                'Gmina - nazwa': school['Gmina - nazwa'],
                'RSPO': rspo,
                'rodzaj placówki': school['rodzaj placówki'],
                'czy publiczna': school['czy publiczna'],
                'Nazwa szkoły': school['Nazwa szkoły'],
                'Miejscowość': school['Miejscowość'],
                'Ulica nr': school['Ulica nr']
            };
            
            // Add 'Identyfikator szkoły' if it exists (before yearly_results)
            if (school['Identyfikator szkoły']) {
                mergedSchool['Identyfikator szkoły'] = school['Identyfikator szkoły'];
            }
            
            // Add yearly_results at the end
            mergedSchool.yearly_results = {};
            
            schoolsMap.set(rspo, mergedSchool);
        } else {
            // Update 'Identyfikator szkoły' if it exists and wasn't set before
            if (school['Identyfikator szkoły'] && !mergedSchool['Identyfikator szkoły']) {
                mergedSchool['Identyfikator szkoły'] = school['Identyfikator szkoły'];
            }
        }
        
        // Extract and add exam results for this year
        const examResults = extractExamResults(school, year);
        if (examResults) {
            mergedSchool.yearly_results[year] = examResults;
        }
    }
}

// Convert map to array
let mergedSchools = Array.from(schoolsMap.values());

// Rename all fields in the final output
mergedSchools = mergedSchools.map(school => {
    return rebuildSchoolWithOrder(school);
});

// Sort by RSPO for consistency
mergedSchools.sort((a, b) => a.RSPO.localeCompare(b.RSPO));

// Write output
const outputPath = path.join(__dirname, './output/merged-schools.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedSchools, null, 2), 'utf8');

console.log(`\nMerged ${mergedSchools.length} unique schools`);
console.log(`Output written to: ${outputPath}`);

// Print some statistics
const yearsWithData = new Set();
mergedSchools.forEach(school => {
    Object.keys(school.yearly_results).forEach(year => yearsWithData.add(year));
});

console.log(`Years with data: ${Array.from(yearsWithData).sort().join(', ')}`);
