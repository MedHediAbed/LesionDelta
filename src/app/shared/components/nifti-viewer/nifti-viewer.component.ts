import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Niivue } from '@niivue/niivue';

@Component({
  selector: 'app-nifti-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="nifti-viewer-wrapper">
      <canvas #niivueCanvas></canvas>
      <p *ngIf="!niftiUrl" class="nifti-viewer-empty">
        Aucun volume à afficher pour le moment.
      </p>
    </div>
  `,
  styles: [
    `
      .nifti-viewer-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        background-color: #000;
        border-radius: 8px;
        overflow: hidden;
      }
      canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      .nifti-viewer-empty {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        margin: 0;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class NiftiViewerComponent implements AfterViewInit, OnChanges {
  /** URL publique (ou signée) du fichier .nii.gz à charger */
  @Input() niftiUrl: string | null = null;

  @ViewChild('niivueCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private nv: Niivue | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.nv = new Niivue({
      show3Dcrosshair: true,
      backColor: [0, 0, 0, 1],
    });
    this.nv.attachToCanvas(this.canvasRef.nativeElement);
    this.viewReady = true;

    if (this.niftiUrl) {
      this.loadVolume(this.niftiUrl);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['niftiUrl'] && this.viewReady && this.niftiUrl) {
      this.loadVolume(this.niftiUrl);
    }
  }

  private async loadVolume(url: string): Promise<void> {
    if (!this.nv) return;
    await this.nv.loadVolumes([{ url, colormap: 'gray', opacity: 1 }]);
    // Vue multi-plan (axial/coronal/sagittal) par défaut, adaptée à l'inspection IRM
    this.nv.setSliceType(this.nv.sliceTypeMultiplanar);
  }
}
