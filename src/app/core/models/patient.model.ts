/**
 * Correspond à la table `public.patients`
 * Le chemin des fichiers DICOM du dernier upload est stocké directement
 * dans `dicom_folder_path` (chemin relatif dans le bucket Storage
 * `dicom-series`, ex: patients/<id>/<horodatage>-<uuid>/).
 */
export interface Patient {
  id: string; // uuid, PK
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  gender: string | null;
  medecin_id: string | null;
  medical_record_number: string | null; // identifiant dossier médical (remplace l'ancien patient_id)
  dicom_folder_path: string | null; // pointeur pratique vers le dossier de la dernière série uploadée
}

export interface Medecin {
  id: string; // uuid, PK, = profiles.id
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  speciality: string | null;
  phone: string | null;
  license_number: string | null;
  status: string | null;
}
