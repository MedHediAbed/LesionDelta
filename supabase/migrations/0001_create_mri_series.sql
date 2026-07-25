-- =============================================================
-- DeltaLesion — Migration : historique des séries IRM par patient
-- =============================================================
-- Contexte : la table `patients` existante contient déjà des colonnes
-- DICOM à plat, conçues pour UNE seule série par patient. Cette
-- migration ajoute une table dédiée `mri_series` pour permettre
-- PLUSIEURS séries/études par patient dans le temps (un upload = une
-- ligne), sans toucher à la table `patients` existante.
-- =============================================================

create table public.mri_series (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),

  patient_id uuid not null,
  medecin_id uuid not null,

  -- Emplacement des fichiers dans Supabase Storage (bucket dicom-series)
  dicom_storage_path text not null,
  file_count integer not null default 0,

  -- --- Métadonnées DICOM (mêmes colonnes que l'ancien schéma patients) ---
  specific_character_set text,
  image_type text,
  sop_class_uid text,
  sop_instance_uid text,
  accession_number text,
  modality text,
  instance_creation_date date,
  instance_creation_time time without time zone,
  study_date date,
  series_date date,
  acquisition_date date,
  content_date date,
  study_time time without time zone,
  series_time time without time zone,
  acquisition_time time without time zone,
  content_time time without time zone,
  manufacturer text,
  institution_name text,
  institution_address text,
  referring_physician_name text,
  station_name text,
  study_description text,
  series_description text,
  institutional_department_name text,
  physicians_of_record text,
  performing_physician_name text,
  manufacturer_model_name text,
  patient_age integer,
  patient_size numeric,
  patient_weight integer,
  body_part_examined text,
  patient_position text,
  scanning_sequence text,
  sequence_variant text,
  scan_options text,
  mr_acquisition_type text,
  sequence_name text,
  slice_thickness numeric,
  repetition_time numeric,
  echo_time numeric,
  inversion_time numeric,
  imaging_frequency numeric,
  magnetic_field_strength numeric,
  flip_angle integer,
  study_instance_uid text,
  series_instance_uid text,
  study_id text,
  series_number integer,
  acquisition_number integer,
  image_rows integer,
  image_columns integer,
  pixel_spacing text,
  bits_allocated integer,
  window_center numeric,
  window_width numeric,

  constraint mri_series_pkey primary key (id),
  constraint mri_series_patient_id_fkey foreign key (patient_id) references public.patients(id) on delete cascade,
  constraint mri_series_medecin_id_fkey foreign key (medecin_id) references public.medecins(id)
);

create index mri_series_patient_id_idx on public.mri_series (patient_id);
create index mri_series_medecin_id_idx on public.mri_series (medecin_id);

-- =============================================================
-- Bucket Storage pour les fichiers DICOM
-- =============================================================
insert into storage.buckets (id, name, public)
values ('dicom-series', 'dicom-series', false)
on conflict (id) do nothing;

-- =============================================================
-- RLS — mri_series
-- Un médecin ne peut lire/écrire que les séries des patients
-- auxquels il a accès (propriétaire via patients.medecin_id,
-- ou accès partagé via patient_access).
-- =============================================================
alter table public.mri_series enable row level security;

create policy "Médecin peut lire les séries de ses patients"
  on public.mri_series for select
  to authenticated
  using (
    exists (
      select 1 from public.patients p
      where p.id = mri_series.patient_id
        and (
          p.medecin_id = auth.uid()
          or exists (
            select 1 from public.patient_access pa
            where pa.patient_id = p.id and pa.medecin_id = auth.uid()
          )
        )
    )
  );

create policy "Médecin peut ajouter une série pour ses patients"
  on public.mri_series for insert
  to authenticated
  with check (
    medecin_id = auth.uid()
    and exists (
      select 1 from public.patients p
      where p.id = mri_series.patient_id
        and (
          p.medecin_id = auth.uid()
          or exists (
            select 1 from public.patient_access pa
            where pa.patient_id = p.id and pa.medecin_id = auth.uid()
          )
        )
    )
  );

-- =============================================================
-- RLS — storage.objects (bucket dicom-series)
-- Convention de chemin : patients/<patient_id>/<series_instance_uid>/<fichier>
-- On autorise un médecin authentifié à lire/écrire uniquement dans le
-- sous-dossier du patient auquel il a accès.
-- =============================================================
create policy "Médecin peut uploader dans le dossier de ses patients"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dicom-series'
    and exists (
      select 1 from public.patients p
      where p.id::text = (storage.foldername(name))[2]
        and (
          p.medecin_id = auth.uid()
          or exists (
            select 1 from public.patient_access pa
            where pa.patient_id = p.id and pa.medecin_id = auth.uid()
          )
        )
    )
  );

create policy "Médecin peut lire les fichiers de ses patients"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dicom-series'
    and exists (
      select 1 from public.patients p
      where p.id::text = (storage.foldername(name))[2]
        and (
          p.medecin_id = auth.uid()
          or exists (
            select 1 from public.patient_access pa
            where pa.patient_id = p.id and pa.medecin_id = auth.uid()
          )
        )
    )
  );
