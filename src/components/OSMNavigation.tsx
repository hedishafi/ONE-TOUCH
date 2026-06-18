/**
 * OSMNavigation.tsx
 * Turn-by-turn navigation for providers traveling to clients
 * Shows route, ETA, distance, and voice-like directions
 */
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Text, Group, Badge, Button, Stack, Paper, Progress } from '@mantine/core';
import { IconNavigation, IconPhone, IconX, IconMapPin, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { 
  calculateRoute, 
  formatDistance, 
  formatDuration, 
  formatETA,
  calculateETA,
  shouldRecalculateRoute,
  openNativeMaps,
  type Route
} from '../services/routing.service';
import { locationService, type LocationUpdate } from '../services/location.service';
import { COLORS } from '../utils/constants';

const T = COLORS.tealBlue;
const N = COLORS.navyBlue;

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const providerIcon = L.divIcon({
  className: 'provider-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: ${T};
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    ">
      🚗
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const clientIcon = L.divIcon({
  className: 'client-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: ${COLORS.error};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    ">
      📍
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Component to auto-center map on route
function MapController({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

interface OSMNavigationProps {
  clientLocation: [number, number];
  clientName: string;
  clientPhone: string;
  onClose: () => void;
  height?: string;
}

export function OSMNavigation({
  clientLocation,
  clientName,
  clientPhone,
  onClose,
  height = '600px',
}: OSMNavigationProps) {
  const [providerLocation, setProviderLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastRouteCalc = useRef<number>(0);

  // Calculate route
  const calculateNewRoute = async (start: [number, number]) => {
    console.log('🗺️ Calculating route from', start, 'to', clientLocation);
    setLoading(true);
    
    try {
      const result = await calculateRoute(start, clientLocation, 'driving');
      
      if (result && result.routes.length > 0) {
        const newRoute = result.routes[0];
        setRoute(newRoute);
        setCurrentStepIndex(0);
        lastRouteCalc.current = Date.now();
        console.log('✅ Route calculated:', {
          distance: formatDistance(newRoute.distance),
          duration: formatDuration(newRoute.duration),
          steps: newRoute.steps.length,
        });
        
        notifications.show({
          title: 'Route Calculated',
          message: `${formatDistance(newRoute.distance)} • ${formatDuration(newRoute.duration)}`,
          color: 'teal',
        });
      } else {
        throw new Error('No route found');
      }
    } catch (err) {
      console.error('❌ Route calculation failed:', err);
      setError('Failed to calculate route');
      notifications.show({
        title: 'Navigation Error',
        message: 'Could not calculate route. Try opening in native maps.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle location updates
  const handleLocationUpdate = async (location: LocationUpdate) => {
    const newLocation: [number, number] = [location.latitude, location.longitude];
    setProviderLocation(newLocation);
    
    // Check if we need to recalculate route
    if (route && shouldRecalculateRoute(newLocation, route.geometry, 50)) {
      console.log('🔄 Provider deviated from route, recalculating...');
      await calculateNewRoute(newLocation);
    }
    
    // Update current step based on location
    if (route) {
      // Find closest step
      let closestStepIndex = 0;
      let minDistance = Infinity;
      
      route.steps.forEach((step, index) => {
        const stepLocation = step.maneuver.location;
        const distance = Math.sqrt(
          Math.pow(newLocation[0] - stepLocation[0], 2) +
          Math.pow(newLocation[1] - stepLocation[1], 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestStepIndex = index;
        }
      });
      
      if (closestStepIndex !== currentStepIndex) {
        setCurrentStepIndex(closestStepIndex);
      }
    }
  };

  // Initialize navigation
  useEffect(() => {
    console.log('🚀 Starting navigation to client');
    
    // Get initial location
    locationService.getCurrentLocation().then((location) => {
      const start: [number, number] = [location.latitude, location.longitude];
      setProviderLocation(start);
      calculateNewRoute(start);
    }).catch((err) => {
      console.error('❌ Failed to get initial location:', err);
      setError('Failed to get your location');
      setLoading(false);
    });
    
    // Start tracking
    locationService.startTracking();
    const unsubscribe = locationService.subscribe(handleLocationUpdate);
    
    return () => {
      unsubscribe();
      locationService.stopTracking();
    };
  }, []);

  // Calculate map bounds
  const mapBounds = providerLocation && route
    ? L.latLngBounds([
        providerLocation,
        clientLocation,
        ...route.geometry,
      ])
    : null;

  const currentStep = route?.steps[currentStepIndex];
  const nextStep = route?.steps[currentStepIndex + 1];
  const eta = route ? calculateETA(route.duration) : null;

  return (
    <Box style={{ position: 'relative' }}>
      {/* Navigation Header */}
      <Paper p="md" radius="xl" mb={12} style={{ background: `linear-gradient(135deg, ${N}, ${T})`, color: 'white' }}>
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap={8} mb={4}>
              <IconNavigation size={20} />
              <Text size="sm" fw={700}>Navigating to Client</Text>
            </Group>
            <Text size="lg" fw={900}>{clientName}</Text>
            {route && (
              <Group gap={16} mt={8}>
                <Group gap={4}>
                  <IconMapPin size={14} />
                  <Text size="xs">{formatDistance(route.distance)}</Text>
                </Group>
                <Group gap={4}>
                  <IconClock size={14} />
                  <Text size="xs">{formatDuration(route.duration)}</Text>
                </Group>
                {eta && (
                  <Badge size="sm" color="yellow" variant="filled">
                    ETA: {formatETA(eta)}
                  </Badge>
                )}
              </Group>
            )}
          </Box>
          <Group gap={8}>
            <Button
              size="sm"
              variant="white"
              leftSection={<IconPhone size={14} />}
              component="a"
              href={`tel:${clientPhone}`}
            >
              Call
            </Button>
            <Button
              size="sm"
              variant="subtle"
              color="white"
              onClick={onClose}
            >
              <IconX size={16} />
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Current Direction Card */}
      {currentStep && (
        <Paper p="lg" radius="xl" mb={12} style={{ background: 'var(--ot-bg-card)', border: `2px solid ${T}` }}>
          <Stack gap={8}>
            <Group justify="space-between">
              <Badge size="lg" color="teal" variant="filled">
                {currentStepIndex + 1} of {route?.steps.length}
              </Badge>
              {currentStep.distance > 0 && (
                <Text size="sm" fw={700} c={T}>
                  In {formatDistance(currentStep.distance)}
                </Text>
              )}
            </Group>
            
            <Text size="xl" fw={900} c={N}>
              {currentStep.instruction}
            </Text>
            
            {currentStep.name && (
              <Text size="sm" c="dimmed">
                on {currentStep.name}
              </Text>
            )}
            
            {route && (
              <Progress
                value={((currentStepIndex + 1) / route.steps.length) * 100}
                color="teal"
                size="sm"
                radius="xl"
              />
            )}
          </Stack>
        </Paper>
      )}

      {/* Next Direction Preview */}
      {nextStep && (
        <Paper p="sm" radius="lg" mb={12} style={{ background: `${T}10`, border: `1px solid ${T}44` }}>
          <Group gap={8}>
            <Text size="xs" c="dimmed" fw={600}>THEN:</Text>
            <Text size="sm" fw={600} c={N}>{nextStep.instruction}</Text>
          </Group>
        </Paper>
      )}

      {/* Map */}
      <Paper radius="xl" style={{ overflow: 'hidden', border: '1px solid var(--ot-border)', position: 'relative' }}>
        {loading && (
          <Box
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              background: 'white',
              padding: '16px 24px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Text size="sm" fw={600}>Calculating route...</Text>
          </Box>
        )}

        <MapContainer
          center={providerLocation || clientLocation}
          zoom={14}
          style={{ width: '100%', height }}
          zoomControl={true}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController bounds={mapBounds} />

          {/* Provider location */}
          {providerLocation && (
            <Marker position={providerLocation} icon={providerIcon}>
              <Popup>
                <Text size="sm" fw={700}>Your Location</Text>
              </Popup>
            </Marker>
          )}

          {/* Client location */}
          <Marker position={clientLocation} icon={clientIcon}>
            <Popup>
              <Stack gap={4}>
                <Text size="sm" fw={700}>{clientName}</Text>
                <Text size="xs" c="dimmed">Destination</Text>
              </Stack>
            </Popup>
          </Marker>

          {/* Route line */}
          {route && (
            <Polyline
              positions={route.geometry}
              pathOptions={{
                color: T,
                weight: 5,
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>
      </Paper>

      {/* Open in Native Maps */}
      <Button
        fullWidth
        size="md"
        variant="light"
        mt={12}
        onClick={() => openNativeMaps(clientLocation, clientName)}
      >
        Open in Google Maps / Apple Maps
      </Button>

      {error && (
        <Paper p="sm" radius="lg" mt={12} style={{ background: '#FEE', border: '1px solid #FCC' }}>
          <Text size="xs" c="red">{error}</Text>
        </Paper>
      )}
    </Box>
  );
}
