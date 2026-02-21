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

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
school-stats/
├── app/
│   ├── api/
│   │   └── isochrones/
│   │       └── route.ts          # API route for OpenRouteService
│   ├── components/
│   │   ├── Map.tsx                # Main map component with Leaflet
│   │   ├── TransportSelector.tsx # Transport mode selector
│   │   └── TimeRangeSelector.tsx  # Time range selector
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Main page component
│   └── globals.css                # Global styles
├── lib/
│   ├── schools.ts                 # School data for Wrocław
│   └── types.ts                   # TypeScript type definitions
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

## Notes

- Leaflet components are dynamically imported to avoid SSR issues
- The map is centered on Wrocław, Poland (51.1079°N, 17.0385°E)
- School data is currently hardcoded in `lib/schools.ts`
- Isochrone polygons are color-coded by time range (green for short times, red for longer times)

## License

This project is open source and available under the MIT License.
