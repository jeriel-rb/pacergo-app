-- Activities catalog: bookable activity taxonomy for discovery and AI plan goals.
-- Idempotent via ON CONFLICT (slug) DO UPDATE.

insert into activities (slug, name_en, name_zh, icon, is_active) values
  ('gym',        'Gym / Strength', '健身 / 重訓', 'dumbbell', true),
  ('walking',    'Walking',        '健走',        'person-standing', true),
  ('running',    'Running',        '跑步',        'footprints', true),
  ('hiking',     'Hiking',         '登山健行',     'mountain', true),
  ('cycling',    'Cycling',        '騎車',        'bike', false),
  ('yoga',       'Yoga',           '瑜珈',        'flower', false),
  ('swimming',   'Swimming',       '游泳',        'waves', false),
  ('boxing',     'Boxing / Martial Arts', '拳擊 / 武術', 'shield', false),
  ('basketball', 'Basketball',     '籃球',        'circle', false),
  ('hyrox',      'Hyrox',          'Hyrox',       'timer', true)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_zh = excluded.name_zh,
  icon = excluded.icon,
  is_active = excluded.is_active;
