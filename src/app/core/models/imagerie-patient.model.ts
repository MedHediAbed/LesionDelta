/**
 * Correspond à la table `public.imagerie_patients` (voir
 * supabase/migrations/0003_create_imagerie_patients.sql).
 * Une ligne = une imagerie NIfTI convertie pour un patient (un patient
 * peut en avoir plusieurs dans le temps, et/ou plusieurs modalités).
 */
export interface ImageriePatient {
  id?: string; // uuid, généré par Supabase
  created_at?: string;

  patient_id: string; // uuid, FK -> patients.id
  medecin_id: string; // uuid, FK -> medecins.id (médecin qui a fait l'upload)

  modalite: string; // ex: 'T1', 'T2', 'FLAIR', 'INCONNUE'
  nifti_path: string; // chemin relatif dans le bucket Supabase Storage (.nii.gz)
}
