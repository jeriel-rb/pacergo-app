import { z } from 'zod';

export const reportReasons = ['inappropriate', 'harassment', 'spam', 'safety', 'other'] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().max(2000).optional().or(z.literal('')),
});
