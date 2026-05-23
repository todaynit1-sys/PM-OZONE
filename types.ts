
export type PollutantType = 'PM2.5' | 'O3';

export interface ParsingRules {
  description: string;
  station_name_row_index: number;
  summary_rows_map: { [key: string]: string };
  data_start_identifier: string;
  value_column_step: number;
  station_name_clean_pattern: string;
}

export interface IndustrialComplex {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

export interface StationCoordinates {
  [stationName: string]: {
    lat: number;
    lon: number;
    address: string;
  };
}

export interface ScoringCriteria {
    U1: { threshold_low: number; threshold_high: number; max_score: number; };
    U2: { threshold_high: number; max_score: number; };
    S1: { threshold_low: number; threshold_high: number; max_score: number; };
    S2: { max_score: number; };
    P1: { threshold_low: number; threshold_high: number; max_score: number; };
    D1: { 
      anomaly_threshold: number; penalty_anomaly: number;
      constant_run_threshold: number; penalty_constant: number;
    };
    D2: {
        max_score: number;
        max_distance_km: number;
    };
}

export interface OzoneCriteria {
    U1: { description: string; multiplier: number; max_score: number };
    U2: { description: string; multiplier: number; max_score: number };
    S: { standard_val: number; multiplier: number; max_score: number };
    P: { threshold: number; multiplier: number; max_score: number };
    D: { base_score: number; penalty_per_km: number; max_dist: number };
}

export interface PdfReportTemplate {
  title: string;
  author: string;
  summary_template: string;
  portfolio_section_title: string;
  integrity_section_title: string;
  item_template: string;
}

export interface AppConfig {
  appName: string;
  version: string;
  parsingRules: ParsingRules;
  industrialComplexes: IndustrialComplex[];
  stationCoordinates: StationCoordinates;
  scoringCriteria: ScoringCriteria;
  ozoneCriteria: OzoneCriteria;
  pdfReportTemplate: PdfReportTemplate;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number | null;
}

export interface StationScores {
  // PM2.5 specific
  u1?: number;
  u2?: number;
  s1?: number;
  s2?: number;
  p1?: number;
  d1?: number;
  d2?: number;
  
  // Ozone specific
  // Reusing u1, u2 for Ozone Urgency 1 & 2
  // Reusing s1 (or s) for Ozone Severity
  
  // Common / Ozone specific fields
  u?: number; // Legacy or sum
  s?: number; // Ozone Severity
  p?: number; // Ozone Persistence
  d?: number; // Ozone Reliability
  
  total: number;
  components: { [key: string]: number | string | null };
}

export interface StationMetrics {
  [key: string]: any;
  full_period_avg?: number;
  full_period_max?: number;
  full_period_min?: number;
  latest_1hr_avg?: number;
  c_2h_ago?: number | null;
  delta_2hr?: number | null;
  max_value_timestamp?: string | null;
  longest_constant_run: number;
  
  // Ozone Specific
  ozone_exceed_count?: number; 
  total_valid_count?: number;
  latest_value?: number;
  prev_1hr_value?: number;
}

export interface StationData {
  id: number;
  name: string;
  fullName: string;
  metrics: StationMetrics;
  timeseries: TimeSeriesData[];
  scores: StationScores | null;
}

export interface AnalyzedComplex {
  complex: IndustrialComplex;
  station: StationData;
  distanceKm: number;
  stationLat?: number;
  stationLon?: number;
  stationAddress?: string;
}

export interface AnalysisResult {
  pollutantType: PollutantType;
  rankedComplexes: AnalyzedComplex[];
  startTimestamp: string;
  endTimestamp: string;
  totalStationsParsed: number;
  totalComplexesAnalyzed: number;
  unmatchedComplexes: string[];
}
