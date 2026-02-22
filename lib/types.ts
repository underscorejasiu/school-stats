export type TransportProfile = 'driving-car' | 'foot-walking' | 'cycling-regular';

export type Subject = 'polish' | 'math' | 'english';
export type StatType = 'average_result' | 'median' | 'modal';
export type TimeRange = 'last_year' | 'last_4_years';

export interface YearlySubjectResult {
  candidates_count: number;
  average_result: number;
  standard_deviation: number;
  median: number;
  modal: number;
}

export interface YearlyResult {
  polish?: YearlySubjectResult;
  math?: YearlySubjectResult;
  english?: YearlySubjectResult;
}

export interface YearlyResults {
  [year: string]: YearlyResult;
}

export interface School {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  type?: string;
  public?: string; // "Tak" or "Nie" (Yes/No in Polish)
  yearly_results?: YearlyResults;
}

export interface IsochroneRequest {
  coordinates: [number, number]; // [lng, lat]
  profile: TransportProfile;
  ranges: number[]; // in seconds
}

export interface IsochroneResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
    properties: {
      group_index: number;
      value: number; // time in seconds
      center?: [number, number];
    };
  }>;
}

export interface MapState {
  selectedOrigin: [number, number] | null;
  transportMode: TransportProfile;
  timeRanges: {
    presets: number[]; // in minutes
    custom: number | null; // in minutes
  };
  isochroneData: IsochroneResponse | null;
  isLoading: boolean;
}

export type SortMetric =
  | 'last_year_avg_all'
  | 'last_year_avg_polish'
  | 'last_year_avg_math'
  | 'last_year_avg_english'
  | 'last_year_median_all'
  | 'last_year_median_polish'
  | 'last_year_median_math'
  | 'last_year_median_english'
  | 'last_year_modal_all'
  | 'last_year_modal_polish'
  | 'last_year_modal_math'
  | 'last_year_modal_english'
  | 'last_4_years_avg_avg_all'
  | 'last_4_years_avg_avg_polish'
  | 'last_4_years_avg_avg_math'
  | 'last_4_years_avg_avg_english'
  | 'last_4_years_avg_median_all'
  | 'last_4_years_avg_median_polish'
  | 'last_4_years_avg_median_math'
  | 'last_4_years_avg_median_english';

export interface SchoolWithPosition extends School {
  position: number;
  sortValue: number | null;
}
