import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NiftiConversionProgress {
  phase: 'uploading' | 'converting';
  percent: number; // 0-100
}

export interface NiftiConversionResult {
  patientId: string;
  modalite: string; // ex: 'T1', 'T2', 'FLAIR', 'INCONNUE'
  niftiPath: string; // chemin relatif dans le bucket Supabase Storage
  niftiPublicUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class NiftiConversionService {
  constructor(private http: HttpClient) {}

  /**
   * Envoie le fichier ZIP DICOM au backend de conversion (FastAPI),
   * qui se charge de : décompresser, détecter la modalité, exécuter
   * dcm2niix, uploader le résultat vers Supabase Storage, et mettre à
   * jour la table `imagerie_patients`.
   */
  async convert(
    patientId: string,
    medecinId: string,
    zipFile: File,
    progress$?: Subject<NiftiConversionProgress>,
  ): Promise<NiftiConversionResult> {
    const formData = new FormData();
    formData.append('patient_id', patientId);
    formData.append('medecin_id', medecinId);
    formData.append('file', zipFile, zipFile.name);

    const request$ = this.http.post<NiftiConversionResult>(
      `${environment.niftiConversionApiUrl}/convert`,
      formData,
      { reportProgress: true, observe: 'events' },
    );

    return new Promise<NiftiConversionResult>((resolve, reject) => {
      request$.subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            progress$?.next({
              phase: 'uploading',
              percent: Math.round((event.loaded / event.total) * 100),
            });
          } else if (event.type === HttpEventType.Response) {
            // L'upload réseau est terminé ; le backend traite encore
            // (décompression + dcm2niix) pendant que la requête HTTP attend
            // la réponse finale — on affiche donc une phase "converting"
            // pendant ce temps côté UI (voir upload.component.ts).
            if (event.body) {
              resolve(event.body);
            } else {
              reject(new Error('Réponse vide du serveur de conversion.'));
            }
          }
        },
        error: (err) => {
          const message =
            err?.error?.detail || err?.message || 'Échec de la conversion DICOM → NIfTI.';
          reject(new Error(message));
        },
      });
    });
  }
}
