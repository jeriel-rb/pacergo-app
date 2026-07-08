import type { ActivitySlug } from '../enums/activity';

/**
 * Per-activity display metadata. `icon` is a lucide icon name; the UI layer maps
 * it to a concrete icon component (web) or vector (native).
 */
export const ACTIVITY_META: Record<
  ActivitySlug,
  { icon: string; zh: string; en: string }
> = {
  gym: { icon: 'dumbbell', zh: '健身', en: 'Gym' },
  running: { icon: 'footprints', zh: '陪跑', en: 'Running' },
  hiking: { icon: 'mountain', zh: '陪爬', en: 'Hiking' },
  hyrox: { icon: 'timer', zh: 'Hyrox', en: 'Hyrox' },
  cycling: { icon: 'bike', zh: '騎車', en: 'Cycling' },
  yoga: { icon: 'flower', zh: '瑜珈', en: 'Yoga' },
  swimming: { icon: 'waves', zh: '游泳', en: 'Swimming' },
  boxing: { icon: 'shield', zh: '拳擊', en: 'Boxing' },
  basketball: { icon: 'circle', zh: '籃球', en: 'Basketball' },
};
