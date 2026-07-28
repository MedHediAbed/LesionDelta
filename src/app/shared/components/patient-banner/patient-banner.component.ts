import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patient } from '../../../core/models/patient.model';

@Component({
  selector: 'app-patient-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-banner.component.html',
  styleUrl: './patient-banner.component.css',
})
export class PatientBannerComponent {
  @Input({ required: true }) patient!: Patient;
}
