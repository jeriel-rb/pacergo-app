import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { resolveCenter } from './resolveCenter';
import type { Coords } from './types';

export function useLocationCenter() {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        if (active) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        // keep null -> fallback handles it
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return resolveCenter(coords);
}
