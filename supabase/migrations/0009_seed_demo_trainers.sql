-- Demo trainer data so the apps show real content before live signups exist.
-- Idempotent: clears prior demo rows, then recreates auth users (trigger makes
-- profiles), companion listings, offerings, and availability.
--
-- These six match the home-screen designs. Demo users have no password and are
-- not meant to log in — they exist only as discoverable trainer profiles.

do $$
declare
  ids uuid[] := array[
    'a0000000-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000004',
    'a0000000-0000-4000-8000-000000000005',
    'a0000000-0000-4000-8000-000000000006'
  ]::uuid[];
begin
  delete from listing_offerings
    where listing_id in (select id from companion_listings where profile_id = any (ids));
  delete from availability where profile_id = any (ids);
  delete from companion_listings where profile_id = any (ids);
end $$;

-- Auth users (the on_auth_user_created trigger creates matching profiles rows).
insert into auth.users
  (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000001','authenticated','authenticated','wang.jianhong@demo.pacergo.app','{"provider":"email","providers":["email"]}','{"full_name":"王建宏"}',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000002','authenticated','authenticated','li.yating@demo.pacergo.app','{"provider":"email","providers":["email"]}','{"full_name":"李雅婷"}',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000003','authenticated','authenticated','zhang.weicheng@demo.pacergo.app','{"provider":"email","providers":["email"]}','{"full_name":"張偉誠"}',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000004','authenticated','authenticated','chen.yijun@demo.pacergo.app','{"provider":"email","providers":["email"]}','{"full_name":"陳怡君"}',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000005','authenticated','authenticated','lin.junjie@demo.pacergo.app','{"provider":"email","providers":["email"]}','{"full_name":"林俊傑"}',now(),now(),now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000006','authenticated','authenticated','wu.yizhen@demo.pacergo.app','{"provider":"email","providers":["email"]}','{"full_name":"吳宜蓁"}',now(),now(),now())
on conflict (id) do nothing;

-- Profile details (display_name/photo come from the trigger; fill the rest).
update profiles set home_area='台北市信義區', experience_level='intermediate', is_companion=true,
  bio='熱愛重訓與生活的陽光搭子，擅長帶新手建立運動習慣，用輕鬆的方式陪你一起變強。',
  location=ST_SetSRID(ST_MakePoint(121.5705, 25.0330), 4326)::geography
  where id='a0000000-0000-4000-8000-000000000001';
update profiles set home_area='台北市中山區', experience_level='advanced', is_companion=true,
  bio='資深體能訓練師，專長體態雕塑與有氧耐力，陪你跑出第一個十公里。',
  location=ST_SetSRID(ST_MakePoint(121.5265, 25.0640), 4326)::geography
  where id='a0000000-0000-4000-8000-000000000002';
update profiles set home_area='台北市大安區', experience_level='advanced', is_companion=true,
  bio='社群頂流教練，十二年訓練經驗，專精功能性訓練與戶外體能，帶你突破極限。',
  location=ST_SetSRID(ST_MakePoint(121.5436, 25.0265), 4326)::geography
  where id='a0000000-0000-4000-8000-000000000003';
update profiles set home_area='台北市萬華區', experience_level='beginner', is_companion=true,
  bio='親切有耐心的陽光搭子，喜歡和大家一起運動，特別擅長陪伴重訓新手。',
  location=ST_SetSRID(ST_MakePoint(121.4997, 25.0375), 4326)::geography
  where id='a0000000-0000-4000-8000-000000000004';
update profiles set home_area='台北市松山區', experience_level='advanced', is_companion=true,
  bio='資深登山嚮導，走遍台灣百岳，帶你安全地享受山林與體能挑戰。',
  location=ST_SetSRID(ST_MakePoint(121.5577, 25.0500), 4326)::geography
  where id='a0000000-0000-4000-8000-000000000005';
update profiles set home_area='台北市文山區', experience_level='intermediate', is_companion=true,
  bio='愛跑步也愛爬山的陽光搭子，週末約你一起動起來，邊運動邊聊天最快樂。',
  location=ST_SetSRID(ST_MakePoint(121.5705, 24.9890), 4326)::geography
  where id='a0000000-0000-4000-8000-000000000006';

-- Companion listings (active so they show in discovery).
insert into companion_listings (profile_id, headline, bio_long, served_area, status, rating_avg, rating_count)
values
  ('a0000000-0000-4000-8000-000000000001','陽光重訓搭子','陪你建立運動習慣','台北市信義區','active',4.9,42),
  ('a0000000-0000-4000-8000-000000000002','體態雕塑與耐力','重訓與跑步','台北市中山區','active',4.8,88),
  ('a0000000-0000-4000-8000-000000000003','功能性訓練專家','突破你的極限','台北市大安區','active',5.0,156),
  ('a0000000-0000-4000-8000-000000000004','新手友善陪練','一起開始運動','台北市萬華區','active',4.6,27),
  ('a0000000-0000-4000-8000-000000000005','百岳登山嚮導','安全享受山林','台北市松山區','active',4.8,64),
  ('a0000000-0000-4000-8000-000000000006','跑步爬山搭子','週末一起動起來','台北市文山區','active',4.5,19)
on conflict (profile_id) do update set
  status=excluded.status, rating_avg=excluded.rating_avg, rating_count=excluded.rating_count;

-- Offerings (activity + tier + price per listing).
insert into listing_offerings (listing_id, activity_id, tier, price_ntd, is_free, session_minutes)
select l.id, a.id, v.tier::tier_level, v.price, false, v.mins
from (values
  ('a0000000-0000-4000-8000-000000000001','gym','C',650,60),
  ('a0000000-0000-4000-8000-000000000002','gym','B',1000,60),
  ('a0000000-0000-4000-8000-000000000002','running','B',900,60),
  ('a0000000-0000-4000-8000-000000000003','gym','A',1800,60),
  ('a0000000-0000-4000-8000-000000000003','hiking','A',1600,90),
  ('a0000000-0000-4000-8000-000000000004','gym','C',650,60),
  ('a0000000-0000-4000-8000-000000000005','hiking','B',900,120),
  ('a0000000-0000-4000-8000-000000000006','running','C',700,60),
  ('a0000000-0000-4000-8000-000000000006','hiking','C',700,120)
) as v(profile_id, slug, tier, price, mins)
join companion_listings l on l.profile_id = v.profile_id::uuid
join activities a on a.slug = v.slug;

-- Weekly availability slots (minutes from midnight).
insert into availability (profile_id, weekday, start_minute, end_minute)
values
  ('a0000000-0000-4000-8000-000000000001',2,1080,1320),
  ('a0000000-0000-4000-8000-000000000001',4,1080,1320),
  ('a0000000-0000-4000-8000-000000000001',6,540,1020),
  ('a0000000-0000-4000-8000-000000000002',1,600,1200),
  ('a0000000-0000-4000-8000-000000000002',3,600,1200),
  ('a0000000-0000-4000-8000-000000000003',1,540,1080),
  ('a0000000-0000-4000-8000-000000000003',3,540,1080),
  ('a0000000-0000-4000-8000-000000000003',5,840,1260),
  ('a0000000-0000-4000-8000-000000000004',2,1140,1320),
  ('a0000000-0000-4000-8000-000000000004',6,600,960),
  ('a0000000-0000-4000-8000-000000000005',0,360,840),
  ('a0000000-0000-4000-8000-000000000005',6,360,840),
  ('a0000000-0000-4000-8000-000000000006',6,420,720),
  ('a0000000-0000-4000-8000-000000000006',0,420,720);
