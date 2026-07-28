-- =============================================================
-- DeltaLesion — Migration : table imagerie_patients (flux NIfTI)
-- =============================================================
-- Remplace l'usage de patients.dicom_folder_path pour ce nouveau flux :
-- chaque conversion DICOM -> NIfTI crée une ligne ici (historique complet,
-- plusieurs modalités/dates possibles par patient).
-- =============================================================

create table public.imagerie_patients (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),

  patient_id uuid not null,
  medecin_id uuid not null,

  modalite text not null default 'INCONNUE',
  nifti_path text not null, -- chemin relatif dans le bucket Supabase Storage

  constraint imagerie_patients_pkey primary key (id),
  constraint imagerie_patients_patient_id_fkey foreign key (patient_id) references public.patients(id) on delete cascade,
  constraint imagerie_patients_medecin_id_fkey foreign key (medecin_id) references public.medecins(id)
);

create index imagerie_patients_patient_id_idx on public.imagerie_patients (patient_id);
create index imagerie_patients_created_at_idx on public.imagerie_patients (created_at desc);

-- =============================================================
-- Bucket Storage (si pas déjà créé par une migration précédente)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('dicom-series', 'dicom-series', false)
on conflict (id) do nothing;

-- =============================================================
-- RLS — imagerie_patients
-- Un médecin ne peut lire que les imageries des patients auxquels il a
-- accès (propriétaire ou accès partagé via patient_access / has_shared_access).
-- Les écritures se font uniquement via le backend (clé service_role),
-- qui contourne le RLS — donc pas de policy INSERT nécessaire côté client.
-- =============================================================
alter table public.imagerie_patients enable row level security;

create policy "Médecin peut lire l'imagerie de ses patients"
  on public.imagerie_patients for select
  to authenticated
  using (
    exists (
      select 1 from public.patients p
      where p.id = imagerie_patients.patient_id
        and (
          p.medecin_id = auth.uid()
          or has_shared_access(p.id)
        )
    )
  );

-- =============================================================
-- RLS — storage.objects (bucket dicom-series)
-- Le backend (service_role) contourne déjà le RLS pour l'écriture.
-- On garde une policy de LECTURE pour que le frontend puisse générer
-- des URLs signées côté client si besoin (createSignedUrl passe par
-- l'API storage, qui vérifie ces policies pour un utilisateur authentifié).
-- Convention de chemin : patients/<patient_id>/<fichier>.nii.gz
-- =============================================================
create policy "Médecin peut lire les fichiers NIfTI de ses patients"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dicom-series'
    and exists (
      select 1 from public.patients p
      where p.id::text = (storage.foldername(name))[2]
        and (
          p.medecin_id = auth.uid()
          or has_shared_access(p.id)
        )
    )
  );
