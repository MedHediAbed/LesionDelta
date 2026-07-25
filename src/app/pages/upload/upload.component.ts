import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { DeepLinkService, DeepLinkError } from '../../core/services/deep-link.service';
import { PatientService } from '../../core/services/patient.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { DicomUploadService, UploadProgress } from '../../core/services/dicom-upload.service';
import { Patient } from '../../core/models/patient.model';
import { environment } from '../../environments/environment';

import { PatientBannerComponent } from '../../shared/components/patient-banner/patient-banner.component';
import { DicomDropZoneComponent } from '../../shared/components/dicom-drop-zone/dicom-drop-zone.component';

type PageState = 'loading' | 'ready' | 'error';
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, PatientBannerComponent, DicomDropZoneComponent],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export class UploadComponent implements OnInit {
  pageState: PageState = 'loading';
  errorMessage = '';

  patient: Patient | null = null;
  medecinId: string | null = null;

  ohifUrl: SafeResourceUrl;

  selectedFiles: File[] = [];
  uploadState: UploadState = 'idle';
  uploadProgress: UploadProgress | null = null;
  uploadErrorMessage = '';

  private progress$ = new Subject<UploadProgress>();

  constructor(
    private deepLink: DeepLinkService,
    private patientService: PatientService,
    private supabase: SupabaseService,
    private dicomUpload: DicomUploadService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.ohifUrl = this.sanitizer.bypassSecurityTrustResourceUrl(environment.ohifLocalUrl);
    this.progress$.subscribe((p) => {
      this.uploadProgress = p;
      this.cdr.detectChanges();
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const { patientId } = await this.deepLink.resolve();

      const session = await this.supabase.getCurrentSession();
      this.medecinId = session?.user.id ?? null;
      if (!this.medecinId) {
        throw new DeepLinkError("Session médecin introuvable après authentification.");
      }

      this.patient = await this.patientService.getById(patientId);
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

    this.uploadState = 'uploading';
    this.uploadErrorMessage = '';

    try {
      await this.dicomUpload.uploadSeries(this.patient.id, this.selectedFiles, this.progress$);
      this.uploadState = 'success';
    } catch (err) {
      this.uploadState = 'error';
      this.uploadErrorMessage =
        err instanceof Error ? err.message : "Échec de l'upload de la série DICOM.";
    } finally {
      this.cdr.detectChanges();
    }
  }

  returnToMobileApp(): void {
    const patientId = this.patient?.id ?? '';
    const url = `${environment.mobileAppFallbackUrl}?patientId=${encodeURIComponent(patientId)}`;
    window.location.href = url;
  }
}
