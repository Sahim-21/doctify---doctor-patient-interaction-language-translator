const BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────

export async function login(username, password) {
  return handleResponse(await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  }));
}

// ── Patients ──────────────────────────────────

export async function registerPatient(name, age, language, phone) {
  return handleResponse(await fetch(`${BASE}/api/patients/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, age, language, phone }),
  }));
}

export async function listPatients() {
  return handleResponse(await fetch(`${BASE}/api/patients`));
}

export async function getPatient(patientId) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}`));
}

export async function getPatientStatus(patientId) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/status`));
}

// ── AI pipeline ───────────────────────────────

export async function transcribeAudio(audioBlob, patientId, language = "hi") {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.wav");
  formData.append("patient_id", patientId);
  formData.append("language", language);
  return handleResponse(await fetch(`${BASE}/api/audio/transcribe`, {
    method: "POST",
    body: formData,
  }));
}

export async function analyzeConsultation(transcript, patientId, language = "en") {
  return handleResponse(await fetch(`${BASE}/api/consultation/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, patient_id: patientId, language }),
  }));
}

// ── Record ────────────────────────────────────

export async function saveRecord(patientId, record) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  }));
}

// ── Urgency ───────────────────────────────────

export async function updateUrgency(patientId, urgency_level) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/urgency`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urgency_level }),
  }));
}

// ── Prescription ──────────────────────────────

export async function approvePrescription(patientId, prescription, follow_up, follow_up_date) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/prescription/approve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prescription, follow_up, follow_up_date }),
  }));
}

export async function rejectPrescription(patientId, reason = "") {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/prescription/reject`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }));
}

export async function deletePatient(patientId) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}`, { method: "DELETE" }));
}

export async function deleteAllPatients() {
  return handleResponse(await fetch(`${BASE}/api/patients`, { method: "DELETE" }));
}

export async function updateBilling(patientId, data) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/billing`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
}

// ── Pharmacy / Lab ────────────────────────────

export async function updatePharmacy(patientId, status) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/pharmacy`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }));
}

export async function updateLab(patientId, status, results) {
  return handleResponse(await fetch(`${BASE}/api/patients/${patientId}/lab`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, results }),
  }));
}
