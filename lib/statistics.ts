import { School, YearlyResults, Subject, StatType, SortMetric } from './types';

// Cache for calculated statistics
const statisticsCache = new Map<string, number | null>();

/**
 * Generate cache key for a statistic
 */
function getCacheKey(schoolId: string, metric: SortMetric): string {
  return `${schoolId}:${metric}`;
}

/**
 * Get all available years from yearly_results, sorted descending
 */
function getAvailableYears(yearlyResults?: YearlyResults): string[] {
  if (!yearlyResults) return [];
  return Object.keys(yearlyResults).sort((a, b) => parseInt(b) - parseInt(a));
}

/**
 * Get the most recent year from yearly_results
 */
function getLatestYear(yearlyResults?: YearlyResults): string | null {
  const years = getAvailableYears(yearlyResults);
  return years.length > 0 ? years[0] : null;
}

/**
 * Get last N years from yearly_results
 */
function getLastNYears(yearlyResults?: YearlyResults, n: number = 4): string[] {
  const years = getAvailableYears(yearlyResults);
  return years.slice(0, n);
}

/**
 * Get value for a specific subject and stat type from a yearly result
 */
function getSubjectStat(
  yearlyResult: any,
  subject: Subject,
  statType: StatType
): number | null {
  const subjectData = yearlyResult?.[subject];
  if (!subjectData) return null;
  return subjectData[statType] ?? null;
}

/**
 * Calculate average across all subjects for a given stat type
 */
function getAverageAcrossSubjects(
  yearlyResult: any,
  statType: StatType
): number | null {
  const subjects: Subject[] = ['polish', 'math', 'english'];
  const values: number[] = [];

  for (const subject of subjects) {
    const value = getSubjectStat(yearlyResult, subject, statType);
    if (value !== null) {
      values.push(value);
    }
  }

  if (values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Get last year statistic (across all subjects or specific subject)
 */
function getLastYearStat(
  school: School,
  statType: StatType,
  subject?: Subject
): number | null {
  if (!school.yearly_results) return null;

  const latestYear = getLatestYear(school.yearly_results);
  if (!latestYear) return null;

  const yearlyResult = school.yearly_results[latestYear];
  if (!yearlyResult) return null;

  if (subject) {
    return getSubjectStat(yearlyResult, subject, statType);
  }
  return getAverageAcrossSubjects(yearlyResult, statType);
}

/**
 * Get last 4 years average of a statistic
 */
function getLast4YearsAverage(
  school: School,
  statType: StatType,
  subject?: Subject
): number | null {
  if (!school.yearly_results) return null;

  const years = getLastNYears(school.yearly_results, 4);
  if (years.length === 0) return null;

  const values: number[] = [];

  for (const year of years) {
    const yearlyResult = school.yearly_results[year];
    if (!yearlyResult) continue;

    let value: number | null;
    if (subject) {
      value = getSubjectStat(yearlyResult, subject, statType);
    } else {
      value = getAverageAcrossSubjects(yearlyResult, statType);
    }

    if (value !== null) {
      values.push(value);
    }
  }

  if (values.length === 0) return null;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate sort value for a school based on the selected metric
 * Uses caching to avoid recalculating
 */
export function getSortValue(school: School, metric: SortMetric): number | null {
  const cacheKey = getCacheKey(school.id, metric);
  
  // Check cache
  if (statisticsCache.has(cacheKey)) {
    return statisticsCache.get(cacheKey)!;
  }

  let value: number | null = null;

  switch (metric) {
    // Last year average
    case 'last_year_avg_all':
      value = getLastYearStat(school, 'average_result');
      break;
    case 'last_year_avg_polish':
      value = getLastYearStat(school, 'average_result', 'polish');
      break;
    case 'last_year_avg_math':
      value = getLastYearStat(school, 'average_result', 'math');
      break;
    case 'last_year_avg_english':
      value = getLastYearStat(school, 'average_result', 'english');
      break;

    // Last year median
    case 'last_year_median_all':
      value = getLastYearStat(school, 'median');
      break;
    case 'last_year_median_polish':
      value = getLastYearStat(school, 'median', 'polish');
      break;
    case 'last_year_median_math':
      value = getLastYearStat(school, 'median', 'math');
      break;
    case 'last_year_median_english':
      value = getLastYearStat(school, 'median', 'english');
      break;

    // Last year modal
    case 'last_year_modal_all':
      value = getLastYearStat(school, 'modal');
      break;
    case 'last_year_modal_polish':
      value = getLastYearStat(school, 'modal', 'polish');
      break;
    case 'last_year_modal_math':
      value = getLastYearStat(school, 'modal', 'math');
      break;
    case 'last_year_modal_english':
      value = getLastYearStat(school, 'modal', 'english');
      break;

    // Last 4 years average of average
    case 'last_4_years_avg_avg_all':
      value = getLast4YearsAverage(school, 'average_result');
      break;
    case 'last_4_years_avg_avg_polish':
      value = getLast4YearsAverage(school, 'average_result', 'polish');
      break;
    case 'last_4_years_avg_avg_math':
      value = getLast4YearsAverage(school, 'average_result', 'math');
      break;
    case 'last_4_years_avg_avg_english':
      value = getLast4YearsAverage(school, 'average_result', 'english');
      break;

    // Last 4 years average of median
    case 'last_4_years_avg_median_all':
      value = getLast4YearsAverage(school, 'median');
      break;
    case 'last_4_years_avg_median_polish':
      value = getLast4YearsAverage(school, 'median', 'polish');
      break;
    case 'last_4_years_avg_median_math':
      value = getLast4YearsAverage(school, 'median', 'math');
      break;
    case 'last_4_years_avg_median_english':
      value = getLast4YearsAverage(school, 'median', 'english');
      break;
  }

  // Cache the result
  statisticsCache.set(cacheKey, value);
  return value;
}

/**
 * Clear statistics cache (useful if school data changes)
 */
export function clearStatisticsCache(): void {
  statisticsCache.clear();
}

/**
 * Get formatted label for a sort metric
 */
export function getSortMetricLabel(metric: SortMetric): string {
  const labels: Record<SortMetric, string> = {
    last_year_avg_all: 'Last year average (all subjects)',
    last_year_avg_polish: 'Last year average - Polish',
    last_year_avg_math: 'Last year average - Math',
    last_year_avg_english: 'Last year average - English',
    last_year_median_all: 'Last year median (all subjects)',
    last_year_median_polish: 'Last year median - Polish',
    last_year_median_math: 'Last year median - Math',
    last_year_median_english: 'Last year median - English',
    last_year_modal_all: 'Last year modal (all subjects)',
    last_year_modal_polish: 'Last year modal - Polish',
    last_year_modal_math: 'Last year modal - Math',
    last_year_modal_english: 'Last year modal - English',
    last_4_years_avg_avg_all: 'Last 4 years avg of avg (all subjects)',
    last_4_years_avg_avg_polish: 'Last 4 years avg of avg - Polish',
    last_4_years_avg_avg_math: 'Last 4 years avg of avg - Math',
    last_4_years_avg_avg_english: 'Last 4 years avg of avg - English',
    last_4_years_avg_median_all: 'Last 4 years avg of median (all subjects)',
    last_4_years_avg_median_polish: 'Last 4 years avg of median - Polish',
    last_4_years_avg_median_math: 'Last 4 years avg of median - Math',
    last_4_years_avg_median_english: 'Last 4 years avg of median - English',
  };
  return labels[metric];
}

/**
 * Get last 4 years average for display in expanded view
 */
export function getLast4YearsAverages(school: School): {
  all: number | null;
  polish: number | null;
  math: number | null;
  english: number | null;
} {
  return {
    all: getLast4YearsAverage(school, 'average_result'),
    polish: getLast4YearsAverage(school, 'average_result', 'polish'),
    math: getLast4YearsAverage(school, 'average_result', 'math'),
    english: getLast4YearsAverage(school, 'average_result', 'english'),
  };
}
