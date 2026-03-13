"""
server.py — FastAPI backend for Clinical Voice System (Doctify)
Integrated with AI pipeline (Member 3's ai_pipeline_connector)
Runs on port 8001 via Emergent supervisor
"""
import sys
import os

# Load env FIRST so pipeline can read GROQ_API_KEY and SARVAM_API_KEY
from dotenv import load_dotenv
load_dotenv()

# Add ai-pipeline directory to Python path for imports
AI_PIPELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ai-pipeline')
sys.path.insert(0, AI_PIPELINE_PATH)

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid, json, hashlib
from datetime import datetime

# ─────────────────────────────────────────────
# CREDIT-SAVING CACHE
# Same transcript → reads from disk instead of calling Groq again.
# Saves API credits during repeated dev/demo runs.
# ─────────────────────────────────────────────
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

def _cached_analyze(transcript: str, language: str) -> dict | None:
    """Return cached result if exists, else None."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.md5(f"{transcript.strip()}|{language}".encode()).hexdigest()[:12]
    cache_file = os.path.join(CACHE_DIR, f"{key}.json")
    if os.path.exists(cache_file):
        print(f"[Cache] Hit for key {key} — skipping Groq call")
        with open(cache_file) as f:
            return json.load(f)
    return None

def _save_cache(transcript: str, language: str, result: dict) -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.md5(f"{transcript.strip()}|{language}".encode()).hexdigest()[:12]
    cache_file = os.path.join(CACHE_DIR, f"{key}.json")
    with open(cache_file, "w") as f:
        json.dump(result, f, indent=2)
    print(f"[Cache] Saved result for key {key}")

from database import engine, get_db
import model as models

# Import AI pipeline functions
try:
    from ai_pipeline_connector import transcribe_audio_real, extract_medical_record_real
    AI_PIPELINE_AVAILABLE = True
    print("[Startup] AI pipeline loaded successfully")
except Exception as e:
    AI_PIPELINE_AVAILABLE = False
    print(f"[Startup] WARNING: AI pipeline failed to load: {e}")

# Create all database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Clinical Voice System API — Doctify")

# CORS — allow all origins for Emergent deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# ENDPOINT 1 — PATIENT REGISTRATION
# ─────────────────────────────────────────────

@app.post("/api/patients/register")
def register_patient(data: dict, db: Session = Depends(get_db)):
    if not data.get("name") or not data.get("age"):
        raise HTTPException(status_code=400, detail="name and age are required")

    patient_id = str(uuid.uuid4())
    patient = models.Patient(
        patient_id=patient_id,
        name=data["name"],
        age=int(data["age"]),
        language=data.get("language", "hi")
    )
    db.add(patient)
    db.commit()
    return {"patient_id": patient_id, "message": "Patient registered successfully"}


# ─────────────────────────────────────────────
# ENDPOINT 2 — GET FULL PATIENT RECORD
# ─────────────────────────────────────────────

@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient.to_dict()


# ─────────────────────────────────────────────
# ENDPOINT 3 — GET DEPARTMENT STATUS
# ─────────────────────────────────────────────

@app.get("/api/patients/{patient_id}/status")
def get_status(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {
        "pharmacy": patient.pharmacy_status,
        "lab": patient.lab_status,
        "diagnostics": patient.diagnostics_status
    }


# ─────────────────────────────────────────────
# ENDPOINT 4 — AUDIO TRANSCRIPTION
# Calls transcribe_audio_real from ai_pipeline_connector
# Falls back to a mock if pipeline unavailable
# ─────────────────────────────────────────────

@app.post("/api/audio/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
    language: str = Form(default="hi")
):
    audio_bytes = await audio.read()

    if AI_PIPELINE_AVAILABLE:
        try:
            result = transcribe_audio_real(audio_bytes, language)
            return result
        except Exception as e:
            print(f"[Transcribe] Pipeline error: {e}, falling back to mock")

    # Fallback mock if pipeline unavailable
    return {
        "transcript": "Patient reports fever and headache for 2 days (AI pipeline unavailable — mock response)",
        "language": language
    }


# ─────────────────────────────────────────────
# ENDPOINT 5 — CONSULTATION ANALYSIS
# Calls extract_medical_record_real from ai_pipeline_connector
# Falls back to a mock if pipeline unavailable
# ─────────────────────────────────────────────

@app.post("/api/consultation/analyze")
def analyze_consultation(data: dict):
    transcript = data.get("transcript", "")
    language = data.get("language", "en")

    if AI_PIPELINE_AVAILABLE and transcript.strip():
        # Check cache first — saves Groq API credits on repeated calls
        cached = _cached_analyze(transcript, language)
        if cached:
            return cached
        try:
            result = extract_medical_record_real(transcript, language)
            _save_cache(transcript, language, result)
            return result
        except Exception as e:
            print(f"[Analyze] Pipeline error: {e}, falling back to mock")

    # Fallback mock
    return {
        "symptoms": ["fever", "headache", "body ache"],
        "diagnosis": "Viral fever",
        "secondary_diagnoses": [],
        "icd10_code": "B34.9",
        "prescription": [
            {"drug": "Paracetamol", "dose": "500mg", "freq": "TDS", "days": 5},
            {"drug": "Cetirizine", "dose": "10mg", "freq": "OD", "days": 3}
        ],
        "lab_tests": ["CBC", "CRP"],
        "follow_up": "5 days",
        "notes": "Mock response — AI pipeline not connected or transcript empty",
        "ambiguous_terms": []
    }


# ─────────────────────────────────────────────
# ENDPOINT 6 — SAVE AI-GENERATED RECORD
# ─────────────────────────────────────────────

@app.post("/api/patients/{patient_id}/record")
def save_record(patient_id: str, data: dict, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if "symptoms" in data:
        patient.symptoms_json = json.dumps(data["symptoms"])
    if "diagnosis" in data:
        patient.diagnosis = data["diagnosis"]
    if "secondary_diagnoses" in data:
        patient.secondary_diagnoses_json = json.dumps(data["secondary_diagnoses"])
    if "icd10_code" in data:
        patient.icd10_code = data["icd10_code"]
    if "prescription" in data:
        patient.prescription_json = json.dumps(data["prescription"])
    if "lab_tests" in data:
        patient.lab_tests_json = json.dumps(data["lab_tests"])
    if "follow_up" in data:
        patient.follow_up = data["follow_up"]
    if "notes" in data:
        patient.notes = data["notes"]
    if "ambiguous_terms" in data:
        patient.ambiguous_terms_json = json.dumps(data["ambiguous_terms"])

    db.commit()
    return {"message": "Record saved successfully"}


# ─────────────────────────────────────────────
# ENDPOINT 7 — PHARMACY UPDATE
# ─────────────────────────────────────────────

@app.put("/api/patients/{patient_id}/pharmacy")
def update_pharmacy(patient_id: str, data: dict, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    allowed = ["pending", "dispensed"]
    new_status = data.get("status", "dispensed")
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed}")

    patient.pharmacy_status = new_status
    db.commit()
    return {"message": f"Pharmacy status updated to {new_status}"}


# ─────────────────────────────────────────────
# ENDPOINT 8 — LAB UPDATE
# ─────────────────────────────────────────────

@app.put("/api/patients/{patient_id}/lab")
def update_lab(patient_id: str, data: dict, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    allowed = ["pending", "results_ready"]
    new_status = data.get("status", "results_ready")
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Status must be one of {allowed}")

    patient.lab_status = new_status
    if "results" in data:
        patient.lab_results_json = json.dumps(data["results"])
    db.commit()
    return {"message": f"Lab status updated to {new_status}"}


# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────

@app.get("/api/health")
def health():
    cache_count = len([f for f in os.listdir(CACHE_DIR) if f.endswith(".json")]) if os.path.exists(CACHE_DIR) else 0
    return {
        "status": "ok",
        "time": str(datetime.now()),
        "ai_pipeline": "connected" if AI_PIPELINE_AVAILABLE else "unavailable (mock mode)",
        "cache_entries": cache_count
    }

@app.delete("/api/cache/clear")
def clear_cache():
    """Dev utility — clears the LLM response cache to force fresh Groq calls."""
    cleared = 0
    if os.path.exists(CACHE_DIR):
        for f in os.listdir(CACHE_DIR):
            if f.endswith(".json"):
                os.remove(os.path.join(CACHE_DIR, f))
                cleared += 1
    return {"message": f"Cleared {cleared} cached entries"}
