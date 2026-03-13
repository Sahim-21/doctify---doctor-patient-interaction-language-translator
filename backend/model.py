from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.sql import func
from database import Base
import json


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)   # doctor, pharmacy, lab, reception
    display_name = Column(String, nullable=False)


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    language = Column(String, default="hi")
    phone = Column(String, default=None)     # optional contact number

    # Clinical fields — nullable so AI skips unmentioned fields
    symptoms_json = Column(Text, default=None)
    diagnosis = Column(String, default=None)
    secondary_diagnoses_json = Column(Text, default=None)
    icd10_code = Column(String, default=None)
    prescription_json = Column(Text, default=None)
    lab_tests_json = Column(Text, default=None)
    follow_up = Column(String, default=None)
    follow_up_date = Column(String, default=None)   # ISO date string e.g. "2026-03-20"
    notes = Column(Text, default=None)
    ambiguous_terms_json = Column(Text, default=None)
    transcript = Column(Text, default=None)

    created_at = Column(DateTime, server_default=func.now())

    # Department status
    pharmacy_status = Column(String, default="pending")
    lab_status = Column(String, default="pending")
    diagnostics_status = Column(String, default="not_required")
    lab_results_json = Column(Text, default="{}")

    # New workflow fields
    urgency_level = Column(String, default="normal")          # normal | urgent | critical
    prescription_status = Column(String, default="pending")   # pending | approved | rejected

    def to_dict(self):
        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "age": self.age,
            "language": self.language,
            "phone": self.phone,
            "symptoms": json.loads(self.symptoms_json) if self.symptoms_json else None,
            "diagnosis": self.diagnosis,
            "secondary_diagnoses": json.loads(self.secondary_diagnoses_json) if self.secondary_diagnoses_json else None,
            "icd10_code": self.icd10_code,
            "prescription": json.loads(self.prescription_json) if self.prescription_json else None,
            "lab_tests": json.loads(self.lab_tests_json) if self.lab_tests_json else None,
            "follow_up": self.follow_up,
            "follow_up_date": self.follow_up_date,
            "notes": self.notes,
            "ambiguous_terms": json.loads(self.ambiguous_terms_json) if self.ambiguous_terms_json else None,
            "transcript": self.transcript,
            "created_at": str(self.created_at),
            "urgency_level": self.urgency_level or "normal",
            "prescription_status": self.prescription_status or "pending",
            "status": {
                "pharmacy": self.pharmacy_status,
                "lab": self.lab_status,
                "diagnostics": self.diagnostics_status
            }
        }

    def to_list_item(self):
        """Compact shape used for the patient dropdown list."""
        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "age": self.age,
            "language": self.language,
            "diagnosis": self.diagnosis or "",
            "urgency_level": self.urgency_level or "normal",
            "prescription_status": self.prescription_status or "pending",
            "follow_up_date": self.follow_up_date,
            "created_at": str(self.created_at),
        }
