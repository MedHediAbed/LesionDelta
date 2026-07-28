import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { Subject } from 'rxjs';

export interface ZipProgress {
  fileIndex: number;
  totalFiles: number;
  fileName: string;
  percent: number; // 0-100, phase de compression uniquement
}

@Injectable({ providedIn: 'root' })
export class DicomZipService {
  /**
   * Compresse une liste de fichiers DICOM en un unique fichier .zip,
   * pour un transfert réseau bien plus rapide que centaines de requêtes
   * individuelles.
   */
  async zipFiles(files: File[], progress$?: Subject<ZipProgress>): Promise<File> {
    const zip = new JSZip();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // On garde le nom de fichier tel quel (pas l'arborescence webkitdirectory
      // complète) : un DICOM n'a pas besoin de sa structure de dossiers
      // d'origine pour être reconstitué par dcm2niix.
      zip.file(file.name || `instance-${i}.dcm`, file);

      progress$?.next({
        fileIndex: i + 1,
        totalFiles: files.length,
        fileName: file.name,
        percent: Math.round(((i + 1) / files.length) * 90), // 90% réservés à l'ajout, 10% à la compression finale
      });
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

    progress$?.next({ fileIndex: files.length, totalFiles: files.length, fileName: 'archive.zip', percent: 100 });

    return new File([blob], 'dicom-series.zip', { type: 'application/zip' });
  }
}
