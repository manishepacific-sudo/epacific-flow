-- Add report_date column to reports table to store the date of the report event (as selected by users during upload)

-- Add report_date column to reports table
alter table public.reports add column if not exists report_date date;

-- Create index for query performance optimization
create index if not exists idx_reports_report_date on public.reports (report_date);

-- Create composite index for queries filtering by both user_id and report_date
create index if not exists idx_reports_user_id_report_date on public.reports(user_id, report_date);