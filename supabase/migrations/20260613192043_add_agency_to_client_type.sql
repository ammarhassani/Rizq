-- Phase 3: clients (M2) need an 'agency' client type. Add it to the shared
-- public.client_type enum (benchmark_records simply won't use it). Done as its
-- own migration so the value is committed before the clients table references it.
alter type public.client_type add value if not exists 'agency';
