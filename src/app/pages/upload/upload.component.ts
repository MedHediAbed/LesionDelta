import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

import { DeepLinkService, DeepLinkError } from '../../core/services/deep-link.service';
import { PatientService } from '../../core/services/patient.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { DicomZipService, ZipProgress } from '../../core/services/dicom-zip.service';
import {
  NiftiConversionService,
  NiftiConversionProgress,
} from '../../core/services/nifti-conversion.service';
import { ImagerieService } from '../../core/services/imagerie.service';
import { Patient } from '../../core/models/patient.model';
import { environment } from '../../environments/environment';

import { PatientBannerComponent } from '../../shared/components/patient-banner/patient-banner.component';
import { DicomDropZoneComponent } from '../../shared/components/dicom-drop-zone/dicom-drop-zone.component';
import { NiftiViewerComponent } from '../../shared/components/nifti-viewer/nifti-viewer.component';

type PageState = 'loading' | 'ready' | 'error';
type UploadState = 'idle' | 'zipping' | 'uploading' | 'converting' | 'success' | 'error';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, PatientBannerComponent, DicomDropZoneComponent, NiftiViewerComponent],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export class UploadComponent implements OnInit {
  pageState: PageState = 'loading';
  errorMessage = '';

  patient: Patient | null = null;
  medecinId: string | null = null;

  niftiUrl: string | null = null;
  currentModalite: string | null = null;
  returnToMobileFailed = false;

  selectedFiles: File[] = [];
  uploadState: UploadState = 'idle';
  progressPercent = 0;
  progressLabel = '';
  uploadErrorMessage = '';

  private zipProgress$ = new Subject<ZipProgress>();
  private conversionProgress$ = new Subject<NiftiConversionProgress>();

  constructor(
    private deepLink: DeepLinkService,
    private patientService: PatientService,
    private supabase: SupabaseService,
    private dicomZip: DicomZipService,
    private niftiConversion: NiftiConversionService,
    private imagerieService: ImagerieService,
    private cdr: ChangeDetectorRef,
  ) {
    this.zipProgress$.subscribe((p) => {
      this.progressPercent = p.percent;
      this.progressLabel = `Compression : ${p.fileIndex}/${p.totalFiles} fichiers`;
      this.cdr.detectChanges();
    });
    this.conversionProgress$.subscribe((p) => {
      if (p.phase === 'uploading') {
        this.progressPercent = p.percent;
        this.progressLabel = `Envoi du ZIP au serveur : ${p.percent}%`;
      } else {
        this.progressLabel = 'Conversion DICOM → NIfTI en cours sur le serveur…';
      }
      this.cdr.detectChanges();
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const { patientId } = await this.deepLink.resolve();

      const session = await this.supabase.getCurrentSession();
      this.medecinId = session?.user.id ?? null;
      if (!this.medecinId) {
        throw new DeepLinkError('Session médecin introuvable après authentification.');
      }

      this.patient = await this.patientService.getById(patientId);

      // Si une imagerie a déjà été convertie pour ce patient, on la charge directement
      const latest = await this.imagerieService.getLatestForPatient(patientId);
      if (latest) {
        this.currentModalite = latest.modalite;
        this.niftiUrl = await this.resolveNiftiPublicUrl(latest.nifti_path);
      }

      this.pageState = 'ready';
    } catch (err) {
      this.pageState = 'error';
      this.errorMessage =
        err instanceof Error ? err.message : "Une erreur inconnue est survenue à l'ouverture du lien.";
    } finally {
      this.cdr.detectChanges();
    }
  }

  onFilesSelected(files: File[]): void {
    this.selectedFiles = files;
    this.uploadState = 'idle';
    this.uploadErrorMessage = '';
  }

  async startUpload(): Promise<void> {
    if (!this.patient || this.selectedFiles.length === 0) {
      return;
    }

    this.uploadErrorMessage = '';

    try {
      // 1. Compression du dossier DICOM en un unique fichier .zip
      this.uploadState = 'zipping';
      this.cdr.detectChanges();
      const zipFile = await this.dicomZip.zipFiles(this.selectedFiles, this.zipProgress$);

      // 2. Envoi du zip au backend de conversion (dcm2niix), qui gère aussi
      //    l'upload vers Supabase Storage et l'écriture dans imagerie_patients.
      this.uploadState = 'uploading';
      this.cdr.detectChanges();
      const result = await this.niftiConversion.convert(
        this.patient.id,
        this.medecinId ?? '',
        zipFile,
        this.conversionProgress$,
      );

      // 3. Chargement immédiat du résultat dans le viewer
      this.currentModalite = result.modalite;
      this.niftiUrl = result.niftiPublicUrl ?? (await this.resolveNiftiPublicUrl(result.niftiPath));

      this.uploadState = 'success';
    } catch (err) {
      this.uploadState = 'error';
      this.uploadErrorMessage =
        err instanceof Error ? err.message : 'Échec de la conversion de la série DICOM.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  /** Génère une URL signée temporaire pour lire un fichier privé du bucket Storage. */
  private async resolveNiftiPublicUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await this.supabase.client.storage
      .from(environment.dicomStorageBucket)
      .createSignedUrl(storagePath, 60 * 30); // valide 30 minutes

    if (error) {
      console.error("[UploadComponent] Échec de génération de l'URL signée NIfTI :", error.message);
      return null;
    }
    return data.signedUrl;
  }

  returnToMobileApp(): void {
    const patientId = this.patient?.id ?? '';
    const url = `${environment.mobileAppFallbackUrl}?patientId=${encodeURIComponent(patientId)}`;

    this.returnToMobileFailed = false;
    this.cdr.detectChanges();

    // Si le navigateur ne sait pas gérer ce schéma d'URL (ex: exp:// ouvert
    // depuis un navigateur desktop sans Expo Go installé), la page reste
    // visible sans réaction. On détecte ce cas après un court délai.
    const fallbackTimer = setTimeout(() => {
      if (!document.hidden) {
        this.returnToMobileFailed = true;
        this.cdr.detectChanges();
      }
    }, 1500);

    window.addEventListener(
      'blur',
      () => {
        // La page a perdu le focus : le navigateur a probablement basculé
        // vers l'application mobile avec succès.
        clearTimeout(fallbackTimer);
      },
      { once: true },
    );

    window.location.href = url;
  }
}
