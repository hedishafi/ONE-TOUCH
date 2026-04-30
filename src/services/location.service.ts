/**
 * Location Service
 * Handles real-time location tracking for providers
 * Manages geolocation API and location updates
 */

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
}

export interface LocationError {
  code: number;
  message: string;
}

type LocationCallback = (location: LocationUpdate) => void;
type ErrorCallback = (error: LocationError) => void;

class LocationService {
  private watchId: number | null = null;
  private callbacks: LocationCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private lastLocation: LocationUpdate | null = null;
  private isTracking = false;

  /**
   * Start tracking location
   */
  startTracking(options?: PositionOptions): void {
    if (this.isTracking) {
      console.warn('⚠️ Location tracking already started');
      return;
    }

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported by browser');
      this.handleError({
        code: 0,
        message: 'Geolocation not supported by browser',
      });
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    };

    console.log('🚀 Starting location tracking with options:', defaultOptions);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleGeolocationError(error),
      defaultOptions
    );

    this.isTracking = true;
    console.log('✅ Location tracking started, watchId:', this.watchId);
  }

  /**
   * Stop tracking location
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
      console.log('📍 Location tracking stopped');
    }
  }

  /**
   * Get current location once
   */
  async getCurrentLocation(options?: PositionOptions): Promise<LocationUpdate> {
    console.log('🔍 Getting current location...');
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        reject({
          code: 0,
          message: 'Geolocation not supported by browser',
        });
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
        ...options,
      };

      console.log('📡 Requesting location with options:', defaultOptions);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.positionToLocationUpdate(position);
          console.log('✅ Current location received:', {
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy,
          });
          resolve(location);
        },
        (error) => {
          console.error('❌ Location error:', error);
          reject(this.geolocationErrorToLocationError(error));
        },
        defaultOptions
      );
    });
  }

  /**
   * Subscribe to location updates
   */
  subscribe(callback: LocationCallback): () => void {
    this.callbacks.push(callback);
    
    // Send last known location immediately if available
    if (this.lastLocation) {
      callback(this.lastLocation);
    }
    
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Subscribe to location errors
   */
  subscribeToErrors(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get last known location
   */
  getLastLocation(): LocationUpdate | null {
    return this.lastLocation;
  }

  /**
   * Check if tracking is active
   */
  isTrackingActive(): boolean {
    return this.isTracking;
  }

  /**
   * Handle position update
   */
  private handlePosition(position: GeolocationPosition): void {
    const location = this.positionToLocationUpdate(position);
    this.lastLocation = location;
    
    console.log('📍 New location:', {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy,
      timestamp: new Date(location.timestamp).toLocaleTimeString(),
    });
    
    // Notify all subscribers
    this.callbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('❌ Error in location callback:', error);
      }
    });
  }

  /**
   * Handle geolocation error
   */
  private handleGeolocationError(error: GeolocationPositionError): void {
    const locationError = this.geolocationErrorToLocationError(error);
    this.handleError(locationError);
  }

  /**
   * Handle error
   */
  private handleError(error: LocationError): void {
    console.error('Location error:', error);
    
    // Notify error subscribers
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in error callback:', err);
      }
    });
  }

  /**
   * Convert GeolocationPosition to LocationUpdate
   */
  private positionToLocationUpdate(position: GeolocationPosition): LocationUpdate {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      speed: position.coords.speed,
      heading: position.coords.heading,
    };
  }

  /**
   * Convert GeolocationPositionError to LocationError
   */
  private geolocationErrorToLocationError(error: GeolocationPositionError): LocationError {
    const messages: Record<number, string> = {
      1: 'Location permission denied. Please enable location access.',
      2: 'Location unavailable. Please check your device settings.',
      3: 'Location request timed out. Please try again.',
    };

    return {
      code: error.code,
      message: messages[error.code] || 'Unknown location error',
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();

/**
 * Calculate distance between two locations in meters
 */
export function calculateDistance(
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
): number {
  const R = 6371000; // Earth radius in meters
  const lat1 = (loc1.latitude * Math.PI) / 180;
  const lat2 = (loc2.latitude * Math.PI) / 180;
  const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if location has changed significantly
 */
export function hasLocationChanged(
  oldLocation: LocationUpdate | null,
  newLocation: LocationUpdate,
  thresholdMeters = 10
): boolean {
  if (!oldLocation) return true;
  
  const distance = calculateDistance(
    { latitude: oldLocation.latitude, longitude: oldLocation.longitude },
    { latitude: newLocation.latitude, longitude: newLocation.longitude }
  );
  
  return distance >= thresholdMeters;
}
