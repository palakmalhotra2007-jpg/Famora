import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { useFamilyStore } from '../store';
import { updateMyLocation } from '../services/family.service';

const REFRESH_MS = 5 * 60 * 1000;

async function resolvePlaceName(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = results[0];
    if (!place) return undefined;
    const parts = [place.city, place.region, place.country].filter(Boolean);
    return parts.join(', ') || undefined;
  } catch {
    return undefined;
  }
}

export function useLocationSharing(sharingEnabled: boolean): {
  refreshLocation: () => Promise<void>;
} {
  const familyId = useFamilyStore((s) => s.currentFamily?.id);
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);

  const refreshLocation = useCallback(async () => {
    if (!familyId || !sharingEnabled || runningRef.current) return;
    runningRef.current = true;

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) return;
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude, accuracy } = position.coords;
                const locationName = await resolvePlaceName(latitude, longitude);
                await updateMyLocation(familyId, {
                  latitude,
                  longitude,
                  accuracy: accuracy ?? undefined,
                  locationName,
                });
                await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
                await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
          );
        });
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = position.coords;
      const locationName = await resolvePlaceName(latitude, longitude);

      await updateMyLocation(familyId, {
        latitude,
        longitude,
        accuracy: accuracy ?? undefined,
        locationName,
      });

      await queryClient.invalidateQueries({ queryKey: ['memberLocations', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['home', familyId] });
    } catch {
      // Permission denied or transient GPS errors — fail quietly
    } finally {
      runningRef.current = false;
    }
  }, [familyId, sharingEnabled, queryClient]);

  useEffect(() => {
    if (!familyId || !sharingEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    void refreshLocation();

    intervalRef.current = setInterval(() => {
      void refreshLocation();
    }, REFRESH_MS);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshLocation();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [familyId, sharingEnabled, refreshLocation]);

  return { refreshLocation };
}
