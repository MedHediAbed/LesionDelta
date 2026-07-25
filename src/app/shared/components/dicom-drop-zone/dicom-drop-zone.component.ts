import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';


@Component({
    selector: 'app-dicom-drop-zone',
    imports: [],
    templateUrl: './dicom-drop-zone.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './dicom-drop-zone.component.css'
})
export class DicomDropZoneComponent {
  @Output() filesSelected = new EventEmitter<File[]>();

  isDragOver = false;
  selectedFileNames: string[] = [];

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.emitFiles(Array.from(files));
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.emitFiles(Array.from(input.files));
    }
  }

  private emitFiles(files: File[]): void {
    // On garde uniquement des fichiers plausibles (extension .dcm ou sans extension,
    // fréquent pour des exports DICOM bruts)
    const dicomFiles = files.filter(
      (f) => f.name.toLowerCase().endsWith('.dcm') || !f.name.includes('.'),
    );
    this.selectedFileNames = dicomFiles.map((f) => f.name);
    this.filesSelected.emit(dicomFiles.length > 0 ? dicomFiles : files);
  }
}
