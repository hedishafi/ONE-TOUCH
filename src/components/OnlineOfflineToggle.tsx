/**
 * OnlineOfflineToggle.tsx
 * Provider online/offline status toggle with location tracking
 */
import { useState, useEffect, useRef } from 'react';
import { Switch, Group, Box, Text, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconWifiOff, IconRadar } from '@tabler/icons-react';
import { COLORS } from '../utils/constants';
import * as authService from '../services/authService';

const T = COLORS.tealBlue;
const LOCATION_UPDATE_INTERVAL = 45000; // 45 seconds

interface OnlineOfflineToggleProps {
  initialOnline?: boolean;
  disabled?: boolean;
  onStatusChange?: (isOnline: boolean) => void;
}

export function OnlineOfflineToggle({ 
  initialOnline = false, 
  disabled = false,
  onStatusChange 
}: OnlineOfflineToggleProps) {
  const [online, setOnline] = useState(initialOnline);
  const [loading, setLoading] = useState(false);
  const locationIntervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Start location tracking when going online
  useEffect(() => {
    if (online && !disabled) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [online, disabled]);

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      notifications.show({
        title: 'Location Not Supported',
        message: 'Your browser does not support location services.',
        color: 'red',
      });
      return;
    }

    // Start periodic location updates
    locationIntervalRef.current = setInterval(() => {
      updateLocation();
    }, LOCATION_UPDATE_INTERVAL);

    // Also watch for location changes in real-time
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Location changed, update immediately
        sendLocationUpdate(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000,
      }
    );
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const updateLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocationUpdate(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Location error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          notifications.show({
            title: 'Location Permission Denied',
            message: 'Please enable location access to stay online.',
            color: 'yellow',
          });
          handleGoOffline();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const sendLocationUpdate = async (latitude: number, longitude: number) => {
    try {
      await authService.updateProviderLocation(latitude, longitude);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const handleGoOnline = async () => {
    if (!navigator.geolocation) {
      notifications.show({
        title: 'Location Not Supported',
        message: 'Your browser does not support location services.',
        color: 'red',
      });
      return;
    }

    setLoading(true);

    // Request location permission and get current position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await authService.goOnline(position.coords.latitude, position.coords.longitude);
          setOnline(true);
          onStatusChange?.(true);
          notifications.show({
            title: 'You are Online',
            message: 'You are now receiving job requests.',
            color: 'teal',
          });
        } catch (error: any) {
          notifications.show({
            title: 'Failed to Go Online',
            message: error.response?.data?.error || 'Please try again.',
            color: 'red',
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          notifications.show({
            title: 'Location Permission Required',
            message: 'Please enable location access to go online.',
            color: 'yellow',
          });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          notifications.show({
            title: 'Location Unavailable',
            message: 'Unable to determine your location. Please try again.',
            color: 'red',
          });
        } else {
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

  const handleGoOffline = async () => {
    setLoading(true);
    try {
      await authService.goOffline();
      setOnline(false);
      onStatusChange?.(false);
      notifications.show({
        title: 'You are Offline',
        message: 'You are no longer receiving job requests.',
        color: 'gray',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Failed to Go Offline',
        message: error.response?.data?.error || 'Please try again.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    if (disabled) return;
    if (checked) {
      handleGoOnline();
    } else {
      handleGoOffline();
    }
  };

  return (
    <Group
      gap={6}
      px={12}
      py={5}
      style={{
        borderRadius: 20,
        background: online ? `${T}15` : 'var(--ot-bg-row)',
        border: `1px solid ${online ? T : 'var(--ot-border)'}`,
        transition: 'all 0.3s',
      }}
    >
      <Box
        w={8}
        h={8}
        style={{
          borderRadius: '50%',
          background: online ? COLORS.success : '#aaa',
          boxShadow: online ? `0 0 0 3px ${COLORS.success}44` : 'none',
          transition: 'all 0.3s',
        }}
      />
      <Text size="xs" fw={700} c={online ? T : 'dimmed'}>
        {online ? 'Online' : 'Offline'}
      </Text>
      {online && (
        <Badge size="xs" variant="light" color="teal" leftSection={<IconRadar size={10} />}>
          Tracking
        </Badge>
      )}
      {!online && disabled && (
        <IconWifiOff size={14} color="#aaa" />
      )}
      <Switch
        checked={online}
        onChange={(e) => handleToggle(e.currentTarget.checked)}
        size="sm"
        color="teal"
        disabled={disabled || loading}
      />
    </Group>
  );
}
