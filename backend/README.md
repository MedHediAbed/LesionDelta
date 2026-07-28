# Backend DeltaLesion — Conversion DICOM → NIfTI

Micro-serveur FastAPI qui reçoit un ZIP DICOM, exécute `dcm2niix`, et
pousse le résultat vers Supabase.

## 1. Installer dcm2niix

Téléchargez le binaire pour Windows depuis :
https://github.com/rordenlab/dcm2niix/releases (fichier `dcm2niix_win.zip`)

Extrayez `dcm2niix.exe` quelque part (ex: `C:\Tools\dcm2niix\`), puis ajoutez
ce dossier à la variable d'environnement `PATH` de Windows, ou définissez
directement son chemin complet dans la variable d'environnement
`DCM2NIIX_PATH` (voir §3).

Vérifiez l'installation :
```powershell
dcm2niix -h
```

## 2. Installer les dépendances Python

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Configurer les variables d'environnement

Créez un fichier `.env` dans `backend/` (ou définissez ces variables dans
votre session PowerShell) :

```
SUPABASE_URL=https://VOTRE-PROJET.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
DICOM_STORAGE_BUCKET=dicom-series
DCM2NIIX_PATH=dcm2niix
```

> ⚠️ La clé **service_role** (Dashboard Supabase > Project Settings > API)
> donne un accès total à la base, en contournant le RLS. Elle ne doit
> **jamais** être exposée côté frontend — uniquement utilisée ici, côté
> serveur, en développement local.

Pour charger le `.env` automatiquement, ajoutez au tout début de `main.py` :
```python
from dotenv import load_dotenv
load_dotenv()
```
et ajoutez `python-dotenv` à `requirements.txt`.

## 4. Lancer le serveur

```powershell
uvicorn main:app --reload --port 8000
```

Testez : http://localhost:8000/health doit répondre `{"status": "ok"}`.

## 5. Exécuter la migration SQL

Exécutez `supabase/migrations/0003_create_imagerie_patients.sql` dans le
SQL Editor Supabase (crée la table `imagerie_patients` + policies RLS).

## 6. Flux complet

1. Angular compresse le dossier DICOM sélectionné en `.zip` (JSZip).
2. Angular envoie ce zip + `patient_id` + `medecin_id` en `POST multipart/form-data`
   vers `http://localhost:8000/convert`.
3. Le backend décompresse, détecte la modalité (heuristique sur
   `SeriesDescription`), exécute `dcm2niix`, uploade le `.nii.gz` obtenu
   dans le bucket `dicom-series`, insère une ligne dans `imagerie_patients`.
4. Le backend répond avec `{ patientId, modalite, niftiPath, niftiPublicUrl }`.
5. Angular charge immédiatement `niftiPublicUrl` dans le composant
   `<app-nifti-viewer>` (Niivue), qui affiche le volume en quelques secondes.

## 7. Limites actuelles à connaître

- **Un seul fichier DICOM analysé** pour détecter la modalité (le premier
  trouvé dans le zip) — suffisant en pratique car la description de série
  est identique sur toutes les instances d'une même série.
- **Pas de vérification d'authentification côté backend** : n'importe quel
  appel HTTP vers `/convert` avec un `patient_id` valide sera traité. En
  développement local, c'est acceptable ; en production, il faudrait
  transmettre le token JWT Supabase et vérifier (`supabase.auth.get_user()`)
  que le médecin a bien accès à ce patient avant de traiter la requête.
- **Une seule série par ZIP** est retenue si plusieurs séries DICOM sont
  mélangées dans le même zip (la plus volumineuse est choisie). Pour gérer
  plusieurs séries distinctes en un seul upload, il faudrait adapter
  `main.py` pour itérer sur tous les fichiers `.nii.gz` produits.
- **Timeout de 300s** sur `dcm2niix` — à augmenter si vos séries sont très
  volumineuses (IRM avec beaucoup de coupes/répétitions).
