-- Create attendance table
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  photo_url text not null,
  location_latitude numeric(10,8) not null,
  location_longitude numeric(11,8) not null,
  location_address text,
  attendance_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  manager_notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create indexes
create index attendance_user_id_idx on public.attendance(user_id);
create index attendance_status_idx on public.attendance(status);
create index attendance_date_idx on public.attendance(attendance_date);
create unique index attendance_user_date_idx on public.attendance(user_id, attendance_date);

-- Create storage bucket for attendance photos
insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', false);

-- RLS Policies for attendance table
alter table public.attendance enable row level security;

-- Policy: Users can insert their own attendance records
create policy "Users can insert own attendance"
on public.attendance for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Users can view their own attendance records
create policy "Users can view own attendance"
on public.attendance for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Managers and admins can view all attendance
create policy "Managers and admins can view all attendance"
on public.attendance for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'manager')
  )
);

-- Policy: Managers and admins can update attendance
create policy "Managers and admins can update attendance"
on public.attendance for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'manager')
  )
);

-- Storage policies for attendance-photos bucket
create policy "Users can upload to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'attendance-photos' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view own photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'attendance-photos' and
  (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Managers and admins can view all photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'attendance-photos' and
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'manager')
  )
);

-- Trigger for updating updated_at timestamp
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_attendance_updated_at
  before update on public.attendance
  for each row
  execute function update_updated_at_column();