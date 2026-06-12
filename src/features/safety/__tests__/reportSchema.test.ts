import { reportSchema, reportReasons } from '../reportSchema';

describe('reportSchema', () => {
  it('lists the supported reasons', () => {
    expect(reportReasons).toContain('harassment');
  });

  it('accepts a valid report', () => {
    expect(reportSchema.safeParse({ reason: 'spam', details: 'bot' }).success).toBe(true);
  });

  it('rejects an unknown reason', () => {
    expect(reportSchema.safeParse({ reason: 'nope', details: '' }).success).toBe(false);
  });
});
