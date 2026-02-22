/**
 * Point-in-polygon check using ray casting algorithm
 * Checks if a point [lng, lat] is inside a polygon ring
 */
function pointInPolygon(
  point: [number, number],
  ring: number[][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Checks if a point [lng, lat] is inside any of the isochrone polygons
 * Isochrone polygons are GeoJSON Polygon geometries with coordinates: number[][][]
 * The first ring is the outer boundary
 */
export function isPointInIsochrone(
  point: [number, number],
  isochroneData: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      geometry: {
        type: 'Polygon';
        coordinates: number[][][];
      };
      properties: {
        group_index: number;
        value: number;
        center?: [number, number];
      };
    }>;
  } | null
): boolean {
  if (!isochroneData || !isochroneData.features.length) {
    return false;
  }

  // Check if point is inside any of the isochrone polygons
  for (const feature of isochroneData.features) {
    const coordinates = feature.geometry.coordinates;
    
    // GeoJSON Polygon: first ring is outer boundary, rest are holes
    if (coordinates.length > 0) {
      const outerRing = coordinates[0];
      
      // Check if point is inside the outer ring
      if (pointInPolygon(point, outerRing)) {
        // Check if point is NOT in any hole (if there are holes)
        let inHole = false;
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            inHole = true;
            break;
          }
        }
        
        // Point is inside outer ring and not in any hole
        if (!inHole) {
          return true;
        }
      }
    }
  }

  return false;
}
