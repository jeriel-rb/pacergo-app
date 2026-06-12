import MapView, { Marker } from 'react-native-maps';
import type { Coords, NearbyCompanion } from '@/features/discovery/types';

export function CompanionMap({
  center,
  companions,
  onSelect,
}: {
  center: Coords;
  companions: NearbyCompanion[];
  onSelect: (id: string) => void;
}) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {companions
        .filter((c) => Number.isFinite(c.distance_m))
        .map((c) => (
          <Marker
            key={`${c.companion_id}-${c.activity_slug}`}
            // Privacy: the RPC returns distance, not coordinates. Markers center
            // on the user until a privacy-preserving jittered point is added.
            coordinate={{ latitude: center.lat, longitude: center.lng }}
            title={c.display_name ?? ''}
            description={c.activity_slug}
            onPress={() => onSelect(c.companion_id)}
          />
        ))}
    </MapView>
  );
}
