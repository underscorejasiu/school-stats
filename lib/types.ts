export type TransportProfile = 'driving-car' | 'foot-walking' | 'cycling-regular';

export interface School {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  type?: string;
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
