# API Specification — Clinical Voice System
# This file is the single source of truth for all API contracts.
# All three members must follow this exactly. Never change field names.

---

## Base URL

```
http://localhost:8000
```

---

## Allowed field values

### language codes
```
"hi"   = Hindi
"ta"   = Tamil
"kn"   = Kannada
"te"   = Telugu
"ml"   = Malayalam
```

### pharmacy status values (ONLY these four strings, nothing else)
```
"pending"         = not yet dispensed
"dispensed"       = drugs given to patient
```

### lab status values (ONLY these four strings, nothing else)
```
"pending"         = test not yet done
"results_ready"   = results uploaded
```

### diagnostics status values
```
"pending"         = scan ordered but not done
"completed"       = scan done
"not_required"    = no scan ordered
```

### prescription freq values (common abbreviations)
```
"OD"    = once daily
"BD"    = twice daily
"TDS"   = three times daily
"QID"   = four times daily
"SOS"   = as needed
```

---

## Endpoints

---

### 1. Register Patient

**Who calls this:** Member 1 (frontend) — RegisterPatient screen

```
POST /api/patients/register
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Ravi Kumar",
  "age": 34,
  "language": "hi"
}
```

**Response:**
```json
{
  "patient_id": "a3f7bc12-9d44-4e2a-b8c1-123456789abc",
  "message": "Patient registered successfully"
}
```

**Error (400):**
```json
{
  "detail": "name and age are required"
}
```

---

### 2. Get Full Patient Record

**Who calls this:** Member 1 (frontend) — DoctorDashboard, PharmacyPortal, LabPortal

```
GET /api/patients/:patient_id
```

**No request body.**

**Response (full patient JSON — always this exact shape):**
```json
{
  "patient_id": "a3f7bc12-9d44-4e2a-b8c1-123456789abc",
  "name": "Ravi Kumar",
  "age": 34,
  "language": "hi",
  "symptoms": ["fever", "headache", "body ache"],
  "diagnosis": "Viral fever",
  "icd10_code": "B34.9",
  "prescription": [
    {
      "drug": "Paracetamol",
      "dose": "500mg",
      "freq": "TDS",
      "days": 5
    }
  ],
  "lab_tests": ["CBC", "CRP"],
  "follow_up": "5 days",
  "notes": "Patient is allergic to aspirin",
  "created_at": "2026-03-13T10:30:00Z",
  "status": {
    "pharmacy": "pending",
    "lab": "pending",
    "diagnostics": "not_required"
  }
}
```

**Error (404):**
```json
{
  "detail": "Patient not found"
}
```

---

### 3. Get Department Status Only

**Who calls this:** Member 1 (frontend) — PatientStatus screen (polls every 5 seconds)

```
GET /api/patients/:patient_id/status
```

**No request body.**

**Response:**
```json
{
  "pharmacy": "pending",
  "lab": "pending",
  "diagnostics": "not_required"
}
```

---

### 4. Transcribe Audio

**Who calls this:** Member 1 (frontend) — VoiceConsultation screen
**Who handles this internally:** Member 3 (AI pipeline) plugs in here

```
POST /api/audio/transcribe
Content-Type: multipart/form-data
```

**Request body (FormData — NOT JSON):**
```
audio       = WAV audio blob
patient_id  = "a3f7bc12-9d44-4e2a-b8c1-123456789abc"
```

**Response:**
```json
{
  "transcript": "Patient says they have had fever and headache for 2 days",
  "language": "hi"
}
```

**Notes:**
- Do NOT set Content-Type header manually — browser sets it automatically for FormData
- Audio must be WAV format
- `language` in response is the detected/input language code (hi, ta, kn, te, ml)

---

### 5. Analyze Consultation (AI Extraction)

**Who calls this:** Member 1 (frontend) — after transcript is confirmed
**Who handles this internally:** Member 3 (AI pipeline) plugs in here

```
POST /api/consultation/analyze
Content-Type: application/json
```

**Request body:**
```json
{
  "transcript": "Doctor said the patient has viral fever. Prescribed Paracetamol 500mg TDS for 5 days. CBC and CRP ordered. Follow up in 5 days.",
  "patient_id": "a3f7bc12-9d44-4e2a-b8c1-123456789abc"
}
```

**Response (structured medical JSON — EXACT field names, no variation allowed):**
```json
{
  "symptoms": ["fever", "headache", "body ache"],
  "diagnosis": "Viral fever",
  "icd10_code": "B34.9",
  "prescription": [
    {
      "drug": "Paracetamol",
      "dose": "500mg",
      "freq": "TDS",
      "days": 5
    }
  ],
  "lab_tests": ["CBC", "CRP"],
  "follow_up": "5 days",
  "notes": ""
}
```

**CRITICAL — field name rules (Member 3 must follow these exactly):**
```
"lab_tests"   ← NOT "labTests", NOT "lab_test", NOT "tests"
"icd10_code"  ← NOT "icd_10", NOT "icdCode", NOT "icd"
"prescription" ← always a LIST, even for single drug
"days"        ← always INTEGER (5, not "5")
"symptoms"    ← always a LIST of strings
"follow_up"   ← NOT "followup", NOT "followUp"
```

---

### 6. Save Record to Database

**Who calls this:** Member 1 (frontend) — after analyze step confirms the record
**Also called by:** Member 3 (AI pipeline) — directly after extraction (optional)

```
POST /api/patients/:patient_id/record
Content-Type: application/json
```

**Request body (same shape as analyze response):**
```json
{
  "symptoms": ["fever", "headache"],
  "diagnosis": "Viral fever",
  "icd10_code": "B34.9",
  "prescription": [
    {
      "drug": "Paracetamol",
      "dose": "500mg",
      "freq": "TDS",
      "days": 5
    }
  ],
  "lab_tests": ["CBC", "CRP"],
  "follow_up": "5 days",
  "notes": ""
}
```

**Response:**
```json
{
  "message": "Record saved successfully"
}
```

---

### 7. Update Pharmacy Status

**Who calls this:** Member 1 (frontend) — PharmacyPortal screen

```
PUT /api/patients/:patient_id/pharmacy
Content-Type: application/json
```

**Request body:**
```json
{
  "status": "dispensed"
}
```

**Allowed status values:** `"pending"` or `"dispensed"` only

**Response:**
```json
{
  "message": "Pharmacy status updated to dispensed"
}
```

**Error (400):**
```json
{
  "detail": "Status must be one of ['pending', 'dispensed']"
}
```

---

### 8. Update Lab Status

**Who calls this:** Member 1 (frontend) — LabPortal screen

```
PUT /api/patients/:patient_id/lab
Content-Type: application/json
```

**Request body:**
```json
{
  "status": "results_ready",
  "results": {
    "CBC": "WBC 8000, RBC 4.5, Platelets 2.5 lakh — Normal",
    "CRP": "12 mg/L — Mildly elevated"
  }
}
```

**Allowed status values:** `"pending"` or `"results_ready"` only

**Response:**
```json
{
  "message": "Lab status updated to results_ready"
}
```

---

### 9. Health Check

**Who calls this:** Anyone — to verify the server is running

```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "time": "2026-03-13T10:30:00"
}
```

---

## Hardcoded mock responses (for development before AI pipeline is ready)

Member 2 uses these as mock return values in endpoints 4 and 5.
Member 1 can use these to build UI without waiting for anyone.

### Mock transcript response
```json
{
  "transcript": "Patient says they have had fever and headache for 2 days. Doctor says it looks like viral fever and prescribes Paracetamol 500mg three times a day for 5 days. CBC and CRP blood tests ordered. Follow up in 5 days.",
  "language": "hi"
}
```

### Mock analyze response
```json
{
  "symptoms": ["fever", "headache", "body ache"],
  "diagnosis": "Viral fever",
  "icd10_code": "B34.9",
  "prescription": [
    {
      "drug": "Paracetamol",
      "dose": "500mg",
      "freq": "TDS",
      "days": 5
    },
    {
      "drug": "Cetirizine",
      "dose": "10mg",
      "freq": "OD",
      "days": 3
    }
  ],
  "lab_tests": ["CBC", "CRP"],
  "follow_up": "5 days",
  "notes": "Mock response — AI pipeline not yet connected"
}
```

### Mock patient record (for GET /api/patients/:id when no real patient exists)
```json
{
  "patient_id": "mock-patient-001",
  "name": "Test Patient",
  "age": 34,
  "language": "hi",
  "symptoms": ["fever", "headache"],
  "diagnosis": "Viral fever",
  "icd10_code": "B34.9",
  "prescription": [
    {
      "drug": "Paracetamol",
      "dose": "500mg",
      "freq": "TDS",
      "days": 5
    }
  ],
  "lab_tests": ["CBC"],
  "follow_up": "5 days",
  "notes": "",
  "created_at": "2026-03-13T10:30:00Z",
  "status": {
    "pharmacy": "pending",
    "lab": "pending",
    "diagnostics": "not_required"
  }
}
```

---

## Common mistakes that cause silent bugs (read before coding)

```
WRONG                          RIGHT
-------                        -----
patientId                      patient_id
labTests                       lab_tests
icdCode / icd_10               icd10_code
followup / followUp            follow_up
"days": "5"                    "days": 5         (integer, not string)
prescription: {}               prescription: []  (list, not object)
symptoms: "fever"              symptoms: ["fever"] (list, not string)
PUT /pharmacy with no body     always send { "status": "dispensed" }
POST with FormData + JSON      audio = FormData only, all others = JSON
```

---

## Integration checklist (do this before demo)

- [ ] Member 2: `curl http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] Member 2: POST register returns a real UUID
- [ ] Member 2: GET patient with that UUID returns full JSON
- [ ] Member 1: RegisterPatient screen gets UUID and moves to next screen
- [ ] Member 1: VoiceConsultation sends audio and gets transcript back
- [ ] Member 3: `python test_pipeline.py` runs without errors
- [ ] Member 3: `ai_pipeline_connector.py` is shared with Member 2
- [ ] Member 2: replaces mock in transcribe endpoint with real function
- [ ] Member 2: replaces mock in analyze endpoint with real function
- [ ] Full flow: speak Tamil → transcript → AI record → pharmacy shows prescription
