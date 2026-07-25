import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'upload',
    loadComponent: () =>
      import('./pages/upload/upload.component').then((m) => m.UploadComponent),
  },
  {
    path: '',
    redirectTo: 'link-error',
    pathMatch: 'full',
  },
  {
    path: 'link-error',
    loadComponent: () =>
      import('./pages/link-error/link-error.component').then((m) => m.LinkErrorComponent),
  },
  {
    path: '**',
    redirectTo: 'link-error',
  },
];
