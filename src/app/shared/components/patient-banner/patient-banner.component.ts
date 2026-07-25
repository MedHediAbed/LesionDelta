import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { Patient } from '../../../core/models/patient.model';

@Component({
    selector: 'app-patient-banner',
    imports: [],
    templateUrl: './patient-banner.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './patient-banner.component.css'
})
export class PatientBannerComponent {
  @Input({ required: true }) patient!: Patient;
}
