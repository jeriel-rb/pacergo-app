-- Track whether a user finished the seeker onboarding wizard.
alter table profiles
  add column if not exists onboarding_completed boolean not null default false;
