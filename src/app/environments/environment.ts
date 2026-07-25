/**
 * Configuration d'environnement - DÉVELOPPEMENT LOCAL
 *
 * Remplissez ces valeurs avec celles de votre projet Supabase
 * (les mêmes que celles utilisées par l'app mobile React Native).
 * Vous les trouverez dans : Supabase Dashboard > Project Settings > API
 */
export const environment = {
  production: false,

  supabaseUrl: 'https://fvhdtwesgzzszabtigyo.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2aGR0d2VzZ3p6c3phYnRpZ3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODY4MDYsImV4cCI6MjA5OTI2MjgwNn0.X4jA4iVG6vmKIWb4-gdjhUeFnhb5kVYTB2BnCEmo4Nk',

  // Nom du bucket Supabase Storage où seront stockés les fichiers DICOM
  dicomStorageBucket: 'dicom-series',

  // URL de l'instance OHIF Viewer lancée en local (voir README pour le setup)
  // OHIF est une app React distincte, lancée séparément (ex: yarn dev sur le port 3000)
  // et embarquée ici en iframe, en mode "Local" (chargement de fichiers locaux, sans serveur DICOMweb)
  ohifLocalUrl: 'http://localhost:3000/local',

  // URL de fallback vers l'app mobile pendant le développement local
  // (en attendant un vrai Universal Link / App Link en production)
  mobileAppFallbackUrl: 'exp://127.0.0.1:8081/--/patient-detail',
};
