/**
 * Routing Service
 * Calculates routes using OSRM (OpenStreetMap Routing Machine)
 * Provides ETA, distance, and turn-by-turn directions
 */

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

export interface Route {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // [lat, lon] pairs
  steps: RouteStep[];
}

export interface RoutingResult {
  routes: Route[];
  waypoints: Array<{
    location: [number, number];
    name: string;
  }>;
}

const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Calculate route between two points
 * @param start [lat, lon]
 * @param end [lat, lon]
 * @param profile 'driving' | 'walking' | 'cycling'
 */
export async function calculateRoute(
  start: [number, number],
  end: [number, number],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RoutingResult | null> {
  try {
    // OSRM uses [lon, lat] format
    const startLonLat = `${start[1]},${start[0]}`;
    const endLonLat = `${end[1]},${end[0]}`;
    
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'geojson',
      steps: 'true',
      annotations: 'true',
    });

    const url = `${OSRM_BASE_URL}/route/v1/${profile}/${startLonLat};${endLonLat}?${params}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('OSRM request failed');
    }

    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    // Convert OSRM response to our format
    const routes: Route[] = data.routes.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]), // Convert to [lat, lon]
      steps: route.legs[0]?.steps?.map((step: any) => ({
        instruction: step.maneuver.instruction || getInstructionFromManeuver(step.maneuver),
        distance: step.distance,
        duration: step.duration,
        name: step.name || '',
        maneuver: {
          type: step.maneuver.type,
          modifier: step.maneuver.modifier,
          location: [step.maneuver.location[1], step.maneuver.location[0]], // Convert to [lat, lon]
        },
      })) || [],
    }));

    return {
      routes,
      waypoints: data.waypoints.map((wp: any) => ({
        location: [wp.location[1], wp.location[0]], // Convert to [lat, lon]
        name: wp.name || '',
      })),
    };
  } catch (error) {
    console.error('Routing error:', error);
    return null;
  }
}

/**
 * Generate human-readable instruction from maneuver
 */
function getInstructionFromManeuver(maneuver: any): string {
  const type = maneuver.type;
  const modifier = maneuver.modifier;
  
  const instructions: Record<string, string> = {
    'turn': modifier ? `Turn ${modifier}` : 'Turn',
    'new name': 'Continue',
    'depart': 'Depart',
    'arrive': 'Arrive at destination',
    'merge': 'Merge',
    'on ramp': 'Take the ramp',
    'off ramp': 'Take the exit',
    'fork': modifier ? `Keep ${modifier}` : 'Keep',
    'end of road': modifier ? `Turn ${modifier}` : 'Turn',
    'continue': 'Continue straight',
    'roundabout': 'Enter roundabout',
    'rotary': 'Enter rotary',
    'roundabout turn': modifier ? `At roundabout, take ${modifier} exit` : 'Take exit',
  };
  
  return instructions[type] || 'Continue';
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Calculate ETA from current time
 */
export function calculateETA(durationSeconds: number): Date {
  return new Date(Date.now() + durationSeconds * 1000);
}

/**
 * Format ETA for display
 */
export function formatETA(eta: Date): string {
  return eta.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if route needs recalculation
 * Returns true if provider has moved significantly from route
 */
export function shouldRecalculateRoute(
  currentLocation: [number, number],
  routeGeometry: [number, number][],
  thresholdMeters = 50
): boolean {
  if (!routeGeometry || routeGeometry.length === 0) return true;
  
  // Find closest point on route
  let minDistance = Infinity;
  
  for (const point of routeGeometry) {
    const distance = calculateDistanceMeters(currentLocation, point);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance > thresholdMeters;
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
export function calculateDistanceMeters(
  point1: [number, number],
  point2: [number, number]
): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = (point1[0] * Math.PI) / 180;
  const lat2 = (point2[0] * Math.PI) / 180;
  const deltaLat = ((point2[0] - point1[0]) * Math.PI) / 180;
  const deltaLon = ((point2[1] - point1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Open native maps app with directions
 */
export function openNativeMaps(
  destination: [number, number],
  destinationName?: string
): void {
  const lat = destination[0];
  const lon = destination[1];
  const label = destinationName ? encodeURIComponent(destinationName) : 'Destination';
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let url: string;
  
  if (isIOS) {
    // Apple Maps
    url = `maps://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;
  } else if (isAndroid) {
    // Google Maps
    url = `google.navigation:q=${lat},${lon}`;
  } else {
    // Desktop: Google Maps web
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&destination_place_id=${label}`;
  }
  
  window.open(url, '_blank');
}
