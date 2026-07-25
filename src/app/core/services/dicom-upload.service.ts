import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

export interface UploadProgress {
  fileIndex: number;
  totalFiles: number;
  fileName: string;
  percent: number; // 0-100 global
}

export interface UploadResult {
  storagePath: string;
  fileCount: number;
}

@Injectable({ providedIn: 'root' })
export class DicomUploadService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Upload une série DICOM complète (liste de fichiers .dcm sélectionnés
   * par le médecin) vers Supabase Storage, dans un dossier propre au
   * patient, puis met à jour `patients.dicom_folder_path` avec ce chemin.
   *
   * @param patientId  uuid du patient (table patients.id)
   * @param files      fichiers DICOM sélectionnés (dossier ou multi-fichiers)
   * @param progress$  Subject optionnel pour suivre la progression dans l'UI
   */
  async uploadSeries(
    patientId: string,
    files: File[],
    progress$?: Subject<UploadProgress>,
  ): Promise<UploadResult> {
    if (files.length === 0) {
      throw new Error('Aucun fichier DICOM sélectionné.');
    }

// Le chemin stocké en base DOIT correspondre exactement au format imposé
// par la contrainte CHECK côté Supabase : 'patients/' || id (uuid).
// Un seul dossier fixe par patient — pas de sous-dossier par upload.
    const storagePath = `patients/${patientId}`;

// Pour éviter d'écraser silencieusement une série précédente si deux
// fichiers portent le même nom, on préfixe chaque fichier par un
// horodatage propre à cette session d'upload.
    const uploadPrefix = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectPath = `${storagePath}/${uploadPrefix}_${file.name || `instance-${i}.dcm`}`;

      const { error: uploadError } = await this.supabase.client.storage
        .from(environment.dicomStorageBucket)
        .upload(objectPath, file, {
          contentType: 'application/dicom',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Échec de l'upload du fichier ${file.name} : ${uploadError.message}`);
      }

      progress$?.next({
        fileIndex: i + 1,
        totalFiles: files.length,
        fileName: file.name,
        percent: Math.round(((i + 1) / files.length) * 100),
      });
    }

    const { error: updatePatientError } = await this.supabase.client
      .from('patients')
      .update({ dicom_folder_path: storagePath })
      .eq('id', patientId);

    if (updatePatientError) {
      throw new Error(
        `Fichiers envoyés, mais échec de mise à jour du dossier patient : ${updatePatientError.message}`,
      );
    }

    return { storagePath, fileCount: files.length };
  }
}
