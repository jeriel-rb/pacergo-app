import type { Coords } from './types';

// Taipei Main Station — sensible default for a Taiwan-first launch.
export const TAIPEI: Coords = { lat: 25.0478, lng: 121.5319 };

export function resolveCenter(coords: Coords | null): Coords {
  return coords ?? TAIPEI;
}
