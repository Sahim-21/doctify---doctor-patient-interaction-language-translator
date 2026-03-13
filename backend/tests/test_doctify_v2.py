"""
Backend tests for Doctify v2 — New features: Auth, Urgency, Patient List, Approve/Reject
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL env var not set")

PATIENT_ID = None


class TestAuthLogin:
    """Test role-based login"""

    def test_doctor_login(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "doctor", "password": "doctor123"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "doctor"
        assert data["username"] == "doctor"
        assert "display_name" in data
        assert data["display_name"] == "Dr. Rajan Kumar"
        print(f"Doctor login OK: {data}")

    def test_pharmacy_login(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "pharmacy", "password": "pharmacy123"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "pharmacy"

    def test_lab_login(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "lab", "password": "lab123"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "lab"

    def test_reception_login(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "reception", "password": "reception123"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "reception"

    def test_wrong_password_returns_401(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "doctor", "password": "wrongpass"})
        assert res.status_code == 401

    def test_unknown_user_returns_401(self):
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"username": "ghost", "password": "ghost123"})
        assert res.status_code == 401


class TestPatientList:
    """GET /api/patients returns sorted list"""

    def setup_method(self):
        global PATIENT_ID
        # Register a test patient if needed
        if not PATIENT_ID:
            res = requests.post(f"{BASE_URL}/api/patients/register", json={
                "name": "TEST_V2_Patient",
                "age": 35,
                "language": "en"
            })
            assert res.status_code == 200
            PATIENT_ID = res.json()["patient_id"]

    def test_list_patients_returns_array(self):
        res = requests.get(f"{BASE_URL}/api/patients")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"Total patients: {len(data)}")

    def test_list_patients_have_required_fields(self):
        res = requests.get(f"{BASE_URL}/api/patients")
        assert res.status_code == 200
        data = res.json()
        if data:
            p = data[0]
            assert "patient_id" in p
            assert "name" in p
            assert "urgency_level" in p
            assert "prescription_status" in p


class TestUrgencyUpdate:
    """PUT /api/patients/{id}/urgency"""

    def setup_method(self):
        global PATIENT_ID
        if not PATIENT_ID:
            res = requests.post(f"{BASE_URL}/api/patients/register", json={
                "name": "TEST_V2_Urgency",
                "age": 50,
                "language": "en"
            })
            PATIENT_ID = res.json()["patient_id"]

    def test_set_urgency_urgent(self):
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/urgency", json={"urgency_level": "urgent"})
        assert res.status_code == 200
        assert "urgent" in res.json().get("message", "")

    def test_set_urgency_critical(self):
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/urgency", json={"urgency_level": "critical"})
        assert res.status_code == 200
        # Verify it persisted
        get_res = requests.get(f"{BASE_URL}/api/patients/{PATIENT_ID}")
        assert get_res.status_code == 200
        assert get_res.json()["urgency_level"] == "critical"

    def test_set_urgency_normal(self):
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/urgency", json={"urgency_level": "normal"})
        assert res.status_code == 200

    def test_invalid_urgency(self):
        res = requests.put(f"{BASE_URL}/api/patients/{PATIENT_ID}/urgency", json={"urgency_level": "extreme"})
        assert res.status_code == 400


class TestPrescriptionApproveReject:
    """Approve and reject prescription endpoints"""

    pid_approve = None
    pid_reject = None

    def setup_method(self):
        # Create fresh patients for approve/reject tests
        if not self.pid_approve:
            res = requests.post(f"{BASE_URL}/api/patients/register", json={"name": "TEST_Approve", "age": 40, "language": "en"})
            TestPrescriptionApproveReject.pid_approve = res.json()["patient_id"]
            # Set prescription
            requests.post(f"{BASE_URL}/api/patients/{self.pid_approve}/record", json={
                "prescription": [{"drug": "Metformin", "dose": "500mg", "freq": "BD", "days": 30}],
                "follow_up": "4 weeks"
            })
        if not self.pid_reject:
            res = requests.post(f"{BASE_URL}/api/patients/register", json={"name": "TEST_Reject", "age": 42, "language": "en"})
            TestPrescriptionApproveReject.pid_reject = res.json()["patient_id"]

    def test_approve_prescription(self):
        res = requests.put(f"{BASE_URL}/api/patients/{self.pid_approve}/prescription/approve", json={
            "prescription": [{"drug": "Metformin", "dose": "500mg", "freq": "BD", "days": 30}],
            "follow_up": "4 weeks",
            "follow_up_date": "2026-03-15"
        })
        assert res.status_code == 200
        assert "approved" in res.json().get("message", "")

    def test_approve_sets_status(self):
        get_res = requests.get(f"{BASE_URL}/api/patients/{self.pid_approve}")
        assert get_res.status_code == 200
        assert get_res.json()["prescription_status"] == "approved"

    def test_reject_prescription(self):
        res = requests.put(f"{BASE_URL}/api/patients/{self.pid_reject}/prescription/reject", json={
            "reason": "Drug interaction noted"
        })
        assert res.status_code == 200
        assert "rejected" in res.json().get("message", "")

    def test_reject_sets_status(self):
        get_res = requests.get(f"{BASE_URL}/api/patients/{self.pid_reject}")
        assert get_res.status_code == 200
        assert get_res.json()["prescription_status"] == "rejected"
