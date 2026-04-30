/**
 * OSMClientMap.tsx
 * Client map showing nearby providers and their locations
 * Allows address geocoding and provider selection
 */
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Loader, Text, Group, Badge, Button, Stack, TextInput, Paper } from '@mantine/core';
import { IconAlertCircle, IconSearch, IconCurrentLocation } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { geocodeAddress, reverseGeocode, formatAddress } from '../services/geocoding.service';
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
      width: 36px;
      height: 36px;
      background: ${N};
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

const providerIcon = L.divIcon({
  className: 'provider-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: ${T};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">
      🚗
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

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

// Component to handle map clicks for pin dropping
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface OSMClientMapProps {
  height?: string;
  searchRadius?: number;
  onProviderSelect?: (provider: Provider) => void;
  onAddressConfirm?: (address: string, lat: number, lng: number) => void;
  allowPinDrop?: boolean;
}

export function OSMClientMap({
  height = '500px',
  searchRadius = 10,
  onProviderSelect,
  onAddressConfirm,
  allowPinDrop = true,
}: OSMClientMapProps) {
  const [clientLocation, setClientLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  const defaultCenter: [number, number] = [9.032, 38.747];
  const mapCenter: [number, number] = clientLocation
    ? [clientLocation.lat, clientLocation.lng]
    : defaultCenter;

  // Get current location
  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setClientLocation(location);
      
      // Reverse geocode to get address
      const result = await reverseGeocode(location.lat, location.lng);
      if (result) {
        setCurrentAddress(formatAddress(result));
      }

      // Search for nearby providers
      await searchNearbyProviders(location.lat, location.lng);
    } catch (err: any) {
      const message = err.code === 1
        ? 'Location permission denied'
        : 'Failed to get location';
      setError(message);
      notifications.show({
        title: 'Location Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Search for nearby providers
  const searchNearbyProviders = async (lat: number, lng: number) => {
    try {
      const result = await authService.searchNearbyProviders(lat, lng, undefined, searchRadius);
      setProviders(result.results);
    } catch (error) {
      console.error('Failed to search providers:', error);
    }
  };

  // Geocode address
  const handleAddressSearch = async () => {
    if (!searchAddress.trim()) return;

    setGeocoding(true);
    setError(null);

    try {
      const result = await geocodeAddress(searchAddress);
      
      if (result) {
        const location = { lat: result.lat, lng: result.lon };
        setClientLocation(location);
        setCurrentAddress(formatAddress(result));
        
        // Search for nearby providers
        await searchNearbyProviders(result.lat, result.lon);
        
        notifications.show({
          title: 'Address Found',
          message: formatAddress(result),
          color: 'teal',
        });
      } else {
        setError('Address not found. Try dropping a pin on the map.');
        notifications.show({
          title: 'Address Not Found',
          message: 'Please try a different address or drop a pin on the map',
          color: 'orange',
        });
      }
    } catch (err) {
      setError('Failed to geocode address');
      notifications.show({
        title: 'Geocoding Error',
        message: 'Failed to find address. Try dropping a pin on the map.',
        color: 'red',
      });
    } finally {
      setGeocoding(false);
    }
  };

  // Handle manual pin drop
  const handleLocationSelect = async (lat: number, lng: number) => {
    if (!allowPinDrop) return;

    setClientLocation({ lat, lng });
    
    // Reverse geocode to get address
    const result = await reverseGeocode(lat, lng);
    if (result) {
      setCurrentAddress(formatAddress(result));
    }
    
    // Search for nearby providers
    await searchNearbyProviders(lat, lng);
    
    notifications.show({
      title: 'Location Selected',
      message: 'Pin dropped on map',
      color: 'teal',
    });
  };

  // Confirm address
  const handleConfirmAddress = () => {
    if (clientLocation && currentAddress) {
      onAddressConfirm?.(currentAddress, clientLocation.lat, clientLocation.lng);
      notifications.show({
        title: 'Address Confirmed',
        message: currentAddress,
        color: 'teal',
      });
    }
  };

  // Handle provider selection
  const handleProviderClick = (provider: Provider) => {
    setSelectedProvider(provider);
    onProviderSelect?.(provider);
  };

  // Initialize
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <Box>
      {/* Search Controls */}
      <Paper mb={16} p="md" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
        <Stack gap={12}>
          <Group gap={8}>
            <TextInput
              placeholder="Enter your address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
              size="sm"
            />
            <Button
              size="sm"
              onClick={handleAddressSearch}
              loading={geocoding}
              color="teal"
            >
              Search
            </Button>
            <Button
              size="sm"
              variant="light"
              onClick={getCurrentLocation}
              loading={loading}
              leftSection={<IconCurrentLocation size={16} />}
            >
              My Location
            </Button>
          </Group>

          {currentAddress && (
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                📍 {currentAddress}
              </Text>
              {onAddressConfirm && (
                <Button size="xs" variant="light" onClick={handleConfirmAddress}>
                  Confirm Address
                </Button>
              )}
            </Group>
          )}

          {error && (
            <Group gap={8}>
              <IconAlertCircle size={14} color={COLORS.error} />
              <Text size="xs" c="red">
                {error}
              </Text>
            </Group>
          )}

          {providers.length > 0 && (
            <Badge size="sm" color="teal" variant="light">
              {providers.length} provider{providers.length !== 1 ? 's' : ''} nearby
            </Badge>
          )}

          {allowPinDrop && (
            <Text size="xs" c="dimmed" ta="center">
              💡 Tip: Click on the map to drop a pin at your exact location
            </Text>
          )}
        </Stack>
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
              background: 'rgba(255,255,255,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Loader color="teal" />
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

          {allowPinDrop && <MapClickHandler onLocationSelect={handleLocationSelect} />}

          {/* Client location */}
          {clientLocation && (
            <>
              <Marker position={[clientLocation.lat, clientLocation.lng]} icon={clientIcon}>
                <Popup>
                  <Stack gap={4}>
                    <Text size="sm" fw={700}>
                      Your Location
                    </Text>
                    {currentAddress && (
                      <Text size="xs" c="dimmed">
                        {currentAddress}
                      </Text>
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
              icon={providerIcon}
              eventHandlers={{
                click: () => handleProviderClick(provider),
              }}
            >
              <Popup>
                <Stack gap={4}>
                  <Text size="sm" fw={700}>
                    {provider.full_name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    ⭐ {provider.avg_rating.toFixed(1)} • {provider.total_jobs} jobs
                  </Text>
                  <Text size="xs" c="dimmed">
                    📍 {provider.distance_km.toFixed(1)} km away
                  </Text>
                  {provider.primary_service && (
                    <Badge size="xs" color="teal">
                      {provider.primary_service}
                    </Badge>
                  )}
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
