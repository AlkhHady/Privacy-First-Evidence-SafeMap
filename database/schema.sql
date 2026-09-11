begin;

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name varchar(100),
    created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (
        new.id,
        new.raw_user_meta_data ->> 'display_name'
    );

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.cases (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    title varchar(120) not null,

    chronology text not null default '',

    incident_date timestamptz,

    incident_location text,

    status varchar(20) not null default 'draft'
        check (
            status in (
                'draft',
                'processing',
                'completed',
                'failed'
            )
        ),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create index cases_user_id_index
on public.cases(user_id);

create table public.evidence (
    id uuid primary key default gen_random_uuid(),

    case_id uuid not null
        references public.cases(id)
        on delete cascade,

    evidence_type varchar(20) not null
        check (
            evidence_type in (
                'image',
                'audio',
                'video',
                'pdf',
                'text'
            )
        ),

    original_name varchar(255) not null,

    storage_path text unique,

    mime_type varchar(100),

    size_bytes bigint
        check (size_bytes is null or size_bytes > 0),

    file_hash char(64),

    status varchar(20) not null default 'uploaded'
        check (
            status in (
                'uploaded',
                'processing',
                'completed',
                'failed',
                'deleted'
            )
        ),

    uploaded_at timestamptz not null default now(),

    expires_at timestamptz
        default (now() + interval '24 hours'),

    deleted_at timestamptz
);

create index evidence_case_id_index
on public.evidence(case_id);

create index evidence_expires_at_index
on public.evidence(expires_at)
where deleted_at is null;

create table public.analysis_results (
    id uuid primary key default gen_random_uuid(),

    case_id uuid not null unique
        references public.cases(id)
        on delete cascade,

    combined_text text,

    summary text,

    key_points jsonb not null default '[]'::jsonb,

    confidence numeric(5,4)
        check (
            confidence is null
            or confidence between 0 and 1
        ),

    model_name varchar(100),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create index analysis_results_case_id_index
on public.analysis_results(case_id);

create table public.support_services (
    id uuid primary key default gen_random_uuid(),

    name varchar(150) not null,

    category varchar(30) not null
        check (
            category in (
                'police',
                'hospital',
                'psychologist',
                'legal_aid',
                'shelter',
                'emergency'
            )
        ),

    address text,

    city varchar(100),

    province varchar(100),

    phone varchar(30),

    whatsapp varchar(30),

    website text,

    description text,

    operating_hours varchar(100),

    latitude numeric(9,6)
        check (
            latitude is null
            or latitude between -90 and 90
        ),

    longitude numeric(9,6)
        check (
            longitude is null
            or longitude between -180 and 180
        ),

    is_verified boolean not null default false,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);

create index support_services_category_index
on public.support_services(category);

create index support_services_active_index
on public.support_services(is_active);

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger cases_update_timestamp
before update on public.cases
for each row execute procedure public.update_updated_at();

create trigger analysis_results_update_timestamp
before update on public.analysis_results
for each row execute procedure public.update_updated_at();

create trigger support_services_update_timestamp
before update on public.support_services
for each row execute procedure public.update_updated_at();

alter table public.profiles enable row level security;
alter table public.cases enable row level security;
alter table public.evidence enable row level security;
alter table public.analysis_results enable row level security;
alter table public.support_services enable row level security;

create policy "user dapat melihat profil sendiri"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "user dapat mengubah profil sendiri"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "user dapat membuat kasus sendiri"
on public.cases
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user dapat melihat kasus sendiri"
on public.cases
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user dapat mengubah kasus sendiri"
on public.cases
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user dapat menghapus kasus sendiri"
on public.cases
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "user dapat menambah evidence sendiri"
on public.evidence
for insert
to authenticated
with check (
    exists (
        select 1
        from public.cases
        where cases.id = evidence.case_id
        and cases.user_id = (select auth.uid())
    )
);

create policy "user dapat melihat evidence sendiri"
on public.evidence
for select
to authenticated
using (
    exists (
        select 1
        from public.cases
        where cases.id = evidence.case_id
        and cases.user_id = (select auth.uid())
    )
);

create policy "user dapat mengubah evidence sendiri"
on public.evidence
for update
to authenticated
using (
    exists (
        select 1
        from public.cases
        where cases.id = evidence.case_id
        and cases.user_id = (select auth.uid())
    )
);

create policy "user dapat menghapus evidence sendiri"
on public.evidence
for delete
to authenticated
using (
    exists (
        select 1
        from public.cases
        where cases.id = evidence.case_id
        and cases.user_id = (select auth.uid())
    )
);

create policy "user dapat melihat hasil kasus sendiri"
on public.analysis_results
for select
to authenticated
using (
    exists (
        select 1
        from public.cases
        where cases.id = analysis_results.case_id
        and cases.user_id = (select auth.uid())
    )
);

create policy "semua orang dapat melihat layanan aktif"
on public.support_services
for select
to anon, authenticated
using (is_active = true);

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'evidence-private',
    'evidence-private',
    false,
    26214400,
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'audio/mpeg',
        'audio/wav',
        'audio/webm',
        'video/mp4',
        'video/webm',
        'application/pdf',
        'text/plain'
    ]
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "user dapat upload ke folder sendiri"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'evidence-private'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "user dapat melihat file sendiri"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'evidence-private'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "user dapat memperbarui file sendiri"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'evidence-private'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
    bucket_id = 'evidence-private'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "user dapat menghapus file sendiri"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'evidence-private'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;


-- Integrasi frontend, backend, dan hasil ML.
begin;

alter table public.cases
add column if not exists category varchar(30) not null default 'lainnya';

do $$
begin
    alter table public.cases
    add constraint cases_category_check
    check (
        category in (
            'pelecehan-online',
            'ancaman',
            'kekerasan-verbal',
            'kekerasan-fisik',
            'diskriminasi',
            'lainnya'
        )
    );
exception
    when duplicate_object then null;
end
$$;

drop policy if exists "user dapat menambah hasil kasus sendiri"
on public.analysis_results;

create policy "user dapat menambah hasil kasus sendiri"
on public.analysis_results
for insert
to authenticated
with check (
    exists (
        select 1
        from public.cases
        where cases.id = analysis_results.case_id
        and cases.user_id = (select auth.uid())
    )
);

drop policy if exists "user dapat mengubah hasil kasus sendiri"
on public.analysis_results;

create policy "user dapat mengubah hasil kasus sendiri"
on public.analysis_results
for update
to authenticated
using (
    exists (
        select 1
        from public.cases
        where cases.id = analysis_results.case_id
        and cases.user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.cases
        where cases.id = analysis_results.case_id
        and cases.user_id = (select auth.uid())
    )
);

commit;


-- Batasi fungsi internal agar tidak dapat dipanggil lewat Data API.
revoke execute on function public.handle_new_user()
from public, anon, authenticated;

do $
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
    end if;
end
$;
