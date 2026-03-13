import requests
import json
import os
import hashlib
from groq import Groq
from dotenv import load_dotenv
from glossary import INDIAN_MEDICAL_GLOSSARY

load_dotenv()

SARVAM_KEY = os.environ.get("SARVAM_API_KEY")
GROQ_KEY = os.environ.get("GROQ_API_KEY")

LANGUAGE_CODES = {
    "hi": "hi-IN",
    "ta": "ta-IN",
    "kn": "kn-IN",
    "te": "te-IN",
    "ml": "ml-IN"
}

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "gemma2-9b-it",
    "llama-3.1-8b-instant"
]


# ─────────────────────────────────────────────
# STEP 1 — SPEECH TO TEXT
# ─────────────────────────────────────────────

def transcribe_with_sarvam(audio_bytes: bytes, language_code: str) -> str:
    sarvam_lang = LANGUAGE_CODES.get(language_code, "hi-IN")
    response = requests.post(
        "https://api.sarvam.ai/speech-to-text",
        headers={"api-subscription-key": SARVAM_KEY},
        files={"file": ("audio.wav", audio_bytes, "audio/wav")},
        data={"language_code": sarvam_lang, "model": "saarika:v2.5", "with_timestamps": False}
    )
    if response.status_code != 200:
        print(f"[STT] Error {response.status_code}: {response.text}")
        return ""
    return response.json().get("transcript", "")


# ─────────────────────────────────────────────
# STEP 2 — TRANSLATE PATIENT LANGUAGE TO ENGLISH
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
# Tries multiple Groq models until one responds.
# Glossary injection resolves sugar=diabetes, body heat=pyrexia,
# fits=epilepsy, and all Indian colloquial medical terms.
# ─────────────────────────────────────────────

def extract_medical_record(transcript_english: str) -> dict:
    # Trim glossary to fit within model context limits
    glossary_trimmed = INDIAN_MEDICAL_GLOSSARY[:4000]

    prompt = f"""{glossary_trimmed}

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

    client = Groq(api_key=GROQ_KEY)
    raw_text = None

    for model_name in GROQ_MODELS:
        try:
            message = client.chat.completions.create(
                model=model_name,
                max_tokens=1500,
                temperature=0.1,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a clinical documentation AI working in an Indian hospital. Return only valid JSON. No explanation. No markdown. No code fences."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            raw_text = message.choices[0].message.content
            if raw_text and raw_text.strip():
                print(f"[AI] Using model: {model_name}")
                raw_text = raw_text.strip()
                break
            else:
                print(f"[AI] {model_name} returned empty, trying next...")
                raw_text = None
        except Exception as model_err:
            print(f"[AI] {model_name} failed: {model_err}, trying next...")
            continue

    if not raw_text:
        print("[AI] All models failed or returned empty")
        return _fallback_record()

    # Strip markdown code fences if model added them anyway
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1])
    raw_text = raw_text.strip()

    try:
        record = json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"[AI] JSON parse error: {e}\nRaw: {raw_text[:300]}")
        return _fallback_record()

    return _enforce_schema(record)


# ─────────────────────────────────────────────
# STEP 4 — TRANSLATE ENGLISH SUMMARY TO PATIENT LANGUAGE
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
# Fixes any wrong field names the AI might return
# ─────────────────────────────────────────────

def _enforce_schema(record: dict) -> dict:
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
# FULL PIPELINE
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
# CREDIT SAVING CACHE
# Reads from local file after first call — saves API credits during dev
# ─────────────────────────────────────────────

def extract_medical_record_cached(transcript: str, cache_dir: str = "cache") -> dict:
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.md5(transcript.encode()).hexdigest()[:12]
    cache_file = f"{cache_dir}/{key}.json"
    if os.path.exists(cache_file):
        print(f"[Cache] Using cached result for {key}")
        with open(cache_file) as f:
            return json.load(f)
    print("[Cache] Calling Groq API...")
    result = extract_medical_record(transcript)
    with open(cache_file, "w") as f:
        json.dump(result, f, indent=2)
    print(f"[Cache] Saved to {cache_file}")
    return result