import { NextRequest, NextResponse } from 'next/server';
import { IsochroneRequest, IsochroneResponse } from '@/lib/types';

const ORS_API_URL = 'https://api.openrouteservice.org/v2/isochrones';

export async function POST(request: NextRequest) {
  try {
    const body: IsochroneRequest = await request.json();
    const { coordinates, profile, ranges } = body;

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouteService API key is not configured' },
        { status: 500 }
      );
    }

    // OpenRouteService expects coordinates in [lng, lat] format
    const requestBody: any = {
      locations: [coordinates],
      range: ranges,
      range_type: 'time',
      units: 'm',
    };

    // Note: OpenRouteService isochrones API does not support time-dependent routing
    // The API rejects both 'arrival' and 'departure' location_type values
    // Time-dependent routing is only available for the directions API, not isochrones
    // The arrival time parameter is accepted in our interface but not sent to the API
    // Isochrones will show average travel times, not rush-hour specific times
    // If time-dependent isochrones are needed, consider using the directions API
    // to calculate multiple routes and then generate isochrones from those results

    const response = await fetch(`${ORS_API_URL}/${profile}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouteService API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch isochrones', details: errorText },
        { status: response.status }
      );
    }

    const data: IsochroneResponse = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Isochrone API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
