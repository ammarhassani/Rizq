# Supabase — schema backup

The database schema for the `rizq` project, as **versioned migrations**. This
folder was reconstructed on **2026-06-12** by pulling the exact migration SQL
from the live project's `supabase_migrations.schema_migrations` table, after the
original local copy was lost. The 14 files here match the remote history 1:1.

## What's in the schema
- **Tables:** `waitlist`, `users`, `specialties`, `cities`, `experience_tiers`,
  `benchmark_records`, `queries`, `pricing_submissions`
- **Enums:** `user_role`, `app_language`, `saudi_region`, `project_size`,
  `client_type`, `benchmark_source`, `submission_status`
- **RPCs:** `log_query`, `submit_pricing`, `resubmit_pricing`, `is_admin`
- **Triggers (private schema):** `handle_new_user`, `on_submission_approve`,
  `enforce_query_quota`
- **Storage:** private `submission-proofs` bucket + owner/admin RLS policies
- RLS enabled on every table; founder-curated benchmark seed (12 specialties).

## Reconnect the CLI to the hosted project
```bash
# one-time: install the Supabase CLI (https://supabase.com/docs/guides/cli)
supabase link --project-ref qjtisvfjhqizvtqrixut
supabase migration list      # local should equal remote — all 14 applied
```

## Going forward
Create new schema changes as migrations so they stay version-controlled:
```bash
supabase migration new <name>   # writes a new timestamped file here
# edit it, then:
supabase db push                # applies pending migrations to the remote DB
```
Never edit the schema only in the dashboard again without capturing it here —
that's how the schema became a single point of failure in the first place.
