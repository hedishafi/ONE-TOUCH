/**
 * OSMProviderMap.tsx
 * Real-time provider location tracking map
 * Shows provider location, online status, and search radius
 */
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Loader, Text, Group, Badge, Button, Stack } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { locationService, type LocationUpdate } from '../services/location.service';
import * as authService from '../services/authService';
import { COLORS } from '../utils/constants';

const T = COLORS.tealBlue;

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom provider icon
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

interface MapUpdaterProps {
  center: [number, number];
  zoom: number;
}

// Component to update map view
function MapUpdater({ center, zoom }: MapUpdaterProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

interface OSMProviderMapProps {
  isOnline: boolean;
  searchRadius?: number;
  height?: string;
  onLocationUpdate?: (lat: number, lng: number) => void;
}

export function OSMProviderMap({
  isOnline,
  searchRadius = 10,
  height = '400px',
  onLocationUpdate,
}: OSMProviderMapProps) {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Default center (Addis Ababa)
  const defaultCenter: [number, number] = [9.032, 38.747];
  const mapCenter: [number, number] = currentLocation
    ? [currentLocation.latitude, currentLocation.longitude]
    : defaultCenter;

  // Get initial location
  const getInitialLocation = async () => {
    setLoading(true);
    setError(null);
    
    console.log('🔍 Requesting location permission...');
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      console.error('❌', msg);
      setError(msg);
      setLoading(false);
      return;
    }

    // Check permission status if available
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('📋 Location permission status:', permission.state);
        
        if (permission.state === 'denied') {
          const msg = 'Location permission denied. Please enable it in browser settings.';
          console.error('❌', msg);
          setError(msg);
          notifications.show({
            title: 'Location Permission Denied',
            message: 'Please enable location access in your browser settings and refresh the page.',
            color: 'red',
            autoClose: false,
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('⚠️ Could not check permission status:', e);
      }
    }
    
    try {
      const location = await locationService.getCurrentLocation();
      console.log('✅ Location received:', location);
      setCurrentLocation(location);
      onLocationUpdate?.(location.latitude, location.longitude);
      
      // Update backend if online
      if (isOnline) {
        console.log('📡 Updating backend with location:', location.latitude, location.longitude);
        await authService.updateProviderLocation(location.latitude, location.longitude);
      }
    } catch (err: any) {
      console.error('❌ Location error:', err);
      setError(err.message || 'Failed to get location');
      notifications.show({
        title: 'Location Error',
        message: err.message || 'Please enable location access in your browser settings.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Start/stop tracking based on online status
  useEffect(() => {
    if (!isOnline) {
      console.log('⚫ Provider offline, stopping location tracking');
      locationService.stopTracking();
      return;
    }

    console.log('🟢 Provider online, starting location tracking');
    
    // Get initial location
    getInitialLocation();
    
    // Start continuous tracking
    locationService.startTracking({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
    
    // Subscribe to location updates
    const unsubscribe = locationService.subscribe(async (location: LocationUpdate) => {
      console.log('📍 Location update received:', location);
      setCurrentLocation(location);
      onLocationUpdate?.(location.latitude, location.longitude);
      
      // Throttle backend updates to every 30 seconds
      const now = Date.now();
      if (now - lastUpdateRef.current > 30000) {
        try {
          console.log('📡 Sending location to backend:', location.latitude, location.longitude);
          await authService.updateProviderLocation(location.latitude, location.longitude);
          lastUpdateRef.current = now;
          console.log('✅ Backend updated successfully');
        } catch (error) {
          console.error('❌ Failed to update location on backend:', error);
        }
      }
    });
    
    // Subscribe to errors
    const unsubscribeErrors = locationService.subscribeToErrors((err) => {
      console.error('❌ Location tracking error:', err);
      setError(err.message);
      notifications.show({
        title: 'Location Tracking Error',
        message: err.message,
        color: 'red',
      });
    });
    
    return () => {
      console.log('🛑 Cleaning up location tracking');
      unsubscribe();
      unsubscribeErrors();
      locationService.stopTracking();
    };
  }, [isOnline, onLocationUpdate]);

  // Refresh location manually
  const refreshLocation = () => {
    getInitialLocation();
  };

  return (
    <Box style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Loading overlay */}
      {loading && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: 'rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader color="teal" />
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Box
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Group
            gap={8}
            p="sm"
            style={{
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <IconAlertCircle size={18} color={COLORS.error} />
            <Text size="xs" c="red" style={{ flex: 1 }}>
              {error}
            </Text>
            <Button size="xs" variant="light" onClick={refreshLocation}>
              Retry
            </Button>
          </Group>
        </Box>
      )}

      {/* Status overlay */}
      <Box
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
        }}
      >
        <Stack gap={8}>
          <Badge
            size="lg"
            color={isOnline ? 'teal' : 'gray'}
            variant="filled"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </Badge>
          
          {currentLocation && (
            <>
              <Badge
                size="sm"
                color="blue"
                variant="light"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Badge>
              <Badge
                size="sm"
                color="gray"
                variant="light"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                ⏱️ {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </Badge>
              <Button
                size="xs"
                variant="white"
                leftSection={<IconRefresh size={14} />}
                onClick={refreshLocation}
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                Refresh
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ width: '100%', height }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater center={mapCenter} zoom={14} />

        {/* Provider location marker */}
        {currentLocation && (
          <>
            <Marker
              position={[currentLocation.latitude, currentLocation.longitude]}
              icon={providerIcon}
            >
              <Popup>
                <Stack gap={4}>
                  <Text size="sm" fw={700}>
                    Your Location
                  </Text>
                  <Text size="xs" c="dimmed">
                    Accuracy: ±{Math.round(currentLocation.accuracy)}m
                  </Text>
                  {currentLocation.speed && (
                    <Text size="xs" c="dimmed">
                      Speed: {Math.round(currentLocation.speed * 3.6)} km/h
                    </Text>
                  )}
                </Stack>
              </Popup>
            </Marker>

            {/* Search radius circle */}
            {isOnline && (
              <Circle
                center={[currentLocation.latitude, currentLocation.longitude]}
                radius={searchRadius * 1000}
                pathOptions={{
                  color: T,
                  fillColor: T,
                  fillOpacity: 0.1,
                  weight: 2,
                }}
              />
            )}
          </>
        )}
      </MapContainer>
    </Box>
  );
}
