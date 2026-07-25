import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-link-error',
  standalone: true,
  template: `
    <div class="wrapper">
      <p class="title">⚠️ Accès direct non autorisé</p>
      <p>
        DeltaLesion s'ouvre uniquement depuis l'application mobile, via la fiche d'un patient.
        Retournez à l'application mobile et réessayez.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      .wrapper {
        max-width: 420px;
        margin: 4rem auto;
        text-align: center;
        color: #334155;
        padding: 0 1rem;
      }
      .title {
        color: #b91c1c;
        font-weight: 600;
        font-size: 1.125rem;
      }
    `,
  ],
})
export class LinkErrorComponent {}
