create extension if not exists pgcrypto;

create type public.case_status as enum ('draft', 'processing', 'completed', 'failed');
create type public.evidence_status as enum ('uploaded', 'processing', 'completed', 'failed', 'deleted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(120) not null check (char_length(trim(title)) > 0),
  chronology text not null default '',
  status public.case_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 char(64),
  status public.evidence_status not null default 'uploaded',
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  deleted_at timestamptz
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null unique references public.evidence(id) on delete cascade,
  extracted_text text,
  summary text,
  confidence numeric(5,4) check (confidence between 0 and 1),
  model_name text,
  created_at timestamptz not null default now()
);

create table public.safe_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  address text,
  phone text,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index cases_user_id_idx on public.cases(user_id);
create index evidence_case_id_idx on public.evidence(case_id);
create index evidence_expiry_idx on public.evidence(expires_at) where deleted_at is null;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cases_touch_updated_at
before update on public.cases
for each row execute function public.touch_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
