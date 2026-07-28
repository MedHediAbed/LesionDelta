import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ImageriePatient } from '../models/imagerie-patient.model';

@Injectable({ providedIn: 'root' })
export class ImagerieService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Retourne l'imagerie la plus récente enregistrée pour un patient
   * (toutes modalités confondues), ou null si aucune n'existe encore.
   */
  async getLatestForPatient(patientId: string): Promise<ImageriePatient | null> {
    const { data, error } = await this.supabase.client
      .from('imagerie_patients')
      .select('id, created_at, patient_id, medecin_id, modalite, nifti_path')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Impossible de récupérer l'imagerie du patient : ${error.message}`);
    }
    return data as ImageriePatient | null;
  }

  /** Retourne l'historique complet des imageries d'un patient, triées du plus récent au plus ancien. */
  async listForPatient(patientId: string): Promise<ImageriePatient[]> {
    const { data, error } = await this.supabase.client
      .from('imagerie_patients')
      .select('id, created_at, patient_id, medecin_id, modalite, nifti_path')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Impossible de récupérer l'historique d'imagerie : ${error.message}`);
    }
    return (data ?? []) as ImageriePatient[];
  }
}
