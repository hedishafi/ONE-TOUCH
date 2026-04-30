/**
 * OSMClientMap.tsx
 * Client map with AUTOMATIC location detection
 * Shows nearby providers without manual address entry
 */
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Loader, Text, Group, Badge, Button, Stack, Paper } from '@mantine/core';
import { IconAlertCircle, IconCurrentLocation } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { reverseGeocode, formatAddress } from '../services/geocoding.service';
import * as authService from '../services/authService';
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
const clientIcon = L.divIcon({
  className: 'client-marker',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: ${N};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    ">
      👤
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Provider icon with service category
const createProviderIcon = (serviceCategory?: string) => {
  const categoryEmojis: Record<string, string> = {
    'Plumbing': '🔧',
    'Electrical': '⚡',
    'Cleaning': '🧹',
    'Painting': '🎨',
    'Carpentry': '🪚',
    'Moving': '📦',
    'Beauty': '💅',
    'Tutoring': '📚',
    'Car Repair': '🚗',
    'Laundry': '👕',
  };
  
  const emoji = serviceCategory ? (categoryEmojis[serviceCategory] || '🔧') : '🔧';
  
  return L.divIcon({
    className: 'provider-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${T};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface Provider {
  provider_id: number;
  provider_uid: string;
  full_name: string;
  phone_number: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  avg_rating: number;
  total_jobs: number;
  profile_picture: string | null;
  primary_service: string | null;
}

interface OSMClientMapProps {
  height?: string;
  searchRadius?: number;
  onProviderSelect?: (provider: Provider) => void;
  onLocationDetected?: (address: string, lat: number, lng: number) => void;
}

export function OSMClientMap({
  height = '500px',
  searchRadius = 10,
  onProviderSelect,
  onLocationDetected,
}: OSMClientMapProps) {
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('Detecting your location...');

  const defaultCenter: [number, number] = [9.032, 38.747];
  const mapCenter: [number, number] = clientLocation
    ? [clientLocation.lat, clientLocation.lng]
    : defaultCenter;

  // Search for nearby providers
  const searchNearbyProviders = async (lat: number, lng: number) => {
    try {
      console.log('🔍 Searching for providers near:', lat, lng);
      const result = await authService.searchNearbyProviders(lat, lng, undefined, searchRadius);
      setProviders(result.results);
      console.log(`✅ Found ${result.results.length} providers`);
    } catch (error) {
      console.error('❌ Failed to search providers:', error);
    }
  };

  // Auto-detect client location on mount
  const detectClientLocation = async () => {
    setLoading(true);
    setError(null);
    setCurrentAddress('Detecting your location...');

    console.log('🔍 Auto-detecting client location...');

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser';
      console.error('❌', msg);
      setError(msg);
      setCurrentAddress('Location not available');
      setLoading(false);
      return;
    }

    try {
      // Check permission first
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log('📋 Location permission:', permission.state);
        
        if (permission.state === 'denied') {
          throw new Error('Location permission denied. Please enable it in browser settings.');
        }
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000, // Increased to 30 seconds
          maximumAge: 0,
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      console.log('✅ Client location detected:', location);
      setClientLocation(location);
      
      // Reverse geocode to get address
      try {
        const result = await reverseGeocode(location.lat, location.lng);
        if (result) {
          const address = formatAddress(result);
          setCurrentAddress(address);
          console.log('📍 Address:', address);
          onLocationDetected?.(address, location.lat, location.lng);
        } else {
          setCurrentAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        }
      } catch (geoErr) {
        console.warn('⚠️ Reverse geocoding failed, using coordinates');
        setCurrentAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      }

      // Auto-search for nearby providers
      await searchNearbyProviders(location.lat, location.lng);
      
      notifications.show({
        title: 'Location Detected',
        message: `Found ${providers.length} providers nearby`,
        color: 'teal',
      });
    } catch (err: any) {
      console.error('❌ Location detection failed:', err);
      const message = err.code === 1
        ? 'Location permission denied. Please enable location access in browser settings.'
        : err.message || 'Failed to detect location. Please enable location services.';
      setError(message);
      setCurrentAddress('Location not available');
      notifications.show({
        title: 'Location Error',
        message,
        color: 'red',
        autoClose: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle provider selection
  const handleProviderClick = (provider: Provider) => {
    onProviderSelect?.(provider);
    notifications.show({
      title: 'Provider Selected',
      message: `${provider.full_name} - ${provider.distance_km.toFixed(1)}km away`,
      color: 'teal',
    });
  };

  // Auto-detect location on mount
  useEffect(() => {
    detectClientLocation();
  }, []);

  return (
    <Box>
      {/* Location Status Bar */}
      <Paper mb={16} p="md" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
        <Group justify="space-between" align="center">
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" mb={4}>Your Location</Text>
            <Text size="sm" fw={600} c={N}>{currentAddress}</Text>
            {providers.length > 0 && (
              <Badge size="sm" color="teal" variant="light" mt={6}>
                {providers.length} provider{providers.length !== 1 ? 's' : ''} nearby
              </Badge>
            )}
          </Box>
          <Button
            size="sm"
            variant="light"
            onClick={detectClientLocation}
            loading={loading}
            leftSection={<IconCurrentLocation size={16} />}
          >
            Refresh
          </Button>
        </Group>

        {error && (
          <Group gap={8} mt={12}>
            <IconAlertCircle size={14} color={COLORS.error} />
            <Text size="xs" c="red">{error}</Text>
          </Group>
        )}
      </Paper>

      {/* Map */}
      <Paper radius="xl" style={{ overflow: 'hidden', border: '1px solid var(--ot-border)', position: 'relative' }}>
        {loading && (
          <Box
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <Loader color="teal" size="lg" />
            <Text size="sm" c="dimmed">Detecting your location...</Text>
          </Box>
        )}

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

          {/* Client location */}
          {clientLocation && (
            <>
              <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon}>
                <Popup>
                  <Stack gap={4}>
                    <Text size="sm" fw={700}>You</Text>
                    {currentAddress && (
                      <Text size="xs" c="dimmed">{currentAddress}</Text>
                    )}
                  </Stack>
                </Popup>
              </Marker>

              {/* Search radius */}
              <Circle
                center={[clientLocation.lat, clientLocation.lng]}
                radius={searchRadius * 1000}
                pathOptions={{
                  color: N,
                  fillColor: N,
                  fillOpacity: 0.05,
                  weight: 2,
                  dashArray: '5, 10',
                }}
              />
            </>
          )}

          {/* Provider markers */}
          {providers.map((provider) => (
            <Marker
              key={provider.provider_id}
              position={[provider.latitude, provider.longitude]}
              icon={createProviderIcon(provider.primary_service || undefined)}
              eventHandlers={{
                click: () => handleProviderClick(provider),
              }}
            >
              <Popup>
                <Stack gap={4}>
                  <Text size="sm" fw={700}>{provider.full_name}</Text>
                  {provider.primary_service && (
                    <Badge size="xs" color="teal">{provider.primary_service}</Badge>
                  )}
                  <Text size="xs" c="dimmed">
                    ⭐ {provider.avg_rating.toFixed(1)} • {provider.total_jobs} jobs
                  </Text>
                  <Text size="xs" c="dimmed">
                    📍 {provider.distance_km.toFixed(1)} km away
                  </Text>
                  <Button
                    size="xs"
                    fullWidth
                    onClick={() => handleProviderClick(provider)}
                  >
                    Select Provider
                  </Button>
                </Stack>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Paper>
    </Box>
  );
}
