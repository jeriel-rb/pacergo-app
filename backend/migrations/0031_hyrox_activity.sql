-- Hyrox becomes a bookable activity (per Aerion's feedback — functional
-- performance isn't just an AI-menu goal, trainers offer it as a service).
-- Also flip running + hiking to active: the web studio and discovery filters
-- already treat them as live offerings, only the seed flag lagged behind.

insert into activities (slug, name_en, name_zh, icon, is_active)
values ('hyrox', 'Hyrox', 'Hyrox', 'timer', true)
on conflict (slug) do update set is_active = true;

update activities set is_active = true where slug in ('running', 'hiking');
