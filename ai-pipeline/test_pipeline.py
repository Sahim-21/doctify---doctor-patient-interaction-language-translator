import requests
import json
import os
import uuid
import asyncio
import hashlib
from dotenv import load_dotenv
from glossary import INDIAN_MEDICAL_GLOSSARY
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

SARVAM_KEY = os.environ.get("SARVAM_API_KEY")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

LANGUAGE_CODES = {
    "hi": "hi-IN",
    "ta": "ta-IN",
    "kn": "kn-IN",
    "te": "te-IN",
    "ml": "ml-IN"
}


# ─────────────────────────────────────────────
# STEP 1 — SPEECH TO TEXT
# ─────────────────────────────────────────────

def transcribe_with_sarvam(audio_bytes: bytes, language_code: str) -> str:
    sarvam_lang = LANGUAGE_CODES.get(language_code, "hi-IN")
    response = requests.post(
        "https://api.sarvam.ai/speech-to-text",
        headers={"api-subscription-key": SARVAM_KEY},
        files={"file": ("audio.wav", audio_bytes, "audio/wav")},
        data={"language_code": sarvam_lang, "model": "saarika:v2", "with_timestamps": False}
    )
    if response.status_code != 200:
        print(f"[STT] Error {response.status_code}: {response.text}")
        return ""
    return response.json().get("transcript", "")


# ─────────────────────────────────────────────
# STEP 2 — TRANSLATE PATIENT LANGUAGE → ENGLISH
# ─────────────────────────────────────────────

def translate_to_english(text: str, source_language_code: str) -> str:
    if not text.strip():
        return text
    sarvam_lang = LANGUAGE_CODES.get(source_language_code, "hi-IN")
    response = requests.post(
        "https://api.sarvam.ai/translate",
        headers={"api-subscription-key": SARVAM_KEY, "Content-Type": "application/json"},
        json={
            "input": text,
            "source_language_code": sarvam_lang,
            "target_language_code": "en-IN",
            "model": "mayura:v1",
            "enable_preprocessing": True
        }
    )
    if response.status_code != 200:
        print(f"[Translate] Error {response.status_code}: {response.text}")
        return text
    return response.json().get("translated_text", text)


# ─────────────────────────────────────────────
# STEP 3 — AI MEDICAL RECORD EXTRACTION
# Uses emergentintegrations LlmChat with Emergent Universal Key.
# The glossary injection resolves sugar=diabetes, colloquial
# symptom clusters, folk terms, and urgency flags.
# ─────────────────────────────────────────────

def extract_medical_record(transcript_english: str) -> dict:
    prompt = f"""{INDIAN_MEDICAL_GLOSSARY}

Now read the following doctor-patient consultation transcript.

The transcript may contain:
- Indian colloquial medical terms — resolve using the glossary above
- Disease names described symptom-by-symptom (no single word exists)
- Mixed Hindi, Tamil, English in the same sentence
- Folk or Ayurvedic terms — extract physical symptoms only

Your instructions:
1. Use the glossary to resolve all ambiguous terms BEFORE writing output
2. For unknown terms, diagnose from physical symptoms described
3. If uncertain about any term, add it to ambiguous_terms — never guess silently
4. Add "URGENT:" to notes if any urgency flag is triggered
5. Return ONLY valid JSON — no explanation, no markdown, no code fences

Return exactly this structure with exactly these field names:
{{
  "symptoms": ["every symptom in plain English"],
  "diagnosis": "primary diagnosis in standard medical English",
  "secondary_diagnoses": ["additional diagnoses"],
  "icd10_code": "primary ICD-10 code",
  "prescription": [
    {{"drug": "name", "dose": "amount", "freq": "OD/BD/TDS/QID/SOS", "days": 5}}
  ],
  "lab_tests": ["tests ordered"],
  "follow_up": "timeframe",
  "notes": "allergies, instructions, URGENT flags",
  "ambiguous_terms": ["terms you could not resolve confidently"]
}}

Consultation transcript:
{transcript_english}

Return only the JSON. Nothing before. Nothing after."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message="You are a clinical documentation AI working in an Indian hospital. Return only valid JSON."
    ).with_model("anthropic", "claude-4-sonnet-20250514")

    user_message = UserMessage(text=prompt)

    try:
        raw_text = asyncio.run(chat.send_message(user_message))
    except Exception as e:
        print(f"[AI] LlmChat error: {e}")
        return _fallback_record()

    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])
    raw_text = raw_text.strip()

    try:
        record = json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"[AI] JSON parse error: {e}\nRaw: {raw_text}")
        return _fallback_record()

    return _enforce_schema(record)


# ─────────────────────────────────────────────
# STEP 4 — TRANSLATE ENGLISH SUMMARY → PATIENT LANGUAGE
# ─────────────────────────────────────────────

def translate_to_patient_language(text: str, target_language_code: str) -> str:
    if not text.strip():
        return text
    sarvam_lang = LANGUAGE_CODES.get(target_language_code, "hi-IN")
    response = requests.post(
        "https://api.sarvam.ai/translate",
        headers={"api-subscription-key": SARVAM_KEY, "Content-Type": "application/json"},
        json={
            "input": text,
            "source_language_code": "en-IN",
            "target_language_code": sarvam_lang,
            "model": "mayura:v1",
            "enable_preprocessing": True
        }
    )
    if response.status_code != 200:
        print(f"[Translate-Rev] Error {response.status_code}: {response.text}")
        return text
    return response.json().get("translated_text", text)


# ─────────────────────────────────────────────
# STEP 5 — TEXT TO SPEECH
# Patient hears treatment in their own language
# ─────────────────────────────────────────────

def generate_patient_audio(record: dict, language_code: str) -> bytes:
    sarvam_lang = LANGUAGE_CODES.get(language_code, "hi-IN")
    drugs = [
        f"{p['drug']} {p['dose']} {p['freq']} for {p['days']} days"
        for p in record.get("prescription", [])
    ]
    summary_english = (
        f"Your diagnosis is {record.get('diagnosis', 'being evaluated')}. "
        f"{'Prescribed: ' + ', '.join(drugs) + '.' if drugs else 'No medicines prescribed.'} "
        f"{'Tests ordered: ' + ', '.join(record.get('lab_tests', [])) + '.' if record.get('lab_tests') else ''} "
        f"Please follow up in {record.get('follow_up', 'a few days')}."
    )
    summary_translated = translate_to_patient_language(summary_english, language_code)
    response = requests.post(
        "https://api.sarvam.ai/text-to-speech",
        headers={"api-subscription-key": SARVAM_KEY, "Content-Type": "application/json"},
        json={
            "inputs": [summary_translated],
            "target_language_code": sarvam_lang,
            "speaker": "meera",
            "model": "bulbul:v1",
            "enable_preprocessing": True
        }
    )
    if response.status_code != 200:
        print(f"[TTS] Error {response.status_code}: {response.text}")
        return b""
    return response.content


# ─────────────────────────────────────────────
# SCHEMA ENFORCER
# ─────────────────────────────────────────────

def _enforce_schema(record: dict) -> dict:
    # Accept any field name Claude might use for prescriptions
    prescription = (
        record.get("prescription")
        or record.get("medicines")
        or record.get("medicine")
        or record.get("medications")
        or record.get("drugs")
        or []
    )
    clean_prescription = []
    for p in prescription:
        clean_prescription.append({
            "drug": str(p.get("drug", p.get("medicine", p.get("name", p.get("medication", "Unknown"))))),
            "dose": str(p.get("dose", p.get("dosage", p.get("strength", "As directed")))),
            "freq": str(p.get("freq", p.get("frequency", p.get("times_per_day", "OD")))),
            "days": int(p.get("days", p.get("duration", p.get("duration_days", 5))))
        })
    return {
        "symptoms": list(record.get("symptoms", [])),
        "diagnosis": str(record.get("diagnosis", "Under evaluation")),
        "secondary_diagnoses": list(record.get("secondary_diagnoses", record.get("other_diagnoses", []))),
        "icd10_code": str(record.get("icd10_code", record.get("icd_10", record.get("icd10", "R69")))),
        "prescription": clean_prescription,
        "lab_tests": list(record.get("lab_tests", record.get("lab_test", record.get("tests", [])))),
        "follow_up": str(record.get("follow_up", record.get("followup", record.get("review", "As needed")))),
        "notes": str(record.get("notes", record.get("note", record.get("clinical_notes", "")))),
        "ambiguous_terms": list(record.get("ambiguous_terms", record.get("ambiguous", [])))
    }


def _fallback_record() -> dict:
    return {
        "symptoms": ["Could not extract — please fill manually"],
        "diagnosis": "Requires manual entry",
        "secondary_diagnoses": [],
        "icd10_code": "Z99",
        "prescription": [],
        "lab_tests": [],
        "follow_up": "As per doctor",
        "notes": "AI extraction failed. Doctor must complete this record manually.",
        "ambiguous_terms": []
    }


# ─────────────────────────────────────────────
# FULL PIPELINE (sync)
# ─────────────────────────────────────────────

def run_full_pipeline(audio_bytes: bytes, language_code: str) -> dict:
    print(f"[Pipeline] Step 1: Transcribing audio ({language_code})...")
    transcript = transcribe_with_sarvam(audio_bytes, language_code)
    print(f"[Pipeline] Transcript: {transcript}")
    if not transcript:
        return _fallback_record()

    print("[Pipeline] Step 2: Translating to English...")
    transcript_english = translate_to_english(transcript, language_code)
    print(f"[Pipeline] English: {transcript_english}")

    print("[Pipeline] Step 3: Extracting medical record...")
    record = extract_medical_record(transcript_english)
    print(f"[Pipeline] Record:\n{json.dumps(record, indent=2)}")
    return record


# ─────────────────────────────────────────────
# CREDIT-SAVING CACHE (sync)
# Use during development — same transcript reads from local file
# instead of calling the API. Switch to extract_medical_record()
# for the final live demo call only.
# ─────────────────────────────────────────────

def extract_medical_record_cached(transcript: str, cache_dir: str = "cache") -> dict:
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.md5(transcript.encode()).hexdigest()[:12]
    cache_file = f"{cache_dir}/{key}.json"
    if os.path.exists(cache_file):
        print(f"[Cache] Using cached result for {key}")
        with open(cache_file) as f:
            return json.load(f)
    print("[Cache] Calling Claude via Emergent Universal Key...")
    result = extract_medical_record(transcript)
    with open(cache_file, "w") as f:
        json.dump(result, f, indent=2)
    print(f"[Cache] Saved to {cache_file}")
    return result
ai_pipeline_connector.py
"""
ai_pipeline_connector.py
The ONLY file Member 2 imports.
Two required functions with exact names. Do not rename.

Member 2 usage in FastAPI:
    from ai_pipeline_connector import transcribe_audio_real, extract_medical_record_real

    # POST /api/audio/transcribe
    result = transcribe_audio_real(audio_bytes, language_code)

    # POST /api/consultation/analyze
    record = extract_medical_record_real(transcript, language_code)
"""

from pipeline import (
    transcribe_with_sarvam,
    translate_to_english,
    extract_medical_record,
    generate_patient_audio
)


def transcribe_audio_real(audio_bytes: bytes, language_code: str) -> dict:
    """
    Member 2 calls this from POST /api/audio/transcribe
    Returns: { "transcript": "...", "language": "ta" }
    """
    transcript = transcribe_with_sarvam(audio_bytes, language_code)
    return {"transcript": transcript, "language": language_code}


def extract_medical_record_real(transcript: str, language_code: str = "en") -> dict:
    """
    Member 2 calls this from POST /api/consultation/analyze
    Returns structured medical JSON matching shared contract exactly.
    Regular sync function — call directly from any FastAPI endpoint.
    """
    if language_code not in ("en", "en-IN"):
        transcript_english = translate_to_english(transcript, language_code)
    else:
        transcript_english = transcript
    return extract_medical_record(transcript_english)


def get_patient_audio_real(record: dict, language_code: str) -> bytes:
    """
    Optional. Member 1 calls this after doctor approves record.
    Returns audio bytes of treatment summary in patient's language.
    """
    return generate_patient_audio(record, language_code)
test_pipeline.py
"""
Run without any teammates: python test_pipeline.py

All Sarvam API calls (translate, STT) require a valid SARVAM_API_KEY in .env
AI extraction uses the Emergent Universal Key (pre-filled in .env).
Tests 1-2 may fail without SARVAM_API_KEY. Tests 3-5 only need Emergent LLM Key.
"""
import json
from pipeline import translate_to_english, extract_medical_record, _enforce_schema, _fallback_record


# ─────────────────────────────────────────────
# TEST 1 — Hindi translation
# ─────────────────────────────────────────────
print("\n=== TEST 1: Hindi Translation ===")
hindi = "मुझे दो दिन से बुखार और सिरदर्द है, और मेरी शुगर भी है"
result = translate_to_english(hindi, "hi")
print(f"Input:  {hindi}")
print(f"Output: {result}")


# ─────────────────────────────────────────────
# TEST 2 — Tamil translation
# ─────────────────────────────────────────────
print("\n=== TEST 2: Tamil Translation ===")
tamil = "எனக்கு சர்க்கரை வியாதி இருக்கு, மூச்சு விட கஷ்டமா இருக்கு"
result = translate_to_english(tamil, "ta")
print(f"Input:  {tamil}")
print(f"Output: {result}")


# ─────────────────────────────────────────────
# TEST 3 — AI extraction with colloquial Indian terms
# ─────────────────────────────────────────────
print("\n=== TEST 3: AI Extraction with Colloquial Terms ===")
transcript = """
Doctor: Good morning. What brings you in today?
Patient: Doctor, I have sugar and my BP is also there.
         For two days I have body heat and gas trouble also.
         My haemoglobin is also less from last week report.
Doctor: Any chest problem or breathing issue?
Patient: Saans lene mein thoda problem hai, especially at night.
Doctor: Temperature is 100.4F, BP 150/90. You have hypertension
        and diabetes needs better control. Breathing at night
        could be early asthma.
        Prescribing Metformin 500mg twice daily, Amlodipine 5mg
        once daily, Salbutamol inhaler two puffs when needed.
        Get HbA1c, CBC, LFT done. Come back in 2 weeks.
Patient: Doctor, mera ek baar fits bhi aaya tha pichhle mahine.
Doctor: Important — get EEG done. Take Levetiracetam 500mg twice daily.
"""
record = extract_medical_record(transcript)
print(json.dumps(record, indent=2))
print(f"\nsugar → diabetes: {'diabetes' in str(record).lower() or 'E11' in str(record)}")
print(f"BP → hypertension: {'hypertension' in str(record).lower() or 'I10' in str(record)}")
print(f"fits → seizure: {'seizure' in str(record).lower() or 'epilep' in str(record).lower()}")
print(f"ambiguous_terms field present: {'ambiguous_terms' in record}")


# ─────────────────────────────────────────────
# TEST 4 — Urgency detection
# ─────────────────────────────────────────────
print("\n=== TEST 4: Urgency Flag ===")
urgent = """
Patient: Doctor, legs are swollen and I cannot breathe even sitting.
         Pet mein paani aane jaise lagta hai. Fever bhi hai teen din se.
Doctor: This is serious — abdominal swelling plus breathlessness.
        Admitting you now. Get Echo, LFT, RFT, Albumin urgently.
"""
record_urgent = extract_medical_record(urgent)
print(json.dumps(record_urgent, indent=2))
print(f"URGENT in notes: {'URGENT' in record_urgent.get('notes', '').upper()}")


# ─────────────────────────────────────────────
# TEST 5 — Schema enforcement
# ─────────────────────────────────────────────
print("\n=== TEST 5: Schema Enforcement ===")
bad = {
    "symptoms": ["fever"],
    "diagnosis": "Viral fever",
    "icd_10": "B34.9",
    "medicine": [{"name": "Paracetamol", "dosage": "500mg", "frequency": "TDS", "duration_days": 5}],
    "tests": ["CBC"],
    "followup": "5 days",
    "ambiguous": ["body heat"]
}
fixed = _enforce_schema(bad)
print(json.dumps(fixed, indent=2))
required = ["symptoms", "diagnosis", "icd10_code", "prescription", "lab_tests", "follow_up", "notes", "ambiguous_terms"]
print(f"All required fields present: {all(k in fixed for k in required)}")
print(f"icd10_code correctly extracted: {fixed['icd10_code']}")
print(f"lab_tests correctly extracted: {fixed['lab_tests']}")
print(f"follow_up correctly extracted: {fixed['follow_up']}")
print(f"ambiguous_terms correctly extracted: {fixed['ambiguous_terms']}")
print(f"days is int: {isinstance(fixed['prescription'][0]['days'], int)}")


print("\n=== ALL TESTS DONE ===")
print("Share ai_pipeline_connector.py with Member 2 when tests pass")