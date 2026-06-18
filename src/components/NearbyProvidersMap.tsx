/**
 * NearbyProvidersMap.tsx
 * Client-side map showing nearby online providers with Google Maps integration
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Paper,
  Avatar,
  Loader,
  Select,
  NumberInput,
} from '@mantine/core';
import {
  IconMapPin,
  IconStar,
  IconPhone,
  IconRefresh,
  IconCurrentLocation,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { notifications } from '@mantine/notifications';
import { COLORS, CURRENCY_SYMBOL } from '../utils/constants';
import * as authService from '../services/authService';
import { useServiceCatalog } from '../hooks/useServiceCatalog';

const T = COLORS.tealBlue;
const N = COLORS.navyBlue;
const DEFAULT_CENTER: [number, number] = [9.032, 38.747]; // Addis Ababa

// Custom marker icons
const providerIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:12px;font-weight:bold;">P</span></div>`,
    iconAnchor: [12, 12],
  });

const clientIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:${N};border:4px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:14px;font-weight:bold;">You</span></div>`,
  iconAnchor: [14, 14],
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

interface NearbyProvidersMapProps {
  onProviderSelect?: (provider: Provider) => void;
  autoSearch?: boolean;
}

export function NearbyProvidersMap({ onProviderSelect, autoSearch = true }: NearbyProvidersMapProps) {
  const { categories } = useServiceCatalog();
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [clientLocation, setClientLocation] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(10);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get client location on mount
  useEffect(() => {
    if (autoSearch) {
      getCurrentLocation();
    }
  }, [autoSearch]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services not supported by your browser.');
      notifications.show({
        title: 'Location Not Supported',
        message: 'Your browser does not support location services.',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: [number, number] = [position.coords.latitude, position.coords.longitude];
        setClientLocation(location);
        searchProviders(location[0], location[1]);
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please enable location access.');
          notifications.show({
            title: 'Location Permission Required',
            message: 'Please enable location access to find nearby providers.',
            color: 'yellow',
          });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable. Please try again.');
          notifications.show({
            title: 'Location Unavailable',
            message: 'Unable to determine your location. Please try again.',
            color: 'red',
          });
        } else {
          setLocationError('Failed to get location. Please try again.');
          notifications.show({
            title: 'Location Error',
            message: 'Failed to get your location. Please try again.',
            color: 'red',
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const searchProviders = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const categoryId = selectedCategory ? parseInt(selectedCategory) : undefined;
      const result = await authService.searchNearbyProviders(lat, lng, categoryId, searchRadius);
      setProviders(result.results);
      
      if (result.count === 0) {
        notifications.show({
          title: 'No Providers Found',
          message: `No online providers found within ${searchRadius}km.`,
          color: 'yellow',
        });
      } else {
        notifications.show({
          title: 'Providers Found',
          message: `Found ${result.count} online provider${result.count !== 1 ? 's' : ''} nearby.`,
          color: 'teal',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Search Failed',
        message: error.response?.data?.error || 'Failed to search providers.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (clientLocation) {
      searchProviders(clientLocation[0], clientLocation[1]);
    } else {
      getCurrentLocation();
    }
  }, [clientLocation, selectedCategory, searchRadius]);

  const handleCategoryChange = (value: string | null) => {
    setSelectedCategory(value);
    if (clientLocation) {
      searchProviders(clientLocation[0], clientLocation[1]);
    }
  };

  const handleRadiusChange = (value: number | string) => {
    const radius = typeof value === 'string' ? parseFloat(value) : value;
    setSearchRadius(radius);
    if (clientLocation) {
      searchProviders(clientLocation[0], clientLocation[1]);
    }
  };

  const mapCenter = clientLocation || DEFAULT_CENTER;

  return (
    <Box>
      {/* Search Controls */}
      <Paper mb={16} p="md" radius="xl" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
        <Stack gap={12}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={700} size="sm" c={N}>
              Find Nearby Providers
            </Text>
            <Group gap={8}>
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconCurrentLocation size={14} />}
                onClick={getCurrentLocation}
                loading={loading}
              >
                My Location
              </Button>
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconRefresh size={14} />}
                onClick={handleRefresh}
                loading={loading}
                disabled={!clientLocation}
              >
                Refresh
              </Button>
            </Group>
          </Group>

          <Group grow>
            <Select
              placeholder="All Services"
              data={[
                { value: '', label: 'All Services' },
                ...categories.map((cat) => ({ value: cat.id.toString(), label: cat.name })),
              ]}
              value={selectedCategory}
              onChange={handleCategoryChange}
              clearable
              size="sm"
            />
            <NumberInput
              placeholder="Radius (km)"
              value={searchRadius}
              onChange={handleRadiusChange}
              min={1}
              max={50}
              step={1}
              size="sm"
              suffix=" km"
            />
          </Group>

          {locationError && (
            <Text size="xs" c="red">
              {locationError}
            </Text>
          )}

          {!loading && providers.length > 0 && (
            <Badge size="sm" color="teal" variant="light">
              {providers.length} provider{providers.length !== 1 ? 's' : ''} online
            </Badge>
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

        <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: 500 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Client location marker */}
          {clientLocation && (
            <>
              <Marker position={clientLocation} icon={clientIcon}>
                <Popup>
                  <Text size="sm" fw={600}>
                    Your Location
                  </Text>
                </Popup>
              </Marker>
              {/* Search radius circle */}
              <Circle
                center={clientLocation}
                radius={searchRadius * 1000}
                pathOptions={{ color: T, fillOpacity: 0.1, weight: 2, opacity: 0.5 }}
              />
            </>
          )}

          {/* Provider markers */}
          {providers.map((provider) => (
            <Marker
              key={provider.provider_id}
              position={[provider.latitude, provider.longitude]}
              icon={providerIcon(T)}
            >
              <Popup>
                <Stack gap={8} style={{ minWidth: 200 }}>
                  <Group gap={10}>
                    <Avatar size={40} radius="xl" color="teal">
                      {provider.full_name.charAt(0)}
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" fw={700}>
                        {provider.full_name}
                      </Text>
                      <Group gap={4}>
                        <IconStar size={12} color={COLORS.warning} fill={COLORS.warning} />
                        <Text size="xs" fw={600}>
                          {provider.avg_rating.toFixed(1)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          · {provider.total_jobs} jobs
                        </Text>
                      </Group>
                    </Box>
                  </Group>

                  {provider.primary_service && (
                    <Badge size="xs" variant="light" color="blue">
                      {provider.primary_service}
                    </Badge>
                  )}

                  <Group gap={8}>
                    <IconMapPin size={12} color={T} />
                    <Text size="xs" c="dimmed">
                      {provider.distance_km} km away
                    </Text>
                  </Group>

                  <Group gap={8} grow>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconPhone size={12} />}
                      component="a"
                      href={`tel:${provider.phone_number}`}
                    >
                      Call
                    </Button>
                    {onProviderSelect && (
                      <Button size="xs" color="teal" onClick={() => onProviderSelect(provider)}>
                        Select
                      </Button>
                    )}
                  </Group>
                </Stack>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Paper>

      {/* Provider List */}
      {providers.length > 0 && (
        <Stack gap={12} mt={16}>
          <Text fw={700} size="sm" c={N}>
            Nearby Providers ({providers.length})
          </Text>
          {providers.map((provider) => (
            <Paper
              key={provider.provider_id}
              p="md"
              radius="xl"
              style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap={12}>
                  <Avatar size={48} radius="xl" color="teal" src={provider.profile_picture}>
                    {provider.full_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Text size="sm" fw={700}>
                      {provider.full_name}
                    </Text>
                    <Group gap={6}>
                      <IconStar size={12} color={COLORS.warning} fill={COLORS.warning} />
                      <Text size="xs" fw={600}>
                        {provider.avg_rating.toFixed(1)}
                      </Text>
                      <Text size="xs" c="dimmed">
                        · {provider.total_jobs} jobs
                      </Text>
                    </Group>
                    {provider.primary_service && (
                      <Badge size="xs" variant="light" color="blue" mt={4}>
                        {provider.primary_service}
                      </Badge>
                    )}
                    <Group gap={6} mt={4}>
                      <IconMapPin size={12} color={T} />
                      <Text size="xs" c="dimmed">
                        {provider.distance_km} km away
                      </Text>
                    </Group>
                  </Box>
                </Group>
                <Group gap={8}>
                  <Button
                    size="sm"
                    variant="light"
                    color="teal"
                    leftSection={<IconPhone size={14} />}
                    component="a"
                    href={`tel:${provider.phone_number}`}
                  >
                    Call
                  </Button>
                  {onProviderSelect && (
                    <Button size="sm" color="teal" onClick={() => onProviderSelect(provider)}>
                      Select
                    </Button>
                  )}
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}
