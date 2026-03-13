from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid, json
from datetime import datetime

from database import engine, get_db
import model as models

# Create all database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Clinical Voice System API")

# CORS — required so Member 1's frontend on port 3000 can call this server on port 8000
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
    """
    Member 1 calls this when a patient arrives.
    Returns patient_id (UUID) used for every subsequent call.
    """
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
    """
    Member 1 calls this to display the full patient record.
    Returns exact JSON shape from shared contract.
    """
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
    """
    Member 1's status board polls this every 5 seconds.
    Returns only the 3 department status values.
    """
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
# Starts as mock. Member 3 replaces the marked section.
# URL and response shape never change.
# ─────────────────────────────────────────────

@app.post("/api/audio/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
    language: str = Form(default="hi")
):
    """
    Member 1 sends WAV audio blob here via FormData.
    Returns transcript text and language code.
    """
    audio_bytes = await audio.read()

    # ── MEMBER 3 REPLACES THIS SECTION ──────────────────
    # When Member 3 is ready, replace mock with:
    #
    # import sys
    # sys.path.append("../ai-pipeline")
    # from ai_pipeline_connector import transcribe_audio_real
    # result = transcribe_audio_real(audio_bytes, language)
    # return result
    #
    # Until then, use mock:
    transcript = "Patient says they have had fever and headache for 2 days"
    detected_language = language
    # ── END MEMBER 3 SECTION ────────────────────────────

    return {"transcript": transcript, "language": detected_language}


# ─────────────────────────────────────────────
# ENDPOINT 5 — CONSULTATION ANALYSIS
# Starts as mock. Member 3 replaces the marked section.
# URL and response shape never change.
# ─────────────────────────────────────────────

@app.post("/api/consultation/analyze")
def analyze_consultation(data: dict):
    """
    Receives confirmed transcript and returns structured medical JSON.
    Shape must include all fields in shared contract.
    """
    transcript = data.get("transcript", "")
    language = data.get("language", "en")

    # ── MEMBER 3 REPLACES THIS SECTION ──────────────────
    # When Member 3 is ready, replace mock with:
    #
    # import sys
    # sys.path.append("../ai-pipeline")
    # from ai_pipeline_connector import extract_medical_record_real
    # return extract_medical_record_real(transcript, language)
    #
    # Until then, use mock:
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
        "notes": "Mock response — AI pipeline not yet connected",
        "ambiguous_terms": []
    }
    # ── END MEMBER 3 SECTION ────────────────────────────


# ─────────────────────────────────────────────
# ENDPOINT 6 — SAVE AI-GENERATED RECORD
# ─────────────────────────────────────────────

@app.post("/api/patients/{patient_id}/record")
def save_record(patient_id: str, data: dict, db: Session = Depends(get_db)):
    """
    Member 3's pipeline and Member 1's frontend both call this.
    Saves structured medical data into the patient record in database.
    Only updates fields that are provided — leaves others unchanged.
    """
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
    """
    Member 1's pharmacy portal calls this when drugs are dispensed.
    Allowed values: "pending", "dispensed"
    """
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
    """
    Member 1's lab portal calls this when results are uploaded.
    Allowed values: "pending", "results_ready"
    """
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

@app.get("/health")
def health():
    return {"status": "ok", "time": str(datetime.now())}