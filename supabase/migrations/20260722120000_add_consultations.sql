-- Patient consultations are separate from patient demographics so that a patient
-- can have an ordered clinical history while DICOM data remains in mri_series.
alter table public.patients add column if not exists medical_record_number text;
create index if not exists patients_medical_record_number_idx on public.patients (medical_record_number);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  medecin_id uuid not null references public.medecins(id),
  medical_record_number text not null,
  visit_date date not null,
  relapse boolean,
  weight_kg numeric check (weight_kg is null or weight_kg >= 0),
  height_cm numeric check (height_cm is null or height_cm >= 0),
  physical_exam text,
  edss_score numeric check (edss_score is null or edss_score >= 0),
  worsening boolean,
  worsening_comments text,
  csf_isofocalisation boolean,
  csf_profile smallint check (csf_profile is null or csf_profile between 1 and 4),
  csf_kappa_index numeric,
  csf_other text,
  hpt_tested_limb_dominance text check (hpt_tested_limb_dominance in ('dominant', 'non_dominant')),
  sdmt_score integer,
  mri_lesion_load text,
  mri_activity text,
  mri_comparative text,
  treatment_received text,
  walk_test_seconds numeric check (walk_test_seconds is null or walk_test_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consultations_patient_id_visit_date_idx on public.consultations (patient_id, visit_date desc);
create index if not exists consultations_medecin_id_idx on public.consultations (medecin_id);
alter table public.consultations enable row level security;

create policy consultations_select_accessible on public.consultations
  for select to authenticated
  using (exists (select 1 from public.patients p where p.id = consultations.patient_id and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))));

create policy consultations_insert_accessible on public.consultations
  for insert to authenticated
  with check (medecin_id = (select auth.uid()) and exists (select 1 from public.patients p where p.id = consultations.patient_id and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))));

create policy consultations_update_author_or_owner on public.consultations
  for update to authenticated
  using (medecin_id = (select auth.uid()) or exists (select 1 from public.patients p where p.id = consultations.patient_id and p.medecin_id = (select auth.uid())))
  with check (medecin_id = (select auth.uid()) or exists (select 1 from public.patients p where p.id = consultations.patient_id and p.medecin_id = (select auth.uid())));

create policy consultations_delete_author_or_owner on public.consultations
  for delete to authenticated
  using (medecin_id = (select auth.uid()) or exists (select 1 from public.patients p where p.id = consultations.patient_id and p.medecin_id = (select auth.uid())));
