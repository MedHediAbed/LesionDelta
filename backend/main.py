"""
DeltaLesion — Backend de conversion DICOM -> NIfTI

Reçoit un fichier ZIP contenant une série DICOM, le décompresse, détecte
automatiquement la modalité (T1/T2/FLAIR/...) à partir des métadonnées
DICOM, exécute `dcm2niix` pour produire un fichier .nii.gz unique, puis
l'upload vers Supabase Storage et enregistre une ligne dans la table
`imagerie_patients`.

Prérequis système :
  - Python 3.10+
  - dcm2niix installé et accessible dans le PATH
    (https://github.com/rordenlab/dcm2niix/releases)

Lancement local :
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""
from dotenv import load_dotenv
load_dotenv()
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Optional

import pydicom
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client

# =============================================================
# Configuration
# =============================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://VOTRE-PROJET.supabase.co")
# ⚠️ Clé SERVICE ROLE (jamais la clé anon) : ce backend tourne côté serveur,
# de confiance, et doit pouvoir écrire dans Storage + la table en
# contournant le RLS destiné aux clients web/mobile.
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DICOM_STORAGE_BUCKET = os.environ.get("DICOM_STORAGE_BUCKET", "dicom-series")
DCM2NIIX_PATH = os.environ.get("DCM2NIIX_PATH", "dcm2niix")  # binaire dans le PATH par défaut

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "La variable d'environnement SUPABASE_SERVICE_ROLE_KEY est requise "
        "(Dashboard Supabase > Project Settings > API > service_role)."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI(title="DeltaLesion NIfTI Conversion API")

# Autorise l'app Angular en dev local (adapter l'IP si test depuis un autre appareil du réseau)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConversionResult(BaseModel):
    patientId: str
    modalite: str
    niftiPath: str
    niftiPublicUrl: Optional[str] = None


# =============================================================
# Détection de la modalité (heuristique par mots-clés)
# =============================================================
# Le tag DICOM `Modality` (0008,0060) vaut 'MR', 'CT', etc. — il ne
# distingue pas T1/T2/FLAIR. Cette information se déduit généralement
# de `SeriesDescription` (texte libre du fabricant), avec en secours
# `ScanningSequence` / `SequenceVariant`.

MODALITY_KEYWORDS = [
    ("FLAIR", ["flair"]),
    ("DWI", ["dwi", "diffusion", "adc", "trace"]),
    ("SWI", ["swi", "susceptibility"]),
    ("T1", ["t1", "mprage", "spgr"]),
    ("T2", ["t2", "tse", "haste"]),
    ("PD", ["pd", "proton"]),
]


def detect_modality(dicom_dir: Path) -> str:
    first_file = _find_first_dicom_file(dicom_dir)
    if first_file is None:
        return "INCONNUE"

    try:
        ds = pydicom.dcmread(str(first_file), stop_before_pixels=True, force=True)
    except Exception:
        return "INCONNUE"

    candidates = " ".join(
        str(getattr(ds, field, "") or "")
        for field in ("SeriesDescription", "ProtocolName", "SequenceName")
    ).lower()

    for label, keywords in MODALITY_KEYWORDS:
        if any(keyword in candidates for keyword in keywords):
            return label

    return "INCONNUE"


def _find_first_dicom_file(root: Path) -> Optional[Path]:
    for path in root.rglob("*"):
        if path.is_file():
            return path
    return None


# =============================================================
# Endpoint principal
# =============================================================


@app.post("/convert", response_model=ConversionResult)
async def convert_dicom_to_nifti(
    patient_id: str = Form(...),
    medecin_id: str = Form(...),
    file: UploadFile = File(...),
) -> ConversionResult:
    if not patient_id or not medecin_id:
        raise HTTPException(status_code=400, detail="patient_id et medecin_id sont requis.")

    work_dir = Path(tempfile.mkdtemp(prefix="deltalesion_"))
    dicom_input_dir = work_dir / "dicom_input"
    nifti_output_dir = work_dir / "nifti_output"
    dicom_input_dir.mkdir(parents=True, exist_ok=True)
    nifti_output_dir.mkdir(parents=True, exist_ok=True)

    try:
        # 1. Sauvegarde et décompression du ZIP reçu
        zip_path = work_dir / "upload.zip"
        with open(zip_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        try:
            shutil.unpack_archive(str(zip_path), str(dicom_input_dir), format="zip")
        except shutil.ReadError as exc:
            raise HTTPException(status_code=400, detail=f"Fichier ZIP invalide : {exc}")

        # 2. Détection de la modalité à partir des métadonnées DICOM
        modalite = detect_modality(dicom_input_dir)

        # 3. Conversion DICOM -> NIfTI via dcm2niix
        #    -z y   : compresse la sortie en .nii.gz
        #    -f %p  : nom de fichier basé sur le ProtocolName DICOM
        #    -o     : dossier de sortie
        result = subprocess.run(
            [
                DCM2NIIX_PATH,
                "-z", "y",
                "-f", "series_%p_%s",
                "-o", str(nifti_output_dir),
                str(dicom_input_dir),
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Échec de dcm2niix (code {result.returncode}) : {result.stderr[-500:]}",
            )

        nifti_files = sorted(nifti_output_dir.glob("*.nii.gz"))
        if not nifti_files:
            raise HTTPException(
                status_code=500,
                detail="dcm2niix n'a produit aucun fichier .nii.gz. Sortie : "
                + result.stdout[-500:],
            )

        # S'il y a plusieurs séries dans le ZIP, on prend la plus volumineuse
        # (heuristique simple : la série principale est généralement la plus grosse)
        nifti_file = max(nifti_files, key=lambda p: p.stat().st_size)

        # 4. Upload du résultat vers Supabase Storage
        storage_path = f"patients/{patient_id}/{modalite}_{int(time.time())}_{uuid.uuid4().hex[:8]}.nii.gz"

        with open(nifti_file, "rb") as f:
            upload_response = supabase.storage.from_(DICOM_STORAGE_BUCKET).upload(
                storage_path,
                f,
                {"content-type": "application/gzip", "upsert": "true"},
            )
        if hasattr(upload_response, "error") and upload_response.error:
            raise HTTPException(
                status_code=500,
                detail=f"Échec de l'upload vers Supabase Storage : {upload_response.error}",
            )

        # 5. Insertion de la ligne en base (table imagerie_patients)
        insert_response = (
            supabase.table("imagerie_patients")
            .insert(
                {
                    "patient_id": patient_id,
                    "medecin_id": medecin_id,
                    "modalite": modalite,
                    "nifti_path": storage_path,
                }
            )
            .execute()
        )
        if getattr(insert_response, "data", None) is None:
            raise HTTPException(
                status_code=500,
                detail="Échec de l'enregistrement de la ligne imagerie_patients.",
            )

        # 6. URL signée pour affichage immédiat côté frontend (30 min)
        signed_url = None
        try:
            signed = supabase.storage.from_(DICOM_STORAGE_BUCKET).create_signed_url(
                storage_path, 60 * 30
            )
            signed_url = signed.get("signedURL") or signed.get("signedUrl")
        except Exception:
            pass  # le frontend régénérera une URL signée lui-même si besoin

        return ConversionResult(
            patientId=patient_id,
            modalite=modalite,
            niftiPath=storage_path,
            niftiPublicUrl=signed_url,
        )

    finally:
        # Nettoyage systématique des fichiers temporaires, succès ou échec
        shutil.rmtree(work_dir, ignore_errors=True)
        await file.close()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
