-- Add approval/rejection tracking columns to reports table

-- 1) approved_by: UUID of the approver (manager/admin)
alter table public.reports
  add column if not exists approved_by uuid;

-- 2) rejected_by: UUID of the rejector (manager/admin)
alter table public.reports
  add column if not exists rejected_by uuid;

-- 3) approved_at: timestamp when the report was approved
alter table public.reports
  add column if not exists approved_at timestamptz;

-- 4) rejected_at: timestamp when the report was rejected
alter table public.reports
  add column if not exists rejected_at timestamptz;

-- Add foreign key constraints to profiles(user_id) so that approver/rejector link to a profile.
-- Use ON DELETE SET NULL to prevent cascading deletions; if a profile is removed, keep the report but nullify reference.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_reports_approved_by'
  ) then
    alter table public.reports
      add constraint fk_reports_approved_by
      foreign key (approved_by)
      references public.profiles(user_id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_reports_rejected_by'
  ) then
    alter table public.reports
      add constraint fk_reports_rejected_by
      foreign key (rejected_by)
      references public.profiles(user_id)
      on delete set null;
  end if;
end $$;

-- Comments for documentation
comment on column public.reports.approved_by is 'UUID of the manager/admin who approved the report';
comment on column public.reports.rejected_by is 'UUID of the manager/admin who rejected the report';
comment on column public.reports.approved_at is 'Timestamp when the report was approved';
comment on column public.reports.rejected_at is 'Timestamp when the report was rejected';

-- Optional indexes to support lookups of reports processed by a given manager/admin
create index if not exists idx_reports_approved_by on public.reports(approved_by);
create index if not exists idx_reports_rejected_by on public.reports(rejected_by);

-- Enforce mutual exclusivity and completeness between status and approval/rejection fields
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_reports_approval_consistency'
  ) then
    alter table public.reports
      add constraint chk_reports_approval_consistency
      check (
        (status = 'approved'
          and approved_by is not null and approved_at is not null
          and rejected_by is null and rejected_at is null)
        or
        (status = 'rejected'
          and rejected_by is not null and rejected_at is not null
          and approved_by is null and approved_at is null)
        or
        (status = 'pending_approval'
          and approved_by is null and approved_at is null
          and rejected_by is null and rejected_at is null)
      );
  end if;
end $$;

