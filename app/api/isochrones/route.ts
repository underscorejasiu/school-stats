import { NextRequest, NextResponse } from 'next/server';
import { IsochroneRequest, IsochroneResponse } from '@/lib/types';

const ORS_API_URL = 'https://api.openrouteservice.org/v2/isochrones';

export async function POST(request: NextRequest) {
  try {
    const body: IsochroneRequest = await request.json();
    const { coordinates, profile, ranges, arrival } = body;

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

    // Add arrival time if provided
    if (arrival) {
      requestBody.location_type = 'arrival';
      requestBody.arrival = arrival;
    }

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
