import { describe, expect, it } from 'vitest';
import { normalizeSupabaseProjectUrl } from '../supabase-client';

describe('normalizeSupabaseProjectUrl', () => {
  it('normalizes Supabase service URLs to the project origin', () => {
    expect(
      normalizeSupabaseProjectUrl('https://project-ref.supabase.co/auth/v1'),
    ).toBe('https://project-ref.supabase.co');
    expect(
      normalizeSupabaseProjectUrl('https://project-ref.supabase.co/rest/v1'),
    ).toBe('https://project-ref.supabase.co');
  });
});
