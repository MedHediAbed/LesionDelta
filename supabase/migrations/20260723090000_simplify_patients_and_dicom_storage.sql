-- Keep patient demographics and the folder path only. Clinical visits live in
-- consultations and DICOM files live in the private dicom-series bucket.
alter table public.patients add column if not exists dicom_folder_path text;
alter table public.patients drop constraint if exists patients_dicom_folder_path_format;
alter table public.patients add constraint patients_dicom_folder_path_format
  check (dicom_folder_path is null or dicom_folder_path = 'patients/' || id::text);

do $$
declare legacy_column text;
begin
  for legacy_column in
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'patients'
      and column_name not in (
        'id', 'created_at', 'first_name', 'last_name', 'birth_date', 'gender',
        'medecin_id', 'medical_record_number', 'dicom_folder_path'
      )
  loop
    execute format('alter table public.patients drop column %I', legacy_column);
  end loop;
end $$;

-- mri_series formerly duplicated DICOM metadata. Its rows are empty and the
-- patient now holds the sole database reference to its DICOM folder.
drop table if exists public.mri_series;

drop policy if exists "dicom_select" on storage.objects;
drop policy if exists "dicom_insert" on storage.objects;
drop policy if exists "dicom_delete" on storage.objects;
drop policy if exists "Médecin peut uploader dans le dossier de ses patients" on storage.objects;
drop policy if exists "Médecin peut lire les fichiers de ses patients" on storage.objects;
drop policy if exists "dicom_series_select" on storage.objects;
drop policy if exists "dicom_series_insert" on storage.objects;
drop policy if exists "dicom_series_update" on storage.objects;
drop policy if exists "dicom_series_delete" on storage.objects;

create policy "dicom_series_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'dicom-series' and exists (
    select 1 from public.patients p
    where p.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[1] = 'patients'
      and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))
  ));

create policy "dicom_series_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dicom-series' and exists (
    select 1 from public.patients p
    where p.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[1] = 'patients'
      and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))
  ));

create policy "dicom_series_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'dicom-series' and exists (
    select 1 from public.patients p
    where p.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[1] = 'patients'
      and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))
  ))
  with check (bucket_id = 'dicom-series' and exists (
    select 1 from public.patients p
    where p.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[1] = 'patients'
      and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))
  ));

create policy "dicom_series_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dicom-series' and exists (
    select 1 from public.patients p
    where p.id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[1] = 'patients'
      and (p.medecin_id = (select auth.uid()) or public.has_shared_access(p.id))
  ));
