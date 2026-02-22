import { NextResponse } from 'next/server';
import { getSchools } from '@/lib/schools';

/**
 * API route to get all schools
 * Uses cached data for optimal performance
 */
export async function GET() {
  try {
    const schools = getSchools();
    return NextResponse.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schools', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
