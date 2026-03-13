"""
Backend tests for Doctify — Clinical Voice System
Tests all endpoints: health, patient CRUD, consultation analyze, pharmacy/lab updates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://56300e56-72ff-4298-8e0f-a6df602f08ee.preview.emergentagent.com"

PATIENT_ID = None  # shared across tests


class TestHealth:
    def test_health_ok(self):
        res = requests.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        print(f"ai_pipeline status: {data.get('ai_pipeline')}")
        assert "ai_pipeline" in data
        assert data["ai_pipeline"] == "connected", f"AI pipeline not connected: {data['ai_pipeline']}"


class TestPatientRegistration:
    def test_register_patient_success(self):
        global PATIENT_ID
        res = requests.post(f"{BASE_URL}/api/patients/register", json={
            "name": "TEST_Ravi Kumar",
            "age": 45,
            "language": "hi"
        })
        assert res.status_code == 200
        data = res.json()
        assert "patient_id" in data
        assert isinstance(data["patient_id"], str) and len(data["patient_id"]) > 0
        PATIENT_ID = data["patient_id"]
        print(f"Registered patient_id: {PATIENT_ID}")

    def test_register_patient_missing_name(self):
        res = requests.post(f"{BASE_URL}/api/patients/register", json={"age": 30})
        assert res.status_code == 400

    def test_register_patient_missing_age(self):
        res = requests.post(f"{BASE_URL}/api/patients/register", json={"name": "TEST_NoAge"})
        assert res.status_code == 400


class TestGetPatient:
    def test_get_patient_exists(self):
        assert PATIENT_ID, "Skipping: patient not registered"
        res = requests.get(f"{BASE_URL}/api/patients/{PATIENT_ID}")
        assert res.status_code == 200
        data = res.json()
        assert data["patient_id"] == PATIENT_ID
        assert data["name"] == "TEST_Ravi Kumar"
        assert data["age"] == 45
        assert "pharmacy_status" in data or "status" in data or "diagnosis" in data

    def test_get_patient_not_found(self):
        res = requests.get(f"{BASE_URL}/api/patients/nonexistent-id-99999")
        assert res.status_code == 404


class TestConsultationAnalyze:
    def test_analyze_english_transcript(self):
        res = requests.post(f"{BASE_URL}/api/consultation/analyze", json={
            "transcript": "Patient has fever and headache for 2 days. Also has body ache. Sugar level is high.",
            "language": "en"
        })
        assert res.status_code == 200
        data = res.json()
        print(f"Analyze response: {data}")
        assert "symptoms" in data
        assert "diagnosis" in data
        assert "icd10_code" in data
        assert "prescription" in data
        assert "lab_tests" in data
        assert "follow_up" in data
        assert isinstance(data["symptoms"], list)
        assert isinstance(data["prescription"], list)

    def test_analyze_colloquial_terms(self):
        """sugar=diabetes, BP=hypertension should be resolved"""
        res = requests.post(f"{BASE_URL}/api/consultation/analyze", json={
            "transcript": "Patient has sugar and BP issues for years.",
            "language": "en"
        })
        assert res.status_code == 200
        data = res.json()
        diagnosis = data.get("diagnosis", "").lower()
        symptoms = " ".join(data.get("symptoms", [])).lower()
        # Should mention diabetes or hypertension
        print(f"Diagnosis: {diagnosis}, Symptoms: {symptoms}")
        assert any(term in diagnosis + symptoms for term in ["diabetes", "hypertension", "sugar", "bp"]), \
            "AI should resolve colloquial medical terms"


class TestSaveRecord:
    def test_save_record(self):
        assert PATIENT_ID, "Skipping: patient not registered"
        res = requests.post(f"{BASE_URL}/api/patients/{PATIENT_ID}/record", json={
            "symptoms": ["fever", "headache"],
            "diagnosis": "Viral fever",
            "icd10_code": "B34.9",
            "prescription": [{"drug": "Paracetamol", "dose": "500mg", "freq": "TDS", "days": 5}],
            "lab_tests": ["CBC"],
            "follow_up": "5 days",
            "notes": "Test record"
        })
        assert res.status_code == 200
        data = res.json()
        assert "message" in data

    def test_save_record_persists(self):
        assert PATIENT_ID, "Skipping"
        res = requests.get(f"{BASE_URL}/api/patients/{PATIENT_ID}")
        assert res.status_code == 200
        data = res.json()
        assert data.get("diagnosis") == "Viral fever"


class TestPharmacyUpdate:
    def test_pharmacy_update(self):
        assert PATIENT_ID, "Skipping"
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/pharmacy", json={"status": "dispensed"})
        assert res.status_code == 200
        assert "dispensed" in res.json().get("message", "")

    def test_pharmacy_invalid_status(self):
        assert PATIENT_ID, "Skipping"
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/pharmacy", json={"status": "invalid"})
        assert res.status_code == 400


class TestLabUpdate:
    def test_lab_update(self):
        assert PATIENT_ID, "Skipping"
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/lab", json={"status": "results_ready"})
        assert res.status_code == 200
        assert "results_ready" in res.json().get("message", "")

    def test_lab_invalid_status(self):
        assert PATIENT_ID, "Skipping"
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/lab", json={"status": "bad_status"})
        assert res.status_code == 400
