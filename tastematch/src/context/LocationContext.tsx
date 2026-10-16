/**
 * src/context/LocationContext.tsx
 * ===============================
 * Session-only LocationContext for TasteMatch.
 *
 * Rules strictly enforced:
 * - Session only: NEVER saved to localStorage/sessionStorage/cookies.
 * - Privacy: Coordinates are NEVER sent to any remote server or network request.
 * - Two-step GPS: Fast coarse position first (enableHighAccuracy: false, maxAge 5m, timeout 10s),
 *   followed by watchPosition refinement (enableHighAccuracy: true, up to 20s, stopping at <= 100m).
 * - Coverage honesty: If nearest city centre > 40 km, show honesty dialog with options:
 *   (1) browse {city}, (2) pick another city, (3) help add places here (OSM link).
 *   Never silently switch city.
 * - Permissions & Secure context: Check window.isSecureContext and navigator.permissions.
 *   Provide 2-line re-enable instructions for Chrome Android and Safari iPhone on denial.
 *   Handle error codes 1, 2, and 3 distinctly.
 * - Manual fallbacks: locality, landmark from landmarks_ng.json, or map pin.
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import type { Landmark } from '@/types/restaurant';
import { loadCountryIndex } from '@/lib/dataLoader';
import { haversineDistance } from '@/lib/location';

export const MAX_CITY_DISTANCE_KM = 40;

export type LocationSource = 'gps' | 'city-centre' | 'pin';

export interface UserLocation {
  lat: number;
  lon: number;
  accuracyM?: number;
  timestamp: number;
  source: LocationSource;
  label?: string;
}

export interface PermissionGuide {
  title: string;
  lines: string[];
}

export interface CoverageHonestyState {
  distanceKm: number;
  nearestCity: string;
  userCoords: { lat: number; lon: number };
}

export interface LocationContextValue {
  location: UserLocation | null;
  status: 'idle' | 'locating' | 'refining' | 'ready' | 'error';
  accuracyLabel: string | null;
  statusMessage: string | null;
  error: string | null;
  permissionGuide: PermissionGuide | null;
  coverageHonesty: CoverageHonestyState | null;
  requestGpsLocation: (
    countryCode?: string,
    onNearestCityFound?: (city: string) => void,
  ) => Promise<{ nearestCity?: string; distanceKm?: number } | void>;
  dismissCoverageHonesty: () => void;
  confirmCoverageHonestyCity: (city: string) => void;
  setManualPin: (lat: number, lon: number, label?: string) => void;
  setManualLandmark: (landmark: Landmark) => void;
  setManualLocality: (localityName: string, coords?: { lat: number; lon: number }) => void;
  setCityCentre: (cityName: string, coords: { lat: number; lon: number }) => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'refining' | 'ready' | 'error'>('idle');
  const [accuracyLabel, setAccuracyLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGuide, setPermissionGuide] = useState<PermissionGuide | null>(null);
  const [coverageHonesty, setCoverageHonesty] = useState<CoverageHonestyState | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const watchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const onNearestFoundRef = useRef<((city: string) => void) | null>(null);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimerRef.current) {
      clearTimeout(watchTimerRef.current);
      watchTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  const findNearestCityInCountry = async (
    lat: number,
    lon: number,
    countryCode: string = 'NG',
  ): Promise<{ city: string; distanceKm: number } | null> => {
    try {
      const countryIndex = await loadCountryIndex(countryCode);
      if (!countryIndex || !countryIndex.cities) return null;

      let nearestCity: string | null = null;
      let minDistance = Infinity;

      for (const [cityName, cityData] of Object.entries(countryIndex.cities)) {
        if (cityData.centroid) {
          const d = haversineDistance(
            lat,
            lon,
            cityData.centroid.latitude,
            cityData.centroid.longitude,
          );
          if (d < minDistance) {
            minDistance = d;
            nearestCity = cityName;
          }
        }
      }

      if (nearestCity && minDistance !== Infinity) {
        return { city: nearestCity, distanceKm: minDistance };
      }
      return null;
    } catch (err) {
      console.warn('Failed to load country index for proximity lookup:', err);
      return null;
    }
  };

  const handleGeoError = useCallback(
    (err: GeolocationPositionError) => {
      stopWatching();
      setStatus('error');
      setAccuracyLabel(null);

      if (err.code === 1) {
        // PERMISSION_DENIED
        setError('Location permission denied.');
        setPermissionGuide({
          title: 'How to re-enable location in your browser:',
          lines: [
            'Chrome (Android): Tap 🔒 or ℹ️ left of the address bar → Permissions → Location → Allow.',
            'Safari (iPhone): Tap "aA" in the address bar → Website Settings → Location → Allow (or Settings → Safari → Location).',
          ],
        });
        setStatusMessage('Location permission denied. Please pick a location manually.');
      } else if (err.code === 2) {
        // POSITION_UNAVAILABLE
        setError('GPS position unavailable. Check your device location and network settings.');
        setPermissionGuide(null);
        setStatusMessage('GPS position unavailable. Please pick a location manually.');
      } else if (err.code === 3) {
        // TIMEOUT
        setError('Location request timed out. Please try again or pick a location manually.');
        setPermissionGuide(null);
        setStatusMessage('Location request timed out. Please try again or pick a location manually.');
      } else {
        setError(err.message || 'Could not retrieve location.');
        setPermissionGuide(null);
        setStatusMessage('Could not retrieve location.');
      }
    },
    [stopWatching],
  );

  const requestGpsLocation = useCallback(
    async (
      countryCode: string = 'NG',
      onNearestCityFound?: (city: string) => void,
    ): Promise<{ nearestCity?: string; distanceKm?: number } | void> => {
      // 1. Check secure context (HTTPS or localhost)
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        setError('Location access requires a secure connection (HTTPS or localhost).');
        setStatus('error');
        setStatusMessage('Location access requires HTTPS.');
        setPermissionGuide(null);
        return;
      }

      // 2. Check geolocation API support
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        setStatus('error');
        setStatusMessage('Geolocation unsupported.');
        setPermissionGuide(null);
        return;
      }

      stopWatching();
      setError(null);
      setPermissionGuide(null);
      setCoverageHonesty(null);
      setStatus('locating');
      setStatusMessage('Finding your location...');
      onNearestFoundRef.current = onNearestCityFound || null;

      // 3. Permissions API check if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (perm.state === 'denied') {
            setError('Location permission denied.');
            setPermissionGuide({
              title: 'How to re-enable location in your browser:',
              lines: [
                'Chrome (Android): Tap 🔒 or ℹ️ left of the address bar → Permissions → Location → Allow.',
                'Safari (iPhone): Tap "aA" in the address bar → Website Settings → Location → Allow (or Settings → Safari → Location).',
              ],
            });
            setStatus('error');
            setStatusMessage('Location permission denied.');
            return;
          }
        } catch {
          // Permissions API query not supported for geolocation in some environments, ignore
        }
      }

      // 4. Step 1: Fast coarse position (enableHighAccuracy: false, maxAge: 5min, timeout: 10s)
      return new Promise<{ nearestCity?: string; distanceKm?: number } | void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (coarsePos) => {
            const { latitude, longitude, accuracy } = coarsePos.coords;
            const coarseAcc = Math.round(accuracy);
            const accText = `Accurate to about ${coarseAcc} m`;
            setAccuracyLabel(accText);

            // Save session-only location in React memory
            const userLoc: UserLocation = {
              lat: latitude,
              lon: longitude,
              accuracyM: accuracy,
              timestamp: coarsePos.timestamp || Date.now(),
              source: 'gps',
            };
            setLocation(userLoc);

            // Lookup nearest city in country index centroids
            const nearest = await findNearestCityInCountry(latitude, longitude, countryCode);

            if (nearest) {
              if (nearest.distanceKm > MAX_CITY_DISTANCE_KM) {
                // Coverage honesty: do NOT silently switch city!
                setCoverageHonesty({
                  distanceKm: nearest.distanceKm,
                  nearestCity: nearest.city,
                  userCoords: { lat: latitude, lon: longitude },
                });
              } else {
                if (onNearestFoundRef.current) {
                  onNearestFoundRef.current(nearest.city);
                }
              }
            }

            // If coarse accuracy is already high (<= 100m), we are done
            if (accuracy <= 100) {
              setStatus('ready');
              setStatusMessage(accText);
              resolve(nearest ? { nearestCity: nearest.city, distanceKm: nearest.distanceKm } : undefined);
              return;
            }

            // Step 2: Refine with watchPosition (enableHighAccuracy: true, up to 20s, stopping <= 100m)
            setStatus('refining');
            setStatusMessage(`${accText} (Refining...)`);

            // 20s fallback to stop refinement
            watchTimerRef.current = setTimeout(() => {
              stopWatching();
              setStatus('ready');
              setStatusMessage(accText);
            }, 20000);

            try {
              watchIdRef.current = navigator.geolocation.watchPosition(
                (refinedPos) => {
                  const rLat = refinedPos.coords.latitude;
                  const rLon = refinedPos.coords.longitude;
                  const rAcc = refinedPos.coords.accuracy;
                  const rAccRounded = Math.round(rAcc);
                  const rAccText = `Accurate to about ${rAccRounded} m`;

                  setAccuracyLabel(rAccText);
                  setLocation({
                    lat: rLat,
                    lon: rLon,
                    accuracyM: rAcc,
                    timestamp: refinedPos.timestamp || Date.now(),
                    source: 'gps',
                  });

                  if (rAcc <= 100) {
                    stopWatching();
                    setStatus('ready');
                    setStatusMessage(rAccText);
                  } else {
                    setStatusMessage(`${rAccText} (Refining...)`);
                  }
                },
                (watchErr) => {
                  console.warn('Geolocation refinement watch error:', watchErr);
                  // Keep coarse fix if refinement fails
                  stopWatching();
                  setStatus('ready');
                  setStatusMessage(accText);
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
              );
            } catch (err) {
              console.warn('Could not start watchPosition:', err);
              stopWatching();
              setStatus('ready');
            }

            resolve(nearest ? { nearestCity: nearest.city, distanceKm: nearest.distanceKm } : undefined);
          },
          (err) => {
            handleGeoError(err);
            resolve();
          },
          { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
        );
      });
    },
    [handleGeoError, stopWatching],
  );

  const dismissCoverageHonesty = useCallback(() => {
    setCoverageHonesty(null);
  }, []);

  const confirmCoverageHonestyCity = useCallback(
    (city: string) => {
      setCoverageHonesty(null);
      if (onNearestFoundRef.current) {
        onNearestFoundRef.current(city);
      }
    },
    [],
  );

  // Manual Fallback 1: Set dropped pin on map
  const setManualPin = useCallback((lat: number, lon: number, label?: string) => {
    stopWatching();
    setLocation({
      lat,
      lon,
      accuracyM: 10,
      timestamp: Date.now(),
      source: 'pin',
      label: label || 'Dropped pin',
    });
    setStatus('ready');
    setStatusMessage('Location set from dropped pin');
    setAccuracyLabel('Pin point');
    setError(null);
    setPermissionGuide(null);
    setCoverageHonesty(null);
  }, [stopWatching]);

  // Manual Fallback 2: Set landmark from landmarks_ng.json
  const setManualLandmark = useCallback((landmark: Landmark) => {
    stopWatching();
    setLocation({
      lat: landmark.latitude,
      lon: landmark.longitude,
      accuracyM: 50,
      timestamp: Date.now(),
      source: 'pin',
      label: landmark.name,
    });
    setStatus('ready');
    setStatusMessage(`Location set to landmark: ${landmark.name}`);
    setAccuracyLabel(`Landmark (${landmark.name})`);
    setError(null);
    setPermissionGuide(null);
    setCoverageHonesty(null);
  }, [stopWatching]);

  // Manual Fallback 3: Set locality / neighbourhood
  const setManualLocality = useCallback((localityName: string, coords?: { lat: number; lon: number }) => {
    stopWatching();
    if (coords) {
      setLocation({
        lat: coords.lat,
        lon: coords.lon,
        accuracyM: 1000,
        timestamp: Date.now(),
        source: 'pin',
        label: localityName,
      });
      setStatus('ready');
      setStatusMessage(`Location set to area: ${localityName}`);
      setAccuracyLabel(`Area (${localityName})`);
    }
    setError(null);
    setPermissionGuide(null);
    setCoverageHonesty(null);
  }, [stopWatching]);

  // Manual Fallback 4: Set city centre
  const setCityCentre = useCallback((cityName: string, coords: { lat: number; lon: number }) => {
    stopWatching();
    setLocation({
      lat: coords.lat,
      lon: coords.lon,
      accuracyM: 5000,
      timestamp: Date.now(),
      source: 'city-centre',
      label: `${cityName} City Centre`,
    });
    setStatus('ready');
    setStatusMessage(`Distance measured from ${cityName} city centre`);
    setAccuracyLabel(`${cityName} city centre`);
    setError(null);
    setPermissionGuide(null);
    setCoverageHonesty(null);
  }, [stopWatching]);

  const clearLocation = useCallback(() => {
    stopWatching();
    setLocation(null);
    setStatus('idle');
    setAccuracyLabel(null);
    setStatusMessage(null);
    setError(null);
    setPermissionGuide(null);
    setCoverageHonesty(null);
  }, [stopWatching]);

  return (
    <LocationContext.Provider
      value={{
        location,
        status,
        accuracyLabel,
        statusMessage,
        error,
        permissionGuide,
        coverageHonesty,
        requestGpsLocation,
        dismissCoverageHonesty,
        confirmCoverageHonestyCity,
        setManualPin,
        setManualLandmark,
        setManualLocality,
        setCityCentre,
        clearLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return ctx;
}
