# Doctify — Doctor-Patient Interaction Language Translator
## PRD & Implementation Log

### Original Problem Statement
Integration audit and deployment of a multi-contributor clinical voice system. Three contributors (Frontend, Backend, AI Pipeline) merged code. Task: wire AI pipeline into backend endpoints, fix env/port issues, deploy to staging URL.

### Architecture
- **Frontend**: React 19 (Create React App) — dark clinical UI with teal accent theme (DM Sans + DM Mono fonts)
- **Backend**: FastAPI + SQLite (SQLAlchemy) — runs on port 8001 via Emergent supervisor
- **AI Pipeline**: Groq LLM + Sarvam AI (STT, Translation, TTS)
- **Storage**: SQLite (clinical.db) — patient records, prescriptions, lab results

### Core Screens
1. **RegisterPatient** — Name, Age, Language selection (Hindi/Tamil/Kannada/Telugu/Malayalam)
2. **VoiceConsultation** — Record audio → Transcribe (Sarvam STT) → Review → Analyze (Groq) → Save
3. **DoctorDashboard** — Full clinical record view: symptoms, diagnosis, ICD-10, prescription table, lab tests
4. **PharmacyPortal** — Drug checklist, dispense confirmation
5. **LabPortal** — Per-test result entry, submit results
6. **PatientStatus** — Live journey tracker, auto-refresh every 5s

### AI Pipeline Flow
```
Audio (WAV) → Sarvam STT → Transcript
Transcript → (if non-English) Sarvam Translate → English
English Transcript → Groq LLM (with Indian Medical Glossary) → Structured JSON
{symptoms, diagnosis, icd10_code, prescription[], lab_tests[], follow_up, notes, ambiguous_terms}
```

### Indian Medical Glossary
Resolves colloquial terms: sugar→Diabetes(E11), BP→Hypertension(I10), body heat→pyrexia/hot flush, fits→Epilepsy, gas trouble→GERD/Gastritis, etc.

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/patients/register | Register new patient |
| GET | /api/patients/{id} | Get full patient record |
| GET | /api/patients/{id}/status | Get dept status |
| POST | /api/audio/transcribe | STT via Sarvam AI |
| POST | /api/consultation/analyze | AI medical extraction via Groq |
| POST | /api/patients/{id}/record | Save medical record |
| PUT | /api/patients/{id}/pharmacy | Update pharmacy status |
| PUT | /api/patients/{id}/lab | Update lab status |
| GET | /api/health | Health + pipeline status |

### Environment Variables
- `GROQ_API_KEY` — Groq LLM for medical record extraction
- `SARVAM_API_KEY` — Sarvam AI for STT and translation
- `REACT_APP_BACKEND_URL` — Frontend API base URL

### Integration Issues Found & Fixed (2026-03-13 — Session 2)
1. ❌→✅ Sarvam STT model `saarika:v2` deprecated → updated to `saarika:v2.5`
2. ❌→✅ Browser records WebM but was labelled as `audio/wav` → real WAV conversion via AudioContext (16kHz mono PCM)
3. ❌→✅ Language not passed to STT/LLM calls → fetches patient language and passes to both APIs
4. ✅ Role-based login (Doctor / Pharmacy / Lab / Reception) with seeded default users
5. ✅ Patient dropdown for Doctor Dashboard (sorted critical→urgent→normal)
6. ✅ Urgency flag (auto-detect from AI notes + manual doctor override)
7. ✅ Prescription edit/approve/reject workflow with follow-up date
8. ✅ Null fields editable inline by doctor (NullableField component)
9. ✅ DB schema migration (ALTER TABLE adds new columns without data loss)
1. ❌→✅ `backend/main.py` had MOCK data in both AI endpoints — replaced with real `transcribe_audio_real()` + `extract_medical_record_real()` calls
2. ❌→✅ `api.js` had hardcoded `localhost:8000` — updated to use `REACT_APP_BACKEND_URL`
3. ❌→✅ Backend file renamed `main.py` → `server.py` (Emergent requirement)
4. ❌→✅ Backend port was 8000, Emergent needs 8001 (supervisor handles this)
5. ❌→✅ AI pipeline path added to `sys.path` in server.py for module resolution

### Test Results (2026-03-13)
- Backend: 100% (14/14 tests passed)
- Frontend: 80% (Register + VoiceConsultation flow working; Playwright selector precision issue for nav)
- AI Pipeline: Connected and returning real structured medical records

### Staging URL
https://56300e56-72ff-4298-8e0f-a6df602f08ee.preview.emergentagent.com

### Prioritized Backlog
**P0 (Critical)**
- None outstanding

**P1 (High)**
- Audio transcription end-to-end test with real WAV (Sarvam STT)
- Add data-testid attributes to all interactive elements

**P2 (Nice to have)**
- Text-to-Speech feedback for patients (generate_patient_audio)
- Patient language detection from audio
- Pagination for patient list
- Export record as PDF

### Next Tasks
- Test audio recording in browser and verify Sarvam STT integration
- Add caching layer for LLM calls (already implemented in pipeline.py as extract_medical_record_cached)
- Secure API keys in production (move to proper secrets management)
