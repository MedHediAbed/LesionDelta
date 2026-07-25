import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Patient } from '../models/patient.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Récupère le patient par son id (uuid). Grâce aux policies RLS
   * Supabase (à activer sur `patients`), seul un médecin ayant accès
   * à ce patient (medecin_id, ou via patient_access) pourra lire la ligne.
   */
  async getById(patientId: string): Promise<Patient> {
    const { data, error } = await this.supabase.client
      .from('patients')
      .select(
        'id, created_at, first_name, last_name, birth_date, gender, medecin_id, medical_record_number, dicom_folder_path',
      )
      .eq('id', patientId)
      .single();

    if (error) {
      throw new Error(`Patient introuvable ou accès refusé : ${error.message}`);
    }
    return data as Patient;
  }
}
