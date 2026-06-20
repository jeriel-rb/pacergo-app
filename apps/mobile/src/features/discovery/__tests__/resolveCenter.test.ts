import { resolveCenter, TAIPEI } from '../resolveCenter';

describe('resolveCenter', () => {
  it('uses device coords when available', () => {
    expect(resolveCenter({ lat: 25.1, lng: 121.5 })).toEqual({ lat: 25.1, lng: 121.5 });
  });

  it('falls back to Taipei when coords are null', () => {
    expect(resolveCenter(null)).toEqual(TAIPEI);
  });
});
