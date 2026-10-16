import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { LocationProvider, useLocationContext, MAX_CITY_DISTANCE_KM } from '@/context/LocationContext';

// Mock loadCountryIndex so we test deterministic city distances
vi.mock('@/lib/dataLoader', async () => {
  const actual = await vi.importActual<typeof import('@/lib/dataLoader')>('@/lib/dataLoader');
  return {
    ...actual,
    loadCountryIndex: vi.fn().mockImplementation(async (code: string) => {
      if (code === 'NG') {
        return {
          country: 'Nigeria',
          code: 'NG',
          cities: {
            Lagos: {
              count: 200,
              centroid: { latitude: 6.5244, longitude: 3.3792 },
              bounds: { minLatitude: 6.4, maxLatitude: 6.7, minLongitude: 3.2, maxLongitude: 3.6 },
              radiusKm: 25,
              hasPrices: false,
              hasRatings: false,
              hasBooking: false,
              hasDelivery: false,
              hasHours: true,
              shards: ['lagos-1.json'],
            },
            Abuja: {
              count: 130,
              centroid: { latitude: 9.0765, longitude: 7.3986 },
              bounds: { minLatitude: 8.9, maxLatitude: 9.2, minLongitude: 7.2, maxLongitude: 7.6 },
              radiusKm: 20,
              hasPrices: false,
              hasRatings: false,
              hasBooking: false,
              hasDelivery: false,
              hasHours: true,
              shards: ['abuja-1.json'],
            },
          },
        };
      }
      return { country: code, code, cities: {} };
    }),
  };
});

describe('Problem 2: GPS Location Intelligence, Two-Step Fix & Privacy', () => {
  let originalGeolocation: Geolocation;
  let originalIsSecureContext: boolean;
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;
  let mockWatchPosition: ReturnType<typeof vi.fn>;
  let mockClearWatch: ReturnType<typeof vi.fn>;

  let localStore: Record<string, string> = {};
  let sessionStore: Record<string, string> = {};

  beforeEach(() => {
    localStore = {};
    sessionStore = {};
    
    const mockStorage = (store: Record<string, string>) => ({
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    });

    Object.defineProperty(window, 'localStorage', {
      value: mockStorage(localStore),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage(sessionStore),
      writable: true,
      configurable: true,
    });

    vi.clearAllMocks();

    originalIsSecureContext = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });

    originalGeolocation = navigator.geolocation;
    mockGetCurrentPosition = vi.fn();
    mockWatchPosition = vi.fn();
    mockClearWatch = vi.fn();

    const mockGeo = {
      getCurrentPosition: mockGetCurrentPosition,
      watchPosition: mockWatchPosition,
      clearWatch: mockClearWatch,
    };

    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeo,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'isSecureContext', {
      value: originalIsSecureContext,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
  });

  it('1. Rejects location request with informative error when window.isSecureContext is false', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      writable: true,
      configurable: true,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await act(async () => {
      await result.current.requestGpsLocation('NG');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('secure connection (HTTPS or localhost)');
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  it('2. Successfully resolves immediately when coarse position has high accuracy (<= 100m)', async () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 6.525,
          longitude: 3.38,
          accuracy: 45, // <= 100m
        },
        timestamp: 1000,
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    let detectedCity: string | null = null;
    await act(async () => {
      await result.current.requestGpsLocation('NG', (city) => {
        detectedCity = city;
      });
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.location?.source).toBe('gps');
    expect(result.current.location?.accuracyM).toBe(45);
    expect(detectedCity).toBe('Lagos');
    // watchPosition should not be needed because accuracy <= 100m
    expect(mockWatchPosition).not.toHaveBeenCalled();
  });

  it('3. Two-step fix: starts with coarse 800m fix, refines to <= 100m via watchPosition', async () => {
    let watchSuccessCallback: ((pos: any) => void) | null = null;

    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 6.525,
          longitude: 3.38,
          accuracy: 800, // Coarse fix > 100m
        },
        timestamp: 1000,
      });
    });

    mockWatchPosition.mockImplementation((success) => {
      watchSuccessCallback = success;
      return 12345; // watch ID
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await act(async () => {
      result.current.requestGpsLocation('NG');
    });

    // Step 1: coarse position active and refining
    expect(result.current.status).toBe('refining');
    expect(result.current.accuracyLabel).toContain('800 m');
    expect(result.current.statusMessage).toContain('Refining...');
    expect(mockWatchPosition).toHaveBeenCalled();

    // Step 2: watchPosition emits refined position
    act(() => {
      if (watchSuccessCallback) {
        watchSuccessCallback({
          coords: {
            latitude: 6.5245,
            longitude: 3.3795,
            accuracy: 65, // <= 100m
          },
          timestamp: 2000,
        });
      }
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.location?.accuracyM).toBe(65);
    expect(result.current.accuracyLabel).toContain('65 m');
    expect(mockClearWatch).toHaveBeenCalledWith(12345);
  });

  it('4. Handles permission denied (code 1) with Chrome and Safari re-enable instructions', async () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 1, // PERMISSION_DENIED
        message: 'User denied Geolocation',
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await act(async () => {
      await result.current.requestGpsLocation('NG');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Location permission denied.');
    expect(result.current.permissionGuide).not.toBeNull();
    expect(result.current.permissionGuide?.lines.some((l) => l.includes('Chrome'))).toBe(true);
    expect(result.current.permissionGuide?.lines.some((l) => l.includes('Safari'))).toBe(true);
  });

  it('5. Handles GPS timeout (code 3) with distinct timeout message', async () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 3, // TIMEOUT
        message: 'Timeout expired',
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await act(async () => {
      await result.current.requestGpsLocation('NG');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('timed out');
  });

  it('6. Handles position unavailable (code 2) with distinct unavailable message', async () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await act(async () => {
      await result.current.requestGpsLocation('NG');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('GPS position unavailable');
  });

  it('7. Enforces 40 km Coverage Honesty: does NOT silently switch city when user is 120 km away', async () => {
    // User is far from both Lagos (6.52, 3.38) and Abuja (9.07, 7.40)
    // Coords at (7.8, 5.0) ~ 190 km from Lagos and ~ 300 km from Abuja
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 7.8,
          longitude: 5.0,
          accuracy: 50,
        },
        timestamp: 1000,
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    let switchedCity: string | null = null;
    await act(async () => {
      await result.current.requestGpsLocation('NG', (city) => {
        switchedCity = city;
      });
    });

    // Crucial: Must NOT silently switch city!
    expect(switchedCity).toBeNull();
    expect(result.current.coverageHonesty).not.toBeNull();
    expect(result.current.coverageHonesty!.distanceKm).toBeGreaterThan(MAX_CITY_DISTANCE_KM);
    expect(result.current.coverageHonesty!.nearestCity).toBeDefined();

    // User can manually confirm browsing the nearest city
    act(() => {
      result.current.confirmCoverageHonestyCity(result.current.coverageHonesty!.nearestCity);
    });
    expect(result.current.coverageHonesty).toBeNull();
  });

  it('8. Switches city directly when user is inside a city (<= 40 km)', async () => {
    // Coordinates within 10 km of Abuja (9.0765, 7.3986)
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 9.05,
          longitude: 7.42,
          accuracy: 30,
        },
        timestamp: 1000,
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    let switchedCity: string | null = null;
    await act(async () => {
      await result.current.requestGpsLocation('NG', (city) => {
        switchedCity = city;
      });
    });

    expect(switchedCity).toBe('Abuja');
    expect(result.current.coverageHonesty).toBeNull();
    expect(result.current.location?.source).toBe('gps');
  });

  it('9. Manual fallbacks: supports pin, landmark, locality, and city-centre', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    // Set dropped pin
    act(() => {
      result.current.setManualPin(6.5, 3.4, 'My Pin');
    });
    expect(result.current.location?.source).toBe('pin');
    expect(result.current.location?.lat).toBe(6.5);
    expect(result.current.location?.lon).toBe(3.4);

    // Set landmark
    act(() => {
      result.current.setManualLandmark({
        uid: 'lm:1',
        name: 'Murtala Muhammed Airport',
        category: 'airport',
        city: 'Lagos',
        latitude: 6.5774,
        longitude: 3.3211,
      });
    });
    expect(result.current.location?.source).toBe('pin');
    expect(result.current.location?.label).toBe('Murtala Muhammed Airport');

    // Set city centre
    act(() => {
      result.current.setCityCentre('Lagos', { lat: 6.5244, lon: 3.3792 });
    });
    expect(result.current.location?.source).toBe('city-centre');
  });

  it('10. Privacy guarantee: No coordinates or location objects are written to localStorage or transmitted over network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: {
          latitude: 6.525,
          longitude: 3.38,
          accuracy: 50,
        },
        timestamp: 1000,
      });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocationProvider>{children}</LocationProvider>
    );
    const { result } = renderHook(() => useLocationContext(), { wrapper });

    await act(async () => {
      await result.current.requestGpsLocation('NG');
    });

    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const value = localStorage.getItem(key) || '';
      expect(key).not.toContain('lat');
      expect(key).not.toContain('lon');
      expect(key).not.toContain('coords');
      expect(value).not.toContain('6.525');
      expect(value).not.toContain('3.38');
    }

    // Check sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!;
      const value = sessionStorage.getItem(key) || '';
      expect(value).not.toContain('6.525');
    }

    // Verify network calls: No call sends coordinates in body or URL query
    for (const call of fetchSpy.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toContain('6.525');
      expect(url).not.toContain('3.38');
      if (call[1]?.body) {
        const bodyStr = String(call[1].body);
        expect(bodyStr).not.toContain('6.525');
      }
    }
  });
});
