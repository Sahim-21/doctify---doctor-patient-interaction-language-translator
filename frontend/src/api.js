const BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

async function handleResponse(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function registerPatient(name, age, language) {
  const res = await fetch(`${BASE}/api/patients/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, age, language }),
  });
  return handleResponse(res);
}

export async function getPatient(patientId) {
  const res = await fetch(`${BASE}/api/patients/${patientId}`);
  return handleResponse(res);
}

export async function getPatientStatus(patientId) {
  const res = await fetch(`${BASE}/api/patients/${patientId}/status`);
  return handleResponse(res);
}

export async function transcribeAudio(audioBlob, patientId) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");
  formData.append("patient_id", patientId);
  const res = await fetch(`${BASE}/api/audio/transcribe`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function analyzeConsultation(transcript, patientId) {
  const res = await fetch(`${BASE}/api/consultation/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, patient_id: patientId }),
  });
  return handleResponse(res);
}

export async function saveRecord(patientId, record) {
  const res = await fetch(`${BASE}/api/patients/${patientId}/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  return handleResponse(res);
}

export async function updatePharmacy(patientId, status) {
  const res = await fetch(`${BASE}/api/patients/${patientId}/pharmacy`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function updateLab(patientId, status, results) {
  const res = await fetch(`${BASE}/api/patients/${patientId}/lab`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, results }),
  });
  return handleResponse(res);
}
