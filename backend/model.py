from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.sql import func
from database import Base
import json


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    language = Column(String, default="hi")

    # Clinical fields — stored as JSON strings in SQLite
    symptoms_json = Column(Text, default="[]")
    diagnosis = Column(String, default="")
    secondary_diagnoses_json = Column(Text, default="[]")
    icd10_code = Column(String, default="")
    prescription_json = Column(Text, default="[]")
    lab_tests_json = Column(Text, default="[]")
    follow_up = Column(String, default="")
    notes = Column(Text, default="")
    ambiguous_terms_json = Column(Text, default="[]")

    created_at = Column(DateTime, server_default=func.now())

    # Department status fields
    pharmacy_status = Column(String, default="pending")
    lab_status = Column(String, default="pending")
    diagnostics_status = Column(String, default="not_required")
    lab_results_json = Column(Text, default="{}")

    def to_dict(self):
        """Convert to the exact JSON shape Member 1 expects — never change field names"""
        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "age": self.age,
            "language": self.language,
            "symptoms": json.loads(self.symptoms_json or "[]"),
            "diagnosis": self.diagnosis or "",
            "secondary_diagnoses": json.loads(self.secondary_diagnoses_json or "[]"),
            "icd10_code": self.icd10_code or "",
            "prescription": json.loads(self.prescription_json or "[]"),
            "lab_tests": json.loads(self.lab_tests_json or "[]"),
            "follow_up": self.follow_up or "",
            "notes": self.notes or "",
            "ambiguous_terms": json.loads(self.ambiguous_terms_json or "[]"),
            "created_at": str(self.created_at),
            "status": {
                "pharmacy": self.pharmacy_status,
                "lab": self.lab_status,
                "diagnostics": self.diagnostics_status
            }
        }