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