import { buildNearbyParams } from '../buildNearbyParams';

describe('buildNearbyParams', () => {
  const center = { lat: 25.04, lng: 121.56 };

  it('maps center + radius and omits null filters', () => {
    expect(
      buildNearbyParams(center, { activitySlug: null, tier: null, maxPrice: null, radiusM: 20000 })
    ).toEqual({
      center_lat: 25.04,
      center_lng: 121.56,
      radius_m: 20000,
      filter_activity: null,
      filter_tier: null,
      max_price: null,
    });
  });

  it('passes through active filters', () => {
    const params = buildNearbyParams(center, {
      activitySlug: 'gym',
      tier: 'A',
      maxPrice: 1200,
      radiusM: 5000,
    });
    expect(params.filter_activity).toBe('gym');
    expect(params.filter_tier).toBe('A');
    expect(params.max_price).toBe(1200);
    expect(params.radius_m).toBe(5000);
  });
});
