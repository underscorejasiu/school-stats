# School Stats - Isochrone Map

A Next.js application that displays an interactive map with school pins in Wrocław, Poland. Users can select a position on the map and generate isochrone polygons showing areas reachable within specified time ranges using different transport methods.

## Features

- **Interactive Map**: Click anywhere on the map to select an origin point
- **School Pins**: View schools in Wrocław, Poland with location markers
- **Transport Modes**: Switch between driving, walking, and cycling
- **Time Ranges**: Multiple preset options (5, 10, 15, 30, 60 minutes) plus custom time input
- **Isochrone Visualization**: Colored polygons showing reachable areas from the selected origin
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Map Library**: Leaflet with react-leaflet
- **Isochrone API**: OpenRouteService
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20.19.0 or higher (or 22.13.0+ or >=24)
- npm, yarn, pnpm, or bun
- OpenRouteService API key ([Get one here](https://openrouteservice.org/dev/#/signup))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd school-stats
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```bash
OPENROUTESERVICE_API_KEY=your_api_key_here
```

4. Generate geocoded school data (first time setup):
```bash
npm run geocode-schools
```
This will geocode all Wrocław schools from `data/output/merged-schools.json` and merge the coordinates into a new file `merged-schools-geocoded.json`. This may take a while due to API rate limits (approximately 1 request per second).

5. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
school-stats/
├── app/
│   ├── api/
│   │   ├── isochrones/
│   │   │   └── route.ts          # API route for OpenRouteService
│   │   └── schools/
│   │       └── route.ts          # API route for schools data
│   ├── components/
│   │   ├── Map.tsx                # Main map component with Leaflet
│   │   ├── TransportSelector.tsx # Transport mode selector
│   │   └── TimeRangeSelector.tsx  # Time range selector
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main page component
│   └── globals.css                # Global styles
├── data/
│   ├── output/
│   │   ├── merged-schools.json        # Merged school data (source)
│   │   ├── merged-schools-geocoded.json # School data with coordinates (generated)
│   │   └── geocode-cache.json         # Temporary cache during geocoding
│   └── raw/                            # Raw data files
├── lib/
│   ├── schools.ts                 # School data loader with caching
│   ├── geocoding.ts               # Geocoding utilities
│   └── types.ts                   # TypeScript type definitions
├── scripts/
│   └── geocode-schools.ts         # Script to geocode all schools
└── public/                        # Static assets
```

## Usage

1. **Select Origin**: Click anywhere on the map to set the origin point for isochrone calculation
2. **Choose Transport**: Select your preferred transport method (Driving, Walking, or Cycling)
3. **Set Time Ranges**: 
   - Click preset buttons (5, 10, 15, 30, 60 minutes) to add/remove time ranges
   - Enter a custom time in minutes (optional)
4. **View Results**: Colored polygons will appear showing areas reachable within each time range

## API Integration

The application uses the OpenRouteService API for isochrone calculations. The API is called through a Next.js API route (`/api/isochrones`) which:
- Accepts coordinates, transport profile, and time ranges
- Proxies requests to OpenRouteService
- Returns GeoJSON FeatureCollection with polygon geometries

### OpenRouteService API

- **Endpoint**: `https://api.openrouteservice.org/v2/isochrones/{profile}`
- **Free Tier**: Limited requests per day (check [OpenRouteService pricing](https://openrouteservice.org/dev/#/home))
- **Transport Profiles**: 
  - `driving-car` - Car/Driving
  - `foot-walking` - Walking
  - `cycling-regular` - Cycling

## Deployment

### Deploy to Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import your project to Vercel:
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your repository

3. Add environment variable:
   - In project settings, add `OPENROUTESERVICE_API_KEY` with your API key

4. Deploy:
   - Vercel will automatically deploy on every push to main branch

The app will be available at `https://your-project.vercel.app`

## Environment Variables

Create a `.env.local` file (or set in Vercel dashboard):

```
OPENROUTESERVICE_API_KEY=your_api_key_here
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run geocode-schools` - Geocode all schools (generates coordinates cache)
- `npm run merge-schools` - Merge raw school data files

## School Data

The application loads school data from `data/output/merged-schools-geocoded.json`. This file contains:
- School name, address, and location
- Exam results by year
- School type and public/private status
- **Coordinates** (geocoded addresses) - added by the geocoding script

Schools are filtered to only show those in Wrocław that have coordinates. The data is cached in memory for optimal performance (1 hour cache duration).

### Geocoding

Since the source data doesn't include coordinates, schools need to be geocoded first. The `geocode-schools` script:
1. Loads all schools from `data/output/merged-schools.json`
2. Filters for Wrocław schools
3. Geocodes each address using OpenStreetMap Nominatim API
4. Merges coordinates back into the school data
5. Saves everything to `data/output/merged-schools-geocoded.json`
6. Respects rate limits (1 request per second)

The geocoded file contains all schools with coordinates added for Wrocław schools. If new schools are added or addresses change, re-run the geocoding script to update the geocoded file.

## Notes

- Leaflet components are dynamically imported to avoid SSR issues
- The map is centered on Wrocław, Poland (51.1079°N, 17.0385°E)
- School data is currently hardcoded in `lib/schools.ts`
- Isochrone polygons are color-coded by time range (green for short times, red for longer times)

## License

This project is open source and available under the MIT License.
