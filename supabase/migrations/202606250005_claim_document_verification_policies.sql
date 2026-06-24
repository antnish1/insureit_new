-- Permissions required for claim managers to verify and replace documents from the web portal.
-- Run this after the base schema migrations.

create or replace function public.is_claim_portal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'claim_processor', 'admin', 'super_admin', 'it_super_user')
      and coalesce(p.is_active, true) = true
  );
$$;

-- Claim documents: allow portal claim users to read, insert replacement uploads, and verify/reject.
alter table public.claim_documents enable row level security;

drop policy if exists "Portal claim users can read claim documents" on public.claim_documents;
create policy "Portal claim users can read claim documents"
on public.claim_documents
for select
using (public.is_claim_portal_user());

drop policy if exists "Portal claim users can insert claim documents" on public.claim_documents;
create policy "Portal claim users can insert claim documents"
on public.claim_documents
for insert
with check (public.is_claim_portal_user());

drop policy if exists "Portal claim users can update claim documents" on public.claim_documents;
create policy "Portal claim users can update claim documents"
on public.claim_documents
for update
using (public.is_claim_portal_user())
with check (public.is_claim_portal_user());

-- Claim stage details: allow portal claim users to record verification detail rows.
alter table public.claim_stage_details enable row level security;

drop policy if exists "Portal claim users can read claim stage details" on public.claim_stage_details;
create policy "Portal claim users can read claim stage details"
on public.claim_stage_details
for select
using (public.is_claim_portal_user());

drop policy if exists "Portal claim users can insert claim stage details" on public.claim_stage_details;
create policy "Portal claim users can insert claim stage details"
on public.claim_stage_details
for insert
with check (public.is_claim_portal_user());

-- Claim status history: allow portal claim users to record verification history.
alter table public.claim_status_history enable row level security;

drop policy if exists "Portal claim users can read claim status history" on public.claim_status_history;
create policy "Portal claim users can read claim status history"
on public.claim_status_history
for select
using (public.is_claim_portal_user());

drop policy if exists "Portal claim users can insert claim status history" on public.claim_status_history;
create policy "Portal claim users can insert claim status history"
on public.claim_status_history
for insert
with check (public.is_claim_portal_user());

-- Claims: allow portal claim users to read claim rows needed by the verification actions.
alter table public.claims enable row level security;

drop policy if exists "Portal claim users can read claims for verification" on public.claims;
create policy "Portal claim users can read claims for verification"
on public.claims
for select
using (public.is_claim_portal_user());

-- Storage objects: allow portal claim users to upload replacement files into claim-documents bucket.
-- Supabase Storage policies live on storage.objects.
drop policy if exists "Portal claim users can upload claim document files" on storage.objects;
create policy "Portal claim users can upload claim document files"
on storage.objects
for insert
with check (
  bucket_id = 'claim-documents'
  and public.is_claim_portal_user()
);

drop policy if exists "Portal claim users can read claim document files" on storage.objects;
create policy "Portal claim users can read claim document files"
on storage.objects
for select
using (
  bucket_id = 'claim-documents'
  and public.is_claim_portal_user()
);
