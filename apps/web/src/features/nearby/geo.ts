/** Point at `distanceM` from (lat,lng) along `bearingRad`. Used to scatter
 *  trainer markers at their true distance but an arbitrary bearing, since the
 *  RPC never returns real coordinates (privacy). */
export function destination(
  lat: number,
  lng: number,
  distanceM: number,
  bearingRad: number,
): { lat: number; lng: number } {
  const R = 6378137; // earth radius (m)
  const d = distanceM / R;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lng * Math.PI) / 180;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(d) +
      Math.cos(phi1) * Math.sin(d) * Math.cos(bearingRad),
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(phi1),
      Math.cos(d) - Math.sin(phi1) * Math.sin(phi2),
    );

  return { lat: (phi2 * 180) / Math.PI, lng: (lambda2 * 180) / Math.PI };
}
