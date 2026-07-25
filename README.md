# DeltaLesion — App Web Angular

App web ouverte depuis un bouton de l'app mobile React Native, qui permet à un
médecin de **visualiser** une série DICOM IRM (chargée depuis son PC) et de
l'**ajouter** au dossier du patient sur Supabase (même base que l'app mobile).

## 1. Prérequis

- Node.js 18+ et npm
- Angular CLI (`npm install -g @angular/cli`)
- Un projet Supabase déjà utilisé par l'app mobile (URL + clé anon)
- Node/Git pour lancer OHIF Viewer en local (voir §3)

## 2. Configuration Supabase

### 2.1 Appliquer la migration SQL

Le fichier [`supabase/migrations/0001_create_mri_series.sql`](./supabase/migrations/0001_create_mri_series.sql)
crée :
- la table `mri_series` (une ligne = une série DICOM uploadée, plusieurs séries possibles par patient) ;
- le bucket Storage `dicom-series` ;
- les policies RLS pour que chaque médecin ne voie/écrive que ses patients.

À exécuter via le SQL Editor du Dashboard Supabase, ou via la CLI :

```bash
supabase db push
```

> ⚠️ La table `patients` existante n'est pas modifiée. Les colonnes DICOM
> qu'elle contient déjà restent inutilisées par cette app (elles semblaient
> prévues pour une série unique par patient ; `mri_series` les remplace pour
> un historique multi-séries).

### 2.2 Renseigner les clés dans l'app

Éditez `src/app/environments/environment.ts` :

```ts
export const environment = {
  ...
  supabaseUrl: 'https://VOTRE-PROJET.supabase.co',
  supabaseAnonKey: 'VOTRE_CLE_ANON_PUBLIQUE',
  ...
};
```

Ce sont **les mêmes valeurs** que celles utilisées côté app mobile RN.

## 3. Lancer OHIF Viewer en local (visualisation DICOM)

OHIF est une application **React** distincte (pas de package Angular officiel).
On la lance donc comme un second serveur local, et l'app Angular l'affiche
dans un `<iframe>`.

```bash
git clone https://github.com/OHIF/Viewers.git
cd Viewers
yarn install
yarn dev   # démarre sur http://localhost:3000 par défaut
```

Une fois lancé, ouvrez `http://localhost:3000/local` dans un navigateur :
c'est le mode "Local" d'OHIF, qui permet de glisser-déposer des fichiers DICOM
**directement dans le navigateur, sans serveur DICOMweb**. C'est cette URL
qui est configurée dans `environment.ohifLocalUrl`.

> Le viewer (étape "1. Visualiser") et l'upload vers Supabase (étape "2.
> Ajouter au dossier patient") sont deux actions séparées dans l'app :
> OHIF sert uniquement à l'inspection visuelle, l'upload réel se fait via
> le formulaire Angular en dessous.

## 4. Lancer l'app Angular

```bash
npm install
npm start
# → http://localhost:4200
```

## 5. Format du lien attendu (deep link)

L'app mobile doit ouvrir une URL de cette forme :

```
http://localhost:4200/upload
  ?patientId=<uuid de patients.id>
  &access_token=<access_token JWT de la session Supabase du médecin>
  &refresh_token=<refresh_token correspondant>
```

Le token JWT permet à l'app web de restaurer la session Supabase du médecin
déjà connecté sur mobile (via `supabase.auth.setSession(...)`), sans lui
redemander de se reconnecter.

### 5.1 Côté app mobile (React Native) — exemple pour le développement local

Comme convenu, on utilise un simple `Linking.openURL` en dev (pas de vrai
Universal Link/App Link tant qu'on n'a pas de domaine HTTPS public) :

```ts
import { Linking } from 'react-native';
import { supabase } from './supabaseClient';

async function openDeltaLesionWeb(patientId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const url =
    `http://localhost:4200/upload` +
    `?patientId=${encodeURIComponent(patientId)}` +
    `&access_token=${encodeURIComponent(session.access_token)}` +
    `&refresh_token=${encodeURIComponent(session.refresh_token)}`;

  await Linking.openURL(url);
}
```

> ⚠️ Sur émulateur Android, `localhost` peut désigner l'émulateur lui-même.
> Utilisez l'IP locale de votre PC (ex: `http://192.168.1.x:4200`) si le
> lien ne s'ouvre pas correctement depuis l'émulateur/le téléphone.

### 5.2 Passage en production (plus tard)

Pour un vrai Universal Link (iOS) / App Link (Android) :
- Héberger l'app web sur un domaine HTTPS (Vercel/Netlify/etc.)
- Publier `apple-app-site-association` et `assetlinks.json` sur ce domaine
- Remplacer l'URL `http://localhost:4200/...` par `https://votre-domaine/...`
- Adapter `environment.mobileAppFallbackUrl` avec le vrai custom scheme
  (`deltalesion://...`) ou le lien universel de retour vers l'app mobile

## 6. Structure du projet

```
src/app/
  core/
    models/           # interfaces TypeScript (Patient, MriSeries)
    services/
      supabase.service.ts       # client Supabase + gestion session
      deep-link.service.ts      # parsing des query params du lien
      patient.service.ts        # lecture du patient
      dicom-metadata.service.ts # extraction des tags DICOM (dcmjs)
      dicom-upload.service.ts   # upload Storage + insert mri_series
  pages/
    upload/           # page principale (viewer OHIF + upload)
    link-error/        # page si accès direct sans lien valide
  shared/components/
    patient-banner/    # bandeau infos patient
    dicom-drop-zone/   # zone de sélection/drag-drop des fichiers
supabase/migrations/
  0001_create_mri_series.sql
```

## 7. Ce qui reste à faire selon votre contexte

- Vérifier que les colonnes RLS/`auth.uid()` correspondent bien à
  `medecins.id = profiles.id = auth.users.id` dans votre projet.
- Ajuster la durée de validité de l'`access_token` transmis dans l'URL
  (il expire selon la config Supabase — pensez à régénérer un token frais
  au moment du clic sur le bouton côté mobile, pas à l'avance).
- Le champ `medecin_id` inséré dans `mri_series` provient de la session
  restaurée (`auth.uid()`), pas d'un paramètre du lien — c'est volontaire
  pour éviter qu'un lien trafiqué désigne un autre médecin.
