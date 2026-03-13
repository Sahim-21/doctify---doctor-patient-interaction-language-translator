"""
server.py — FastAPI backend for ClinixAI / Doctify
Runs on port 8001 via Emergent supervisor
"""
import sys, os, json, hashlib, uuid
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

# Add ai-pipeline to path
AI_PIPELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ai-pipeline')
sys.path.insert(0, AI_PIPELINE_PATH)

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, SessionLocal, get_db
import model as models

# ── AI pipeline ──────────────────────────────
try:
    from ai_pipeline_connector import transcribe_audio_real, extract_medical_record_real
    AI_PIPELINE_AVAILABLE = True
    print("[Startup] AI pipeline loaded")
except Exception as e:
    AI_PIPELINE_AVAILABLE = False
    print(f"[Startup] AI pipeline unavailable: {e}")

# ── LLM response cache ────────────────────────
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache")

def _cache_get(transcript: str, language: str):
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.md5(f"{transcript.strip()}|{language}".encode()).hexdigest()[:12]
    path = os.path.join(CACHE_DIR, f"{key}.json")
    if os.path.exists(path):
        print(f"[Cache] Hit {key}")
        with open(path) as f:
            return json.load(f)
    return None

def _cache_put(transcript: str, language: str, result: dict):
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.md5(f"{transcript.strip()}|{language}".encode()).hexdigest()[:12]
    with open(os.path.join(CACHE_DIR, f"{key}.json"), "w") as f:
        json.dump(result, f, indent=2)

# ── App setup ─────────────────────────────────
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ClinixAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup: schema migration + seed users ────

@app.on_event("startup")
def migrate_and_seed():
    db = SessionLocal()
    # Add new columns if they don't exist (SQLite migration)
    with engine.connect() as conn:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(patients)"))}
        new_cols = [
            ("urgency_level",       "VARCHAR DEFAULT 'normal'"),
            ("prescription_status", "VARCHAR DEFAULT 'pending'"),
            ("follow_up_date",      "VARCHAR"),
            ("transcript",          "TEXT"),
            ("phone",               "VARCHAR"),
        ]
        for col, definition in new_cols:
            if col not in existing:
                conn.execute(text(f"ALTER TABLE patients ADD COLUMN {col} {definition}"))
        conn.commit()

    # Seed default users
    DEFAULT_USERS = [
        ("doctor",    "doctor123",    "doctor",    "Dr. Rajan Kumar"),
        ("pharmacy",  "pharmacy123",  "pharmacy",  "Pharmacist Priya"),
        ("lab",       "lab123",       "lab",       "Lab Tech Suresh"),
        ("reception", "reception123", "reception", "Receptionist Meena"),
    ]
    for username, password, role, display_name in DEFAULT_USERS:
        if not db.query(models.User).filter(models.User.username == username).first():
            db.add(models.User(username=username, password=password, role=role, display_name=display_name))
    db.commit()
    db.close()


# ── AUTH ──────────────────────────────────────

@app.post("/api/auth/login")
def login(data: dict, db: Session = Depends(get_db)):
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or user.password != password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "display_name": user.display_name,
    }


# ── PATIENTS ──────────────────────────────────

@app.post("/api/patients/register")
def register_patient(data: dict, db: Session = Depends(get_db)):
    if not data.get("name") or not data.get("age"):
        raise HTTPException(status_code=400, detail="name and age required")
    patient_id = str(uuid.uuid4())
    patient = models.Patient(
        patient_id=patient_id,
        name=data["name"],
        age=int(data["age"]),
        language=data.get("language", "hi"),
        phone=data.get("phone") or None,
        urgency_level="normal",
        prescription_status="pending",
    )
    db.add(patient)
    db.commit()
    return {"patient_id": patient_id, "message": "Patient registered successfully"}


@app.get("/api/patients")
def list_patients(db: Session = Depends(get_db)):
    """Return all patients sorted: critical → urgent → normal, then newest first."""
    URGENCY_ORDER = {"critical": 0, "urgent": 1, "normal": 2}
    patients = db.query(models.Patient).all()
    patients.sort(key=lambda p: (
        URGENCY_ORDER.get(p.urgency_level or "normal", 2),
        -(p.created_at.timestamp() if p.created_at else 0)
    ))
    return [p.to_list_item() for p in patients]


@app.get("/api/patients/{patient_id}")
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p.to_dict()


@app.get("/api/patients/{patient_id}/status")
def get_status(patient_id: str, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {
        "pharmacy": p.pharmacy_status,
        "lab": p.lab_status,
        "diagnostics": p.diagnostics_status,
    }


# ── AUDIO TRANSCRIPTION ───────────────────────

@app.post("/api/audio/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
    language: str = Form(default="hi"),
):
    audio_bytes = await audio.read()
    if AI_PIPELINE_AVAILABLE:
        try:
            result = transcribe_audio_real(audio_bytes, language)
            return result
        except Exception as e:
            print(f"[Transcribe] Error: {e}")
    return {
        "transcript": "Transcription failed — please type the consultation manually.",
        "language": language,
    }


# ── CONSULTATION ANALYSIS ─────────────────────

@app.post("/api/consultation/analyze")
def analyze_consultation(data: dict, db: Session = Depends(get_db)):
    transcript = data.get("transcript", "")
    language = data.get("language", "en")
    patient_id = data.get("patient_id")

    if not transcript.strip():
        return _mock_record()

    if AI_PIPELINE_AVAILABLE:
        cached = _cache_get(transcript, language)
        if cached:
            result = cached
        else:
            try:
                result = extract_medical_record_real(transcript, language)
                _cache_put(transcript, language, result)
            except Exception as e:
                print(f"[Analyze] Error: {e}")
                result = _mock_record()
    else:
        result = _mock_record()

    # Auto-detect urgency from AI notes
    urgency = "normal"
    if "URGENT" in (result.get("notes") or "").upper():
        urgency = "urgent"

    # Null out fields the AI didn't actually extract
    result = _nullify_empty(result)

    # If patient_id given, persist urgency + transcript now
    if patient_id:
        p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
        if p:
            p.urgency_level = urgency
            p.transcript = transcript
            db.commit()

    result["urgency_level"] = urgency
    return result


def _nullify_empty(record: dict) -> dict:
    """Replace empty strings / empty lists with None so the UI shows null fields."""
    for key, val in record.items():
        if val == "" or val == []:
            record[key] = None
    return record


def _mock_record() -> dict:
    return {
        "symptoms": None,
        "diagnosis": None,
        "secondary_diagnoses": None,
        "icd10_code": None,
        "prescription": None,
        "lab_tests": None,
        "follow_up": None,
        "notes": "Mock — AI pipeline not available",
        "ambiguous_terms": None,
    }


# ── SAVE RECORD ───────────────────────────────

@app.post("/api/patients/{patient_id}/record")
def save_record(patient_id: str, data: dict, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    if "symptoms" in data:
        p.symptoms_json = json.dumps(data["symptoms"]) if data["symptoms"] is not None else None
    if "diagnosis" in data:
        p.diagnosis = data["diagnosis"] or None
    if "secondary_diagnoses" in data:
        p.secondary_diagnoses_json = json.dumps(data["secondary_diagnoses"]) if data["secondary_diagnoses"] is not None else None
    if "icd10_code" in data:
        p.icd10_code = data["icd10_code"] or None
    if "prescription" in data:
        p.prescription_json = json.dumps(data["prescription"]) if data["prescription"] is not None else None
    if "lab_tests" in data:
        p.lab_tests_json = json.dumps(data["lab_tests"]) if data["lab_tests"] is not None else None
    if "follow_up" in data:
        p.follow_up = data["follow_up"] or None
    if "follow_up_date" in data:
        p.follow_up_date = data["follow_up_date"] or None
    if "notes" in data:
        p.notes = data["notes"] or None
    if "ambiguous_terms" in data:
        p.ambiguous_terms_json = json.dumps(data["ambiguous_terms"]) if data["ambiguous_terms"] is not None else None
    if "urgency_level" in data:
        p.urgency_level = data["urgency_level"] or "normal"
    if "transcript" in data:
        p.transcript = data["transcript"] or None

    db.commit()
    return {"message": "Record saved"}


# ── URGENCY ───────────────────────────────────

@app.put("/api/patients/{patient_id}/urgency")
def update_urgency(patient_id: str, data: dict, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    level = data.get("urgency_level", "normal")
    if level not in ("normal", "urgent", "critical"):
        raise HTTPException(status_code=400, detail="Invalid urgency level")
    p.urgency_level = level
    db.commit()
    return {"message": f"Urgency set to {level}"}


# ── PRESCRIPTION APPROVE / REJECT ─────────────

@app.put("/api/patients/{patient_id}/prescription/approve")
def approve_prescription(patient_id: str, data: dict, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    # Allow updating prescription drugs at approval time
    if "prescription" in data and data["prescription"] is not None:
        p.prescription_json = json.dumps(data["prescription"])
    if "follow_up" in data:
        p.follow_up = data["follow_up"] or None
    if "follow_up_date" in data:
        p.follow_up_date = data["follow_up_date"] or None
    p.prescription_status = "approved"
    db.commit()
    return {"message": "Prescription approved"}


@app.put("/api/patients/{patient_id}/prescription/reject")
def reject_prescription(patient_id: str, data: dict, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    p.prescription_status = "rejected"
    if "reason" in data:
        p.notes = (p.notes or "") + f"\n[Rejected: {data['reason']}]"
    db.commit()
    return {"message": "Prescription rejected"}


# ── PHARMACY ──────────────────────────────────

@app.put("/api/patients/{patient_id}/pharmacy")
def update_pharmacy(patient_id: str, data: dict, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    status = data.get("status", "dispensed")
    if status not in ("pending", "dispensed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    p.pharmacy_status = status
    db.commit()
    return {"message": f"Pharmacy updated to {status}"}


# ── LAB ───────────────────────────────────────

@app.put("/api/patients/{patient_id}/lab")
def update_lab(patient_id: str, data: dict, db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    status = data.get("status", "results_ready")
    if status not in ("pending", "results_ready"):
        raise HTTPException(status_code=400, detail="Invalid status")
    p.lab_status = status
    if "results" in data:
        p.lab_results_json = json.dumps(data["results"])
    db.commit()
    return {"message": f"Lab updated to {status}"}


# ── HEALTH + CACHE ────────────────────────────

@app.get("/api/health")
def health():
    cache_count = len([f for f in os.listdir(CACHE_DIR) if f.endswith(".json")]) if os.path.exists(CACHE_DIR) else 0
    return {
        "status": "ok",
        "time": str(datetime.now()),
        "ai_pipeline": "connected" if AI_PIPELINE_AVAILABLE else "mock",
        "cache_entries": cache_count,
    }


@app.delete("/api/cache/clear")
def clear_cache():
    cleared = 0
    if os.path.exists(CACHE_DIR):
        for f in os.listdir(CACHE_DIR):
            if f.endswith(".json"):
                os.remove(os.path.join(CACHE_DIR, f))
                cleared += 1
    return {"message": f"Cleared {cleared} entries"}
