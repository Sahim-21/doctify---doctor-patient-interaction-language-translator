# Doctify — Local Setup Guide

## Prerequisites
- Python 3.11+
- Node.js 18+ and Yarn
- API Keys: `GROQ_API_KEY` and `SARVAM_API_KEY`

---

## 1. Clone the Repo
```bash
git clone https://github.com/Sahim-21/doctify---doctor-patient-interaction-language-translator.git
cd doctify---doctor-patient-interaction-language-translator
```

---

## 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy python-multipart groq requests python-dotenv

# Create .env file (DO NOT commit this)
cat > .env << EOF
GROQ_API_KEY=your_groq_key_here
SARVAM_API_KEY=your_sarvam_key_here
EOF

# Start the backend server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend will be live at: **http://localhost:8001**
Health check: **http://localhost:8001/api/health**

---

## 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
yarn install

# Create .env file
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Start frontend
yarn start
```

Frontend will open at: **http://localhost:3000**

---

## 4. How to Test Voice Recognition (Sarvam STT)

### Step-by-Step:

1. Open **http://localhost:3000** in Chrome or Firefox
2. Click **Register** → Fill in patient name, age, and choose a language (e.g. **Tamil**)
3. Click **Register & Begin Consultation** → You'll be taken to the Voice Consultation screen
4. Click the **microphone button** → Allow microphone access when prompted
5. **Speak clearly** in the patient's language, for example in Tamil:
   > *"Enakku sarkarai noi irukku, BP problem um irukku, moochu viDa kastam"*
   (= "I have diabetes, BP problem, and difficulty breathing")
   
   Or in Hindi:
   > *"Mujhe sugar hai, BP bhi hai, do din se bukhar aur sir dard bhi hai"*
   (= "I have diabetes, BP, fever and headache for 2 days")

6. Click the **stop button** → Audio is sent to **Sarvam STT API**
7. Review the transcript that appears — you can edit it if needed
8. Click **Analyze & Generate Record** → Groq LLM extracts structured medical record
9. Click **View Full Record** → Go to Doctor Dashboard to see the full clinical record

### What the AI resolves:
| What you say | What AI extracts |
|---|---|
| "sugar" / "sarkarai noi" | Diabetes Mellitus Type 2 (E11.9) |
| "BP" / "raktachaap" | Hypertension (I10) |
| "body heat" / "udal veppam" | Pyrexia / Hot flush |
| "fits" / "mirgi" | Epilepsy (G40.909) |
| "gas trouble" | GERD / Gastritis |
| "saans nahi aati" | Dyspnea (R06.0) |

---

## 5. API Quick Reference

```bash
# Health check
curl http://localhost:8001/api/health

# Register patient
curl -X POST http://localhost:8001/api/patients/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","age":45,"language":"hi"}'

# Analyze consultation (text-based test, no audio needed)
curl -X POST http://localhost:8001/api/consultation/analyze \
  -H "Content-Type: application/json" \
  -d '{"transcript":"Patient has sugar and BP. Fits last month. Prescribe Metformin 500mg BD.","language":"en"}'

# Test audio transcription with a WAV file
curl -X POST http://localhost:8001/api/audio/transcribe \
  -F "audio=@/path/to/sample.wav" \
  -F "patient_id=test-123" \
  -F "language=hi"

# Clear LLM cache (to force fresh Groq calls)
curl -X DELETE http://localhost:8001/api/cache/clear
```

---

## 6. Project Structure

```
doctify/
├── ai-pipeline/                  # Member 3 — AI pipeline
│   ├── ai_pipeline_connector.py  # Interface file (only import this)
│   ├── pipeline.py               # Groq + Sarvam implementations
│   └── glossary.py               # Indian medical language glossary
├── backend/
│   ├── server.py                 # FastAPI app (integrated with AI pipeline)
│   ├── database.py               # SQLite setup
│   ├── model.py                  # Patient SQLAlchemy model
│   └── .env.example              # Template (copy to .env)
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app with sidebar navigation
│   │   ├── api.js                # All API calls (uses REACT_APP_BACKEND_URL)
│   │   └── screens/
│   │       ├── RegisterPatient.jsx
│   │       ├── VoiceConsultation.jsx
│   │       ├── DoctorDashboard.jsx
│   │       ├── PharmacyPortal.jsx
│   │       ├── LabPortal.jsx
│   │       └── PatientStatus.jsx
│   └── .env.example              # Template (copy to .env)
└── docs/                         # Shared contract JSON schemas
```

---

## 7. Common Issues

### "Sarvam STT returns empty transcript"
- Check your SARVAM_API_KEY is valid
- Make sure you're speaking clearly in the selected language
- Chrome records in WebM format — Sarvam accepts webm/ogg/wav

### "Groq API rate limit"
- The cache is enabled by default — same transcript uses cached result
- Clear cache with: `curl -X DELETE http://localhost:8001/api/cache/clear`

### "Microphone permission denied"
- Chrome requires HTTPS for mic access on non-localhost URLs
- For local development, `localhost` works without HTTPS
