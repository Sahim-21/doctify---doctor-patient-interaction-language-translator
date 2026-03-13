import { useState, useEffect } from "react";
import {
  getPatient, saveRecord,
  updateUrgency, approvePrescription, rejectPrescription,
} from "../api";
import { UrgencyBadge } from "../App";
import PatientDropdown from "../components/PatientDropdown";

// ── Helpers ──────────────────────────────────

const URGENCY_LEVELS = [
  { value: "normal",   label: "Normal",   color: "#10b981" },
  { value: "urgent",   label: "Urgent",   color: "#f59e0b" },
  { value: "critical", label: "Critical", color: "#ef4444" },
];
const LANGUAGES = { hi: "Hindi", ta: "Tamil", kn: "Kannada", te: "Telugu", ml: "Malayalam", en: "English" };

const PRESC_STATUS_STYLE = {
  pending:  { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#f59e0b", label: "Pending Approval" },
  approved: { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)", color: "#10b981", label: "Approved"         },
  rejected: { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)", color: "#ef4444",  label: "Rejected"         },
};

// ── Editable field for null values ───────────

function NullableField({ label, value, onSave, multiline = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const commit = () => {
    onSave(draft.trim() || null);
    setEditing(false);
  };

  if (value && !editing) {
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 14, color: "var(--text-primary)", flex: 1 }}>{value}</span>
          <button onClick={() => { setDraft(value); setEditing(true); }} style={iconBtnStyle} title="Edit">✏️</button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div>
        <div style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={3}
            style={{ ...inputSt, width: "100%", resize: "vertical", boxSizing: "border-box" }}
          />
        ) : (
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} onKeyDown={e => e.key === "Enter" && commit()} />
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={commit} style={saveBtnSt}>Save</button>
          <button onClick={() => setEditing(false)} style={cancelBtnSt}>Cancel</button>
        </div>
      </div>
    );
  }

  // Null state
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</div>
      <button onClick={() => setEditing(true)} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
        borderRadius: 6, border: "1px dashed var(--border)", background: "transparent",
        color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
      }}>
        <span style={{ fontSize: 14 }}>+</span> Add {label}
      </button>
    </div>
  );
}

// ── Prescription editor ───────────────────────

function PrescriptionEditor({ prescription, patientId, prescStatus, followUp, followUpDate, onSaved }) {
  const [rows, setRows]         = useState(() => prescription ? [...prescription] : []);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft]       = useState([]);
  const [fuText, setFuText]     = useState(followUp || "");
  const [fuDate, setFuDate]     = useState(followUpDate || "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject]     = useState(false);

  const statusCfg = PRESC_STATUS_STYLE[prescStatus] || PRESC_STATUS_STYLE.pending;

  const startEdit = () => {
    setDraft(rows.length ? rows.map(r => ({ ...r })) : [{ drug: "", dose: "", freq: "", days: 1 }]);
    setEditMode(true);
  };

  const addRow = () => setDraft(d => [...d, { drug: "", dose: "", freq: "", days: 1 }]);
  const delRow = (i) => setDraft(d => d.filter((_, idx) => idx !== i));
  const setCell = (i, key, val) => setDraft(d => d.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const handleApprove = async () => {
    setSaving(true); setError("");
    const finalRows = editMode ? draft.filter(r => r.drug.trim()) : rows;
    try {
      await approvePrescription(patientId, finalRows, fuText || null, fuDate || null);
      setRows(finalRows);
      setEditMode(false);
      onSaved();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleReject = async () => {
    setSaving(true); setError("");
    try {
      await rejectPrescription(patientId, rejectReason);
      setShowReject(false);
      onSaved();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    setSaving(true); setError("");
    const finalRows = draft.filter(r => r.drug.trim());
    try {
      await saveRecord(patientId, { prescription: finalRows });
      setRows(finalRows);
      setEditMode(false);
      onSaved();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div>
      {/* Status banner */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Prescription</span>
          <span style={{
            padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
            background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color,
          }}>
            {statusCfg.label}
          </span>
        </div>
        {!editMode && prescStatus !== "approved" && (
          <button onClick={startEdit} style={iconBtnStyle} title="Edit prescription">✏️ Edit</button>
        )}
      </div>

      {/* Prescription rows */}
      {editMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {draft.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px 28px", gap: 6, alignItems: "center" }}>
              <input placeholder="Drug name" value={row.drug} onChange={e => setCell(i, "drug", e.target.value)} style={{ ...inputSt, fontSize: 12 }} />
              <input placeholder="Dose" value={row.dose} onChange={e => setCell(i, "dose", e.target.value)} style={{ ...inputSt, fontSize: 12 }} />
              <input placeholder="Freq" value={row.freq} onChange={e => setCell(i, "freq", e.target.value)} style={{ ...inputSt, fontSize: 12 }} />
              <input type="number" placeholder="Days" value={row.days} min={1} onChange={e => setCell(i, "days", parseInt(e.target.value) || 1)} style={{ ...inputSt, fontSize: 12 }} />
              <button onClick={() => delRow(i)} style={{ ...iconBtnStyle, color: "#ef4444", fontSize: 16, padding: "2px 4px" }}>✕</button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px 28px", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", paddingLeft: 4 }}>Drug</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Dose</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Frequency</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Days</span>
          </div>
          <button onClick={addRow} style={{ ...cancelBtnSt, fontSize: 12, alignSelf: "flex-start", marginTop: 2 }}>+ Add Drug</button>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={handleSaveEdit} disabled={saving} style={saveBtnSt}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditMode(false)} style={cancelBtnSt}>Cancel</button>
          </div>
        </div>
      ) : (
        rows.length > 0 ? (
          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--card-elevated)" }}>
                  {["Drug", "Dose", "Frequency", "Days"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, textAlign: "left", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{row.drug}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{row.dose}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-secondary)" }}>{row.freq}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--teal)", fontWeight: 700 }}>{row.days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 10 }}>
            No prescription recorded. Click ✏️ Edit to add drugs.
          </div>
        )
      )}

      {/* Follow-up section */}
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelSt}>Follow-up Notes</label>
          <input
            value={fuText}
            onChange={e => setFuText(e.target.value)}
            placeholder="e.g. 2 weeks, review BP"
            style={{ ...inputSt, width: "100%", boxSizing: "border-box", fontSize: 12 }}
            disabled={prescStatus === "approved"}
          />
        </div>
        <div>
          <label style={labelSt}>Follow-up Date</label>
          <input
            type="date"
            value={fuDate}
            onChange={e => setFuDate(e.target.value)}
            style={{ ...inputSt, width: "100%", boxSizing: "border-box", fontSize: 12 }}
            disabled={prescStatus === "approved"}
          />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      {/* Approve / Reject — only show when pending */}
      {prescStatus === "pending" && !editMode && (
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button
            data-testid="approve-prescription-btn"
            onClick={handleApprove}
            disabled={saving}
            style={{
              flex: 1, padding: "13px", borderRadius: 10, border: "none",
              background: saving ? "var(--card-elevated)" : "rgba(16,185,129,0.85)",
              color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {saving ? "…" : "✓ Approve & Send to Pharmacy"}
          </button>
          <button
            data-testid="reject-prescription-btn"
            onClick={() => setShowReject(true)}
            style={{
              padding: "13px 20px", borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)",
              color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ✕ Reject
          </button>
        </div>
      )}

      {/* Reject modal */}
      {showReject && (
        <div style={{ marginTop: 12, padding: "14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f87171", marginBottom: 8 }}>Rejection reason (optional)</div>
          <input
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. drug interaction, allergy noted"
            style={{ ...inputSt, width: "100%", boxSizing: "border-box", fontSize: 12 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={handleReject} disabled={saving} style={{ ...saveBtnSt, background: "#ef4444" }}>
              {saving ? "…" : "Confirm Reject"}
            </button>
            <button onClick={() => setShowReject(false)} style={cancelBtnSt}>Cancel</button>
          </div>
        </div>
      )}

      {prescStatus === "approved" && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", fontSize: 12, color: "#10b981", fontWeight: 600 }}>
          ✓ Prescription approved and sent to pharmacy
          {fuDate && <span style={{ color: "var(--text-secondary)", fontWeight: 400, marginLeft: 10 }}>· Follow-up: {fuDate}</span>}
        </div>
      )}
      {prescStatus === "rejected" && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", fontSize: 12, color: "#f87171", fontWeight: 600 }}>
          ✕ Prescription rejected
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────

const inputSt = {
  padding: "8px 10px", borderRadius: 8,
  border: "1.5px solid var(--border)", background: "var(--input-bg)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "inherit",
};
const labelSt = {
  display: "block", fontSize: 11, color: "var(--text-muted)", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5,
};
const iconBtnStyle = {
  background: "transparent", border: "none", cursor: "pointer",
  color: "var(--text-muted)", padding: "4px 6px", borderRadius: 6,
  fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4,
  transition: "color 0.15s",
};
const saveBtnSt = {
  padding: "7px 14px", borderRadius: 8, border: "none",
  background: "var(--teal)", color: "#fff", fontSize: 12, fontWeight: 700,
  cursor: "pointer",
};
const cancelBtnSt = {
  padding: "7px 14px", borderRadius: 8,
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--text-secondary)", fontSize: 12, fontWeight: 600,
  cursor: "pointer",
};

// ── Divider ───────────────────────────────────

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
      <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
    </div>
  );
}

// ── Lab Tests Editor ──────────────────────────

function LabTestsEditor({ tests, patientId, onSaved }) {
  const [draft, setDraft]     = useState(tests ? [...tests] : []);
  const [newTest, setNewTest] = useState("");
  const [saving, setSaving]   = useState(false);

  const add = () => {
    const t = newTest.trim();
    if (!t || draft.includes(t)) return;
    setDraft(d => [...d, t]);
    setNewTest("");
  };

  const remove = (i) => setDraft(d => d.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try { await saveRecord(patientId, { lab_tests: draft }); onSaved(); }
    catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {draft.length === 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No tests ordered yet.</span>}
        {draft.map((t, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 99, fontSize: 12,
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", fontWeight: 500,
          }}>
            {t}
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newTest}
          onChange={e => setNewTest(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="e.g. CBC, HbA1c, ECG…"
          style={{ ...inputSt, flex: 1 }}
        />
        <button onClick={add} style={saveBtnSt}>+ Add</button>
        <button onClick={save} disabled={saving} style={{ ...saveBtnSt, background: "var(--teal-dim)" }}>
          {saving ? "…" : "Save Tests"}
        </button>
      </div>
    </div>
  );
}

// ── Custom Fields Editor ───────────────────────

function CustomFieldsEditor({ fields, patientId, onSaved }) {
  const [draft, setDraft]   = useState(fields && Object.keys(fields).length ? { ...fields } : {});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);

  const QUICK = ["Blood Group", "Allergies", "Family History", "Chief Complaint", "Past History", "Weight (kg)"];

  const addField = (key = newKey, val = newVal) => {
    const k = key.trim(); const v = val.trim();
    if (!k) return;
    setDraft(d => ({ ...d, [k]: v || "" }));
    setNewKey(""); setNewVal("");
  };

  const removeField = (key) => setDraft(d => { const n = { ...d }; delete n[key]; return n; });
  const updateVal = (key, val) => setDraft(d => ({ ...d, [key]: val }));

  const save = async () => {
    setSaving(true);
    try { await saveRecord(patientId, { custom_fields: draft }); onSaved(); }
    catch (e) { console.error(e); }
    setSaving(false);
  };

  const QUICK_REMAINING = QUICK.filter(q => !Object.keys(draft).includes(q));

  return (
    <div>
      {/* Quick add buttons */}
      {QUICK_REMAINING.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {QUICK_REMAINING.map(q => (
            <button key={q} onClick={() => addField(q, "")} style={{
              padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
              border: "1px dashed var(--border)", background: "transparent",
              color: "var(--text-muted)", cursor: "pointer",
            }}>+ {q}</button>
          ))}
        </div>
      )}

      {/* Existing fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {Object.entries(draft).map(([key, val]) => (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 28px", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{key}</div>
            <input value={val} onChange={e => updateVal(key, e.target.value)} style={{ ...inputSt, fontSize: 12 }} placeholder="Value…" />
            <button onClick={() => removeField(key)} style={{ ...iconBtnStyle, color: "#ef4444", fontSize: 15, padding: "2px" }}>✕</button>
          </div>
        ))}
      </div>

      {/* Add custom field */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginBottom: 10 }}>
        <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="Field name" style={{ ...inputSt, fontSize: 12 }} />
        <input value={newVal} onChange={e => setNewVal(e.target.value)} placeholder="Value" style={{ ...inputSt, fontSize: 12 }} onKeyDown={e => e.key === "Enter" && addField()} />
        <button onClick={() => addField()} style={saveBtnSt}>+ Add</button>
      </div>

      <button onClick={save} disabled={saving} style={{ ...saveBtnSt }}>
        {saving ? "Saving…" : "Save Additional Info"}
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────

export default function DoctorDashboard({ patientId, setPatientId }) {
  const [patients, setPatients]   = useState([]);   // unused, kept for compat
  const [selectedId, setSelectedId] = useState(patientId || "");
  const [patient, setPatient]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [urgencyChanging, setUrgencyChanging] = useState(false);

  // Fetch patient when selectedId changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true); setError("");
    getPatient(selectedId)
      .then(p => { setPatient(p); if (setPatientId) setPatientId(selectedId); })
      .catch(e => setError(e.message || "Patient not found"))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleUrgencyChange = async (level) => {
    if (!patient) return;
    setUrgencyChanging(true);
    try {
      await updateUrgency(patient.patient_id, level);
      setPatient(p => ({ ...p, urgency_level: level }));
    } catch (e) { setError(e.message); }
    setUrgencyChanging(false);
  };

  const refreshPatient = () => {
    if (!selectedId) return;
    getPatient(selectedId).then(setPatient).catch(() => {});
  };

  const handleSaveNullField = async (field, value) => {
    if (!patient) return;
    try {
      await saveRecord(patient.patient_id, { [field]: value });
      setPatient(p => ({ ...p, [field]: value }));
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal)", fontWeight: 600, marginBottom: 6 }}>
          Clinical Records
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
          Doctor Dashboard
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Select a patient, review AI-extracted record, edit and approve the prescription.
        </p>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      {/* Patient Dropdown */}
      <PatientDropdown patientId={selectedId || patientId} setPatientId={(id) => { setSelectedId(id); if (setPatientId) setPatientId(id); }} refresh={0} />

      {loading && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite", fontSize: 20 }}>⟳</span>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Patient Record Panel ── */}
      {patient && !loading && (
        <div data-testid="patient-record-panel" style={{ animation: "fadeIn 0.2s ease" }}>

          {/* Identity + Urgency */}
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
            padding: "20px 24px", marginBottom: 20,
            display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap",
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{patient.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                Age {patient.age} · {LANGUAGES[patient.language] || patient.language}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginLeft: 8, color: "var(--text-muted)" }}>
                  {patient.patient_id.slice(0, 8)}…
                </span>
              </div>
            </div>

            {/* Urgency selector */}
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Urgency
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {URGENCY_LEVELS.map(u => (
                  <button
                    key={u.value}
                    data-testid={`urgency-${u.value}`}
                    onClick={() => handleUrgencyChange(u.value)}
                    disabled={urgencyChanging}
                    style={{
                      padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      border: `1.5px solid ${patient.urgency_level === u.value ? u.color : "var(--border)"}`,
                      background: patient.urgency_level === u.value ? `${u.color}20` : "transparent",
                      color: patient.urgency_level === u.value ? u.color : "var(--text-muted)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transcript (if exists) */}
          {patient.transcript && (
            <details style={{ marginBottom: 16, background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}>
              <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                VIEW ORIGINAL TRANSCRIPT
              </summary>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {patient.transcript}
              </div>
            </details>
          )}

          {/* Diagnosis section */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>Clinical Findings</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <NullableField
                label="Primary Diagnosis"
                value={patient.diagnosis}
                onSave={v => handleSaveNullField("diagnosis", v)}
              />
              <NullableField
                label="ICD-10 Code"
                value={patient.icd10_code}
                onSave={v => handleSaveNullField("icd10_code", v)}
              />
            </div>

            {/* Symptoms */}
            <Divider label="Symptoms" />
            {patient.symptoms?.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {patient.symptoms.map((s, i) => (
                  <span key={i} style={{
                    padding: "4px 10px", borderRadius: 99, fontSize: 12,
                    background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)",
                    color: "var(--teal)", fontWeight: 500,
                  }}>{s}</span>
                ))}
              </div>
            ) : (
              <NullableField
                label="Symptoms"
                value={null}
                onSave={v => handleSaveNullField("symptoms_json", v ? [v] : null)}
              />
            )}

            {/* Secondary diagnoses */}
            {(patient.secondary_diagnoses?.length > 0) && (
              <>
                <Divider label="Secondary Diagnoses" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {patient.secondary_diagnoses.map((d, i) => (
                    <span key={i} style={{
                      padding: "4px 10px", borderRadius: 99, fontSize: 12,
                      background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
                      color: "#a78bfa", fontWeight: 500,
                    }}>{d}</span>
                  ))}
                </div>
              </>
            )}

            {/* Lab tests ordered — with editor */}
            <Divider label="Lab Tests Ordered" />
            <LabTestsEditor
              tests={patient.lab_tests}
              patientId={patient.patient_id}
              onSaved={refreshPatient}
            />

            {/* Notes */}
            <Divider label="Notes" />
            <NullableField
              label="Doctor Notes"
              value={patient.notes}
              multiline
              onSave={v => handleSaveNullField("notes", v)}
            />

            {/* Ambiguous terms */}
            {patient.ambiguous_terms?.length > 0 && (
              <>
                <Divider label="Ambiguous Terms Resolved" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {patient.ambiguous_terms.map((t, i) => (
                    <span key={i} style={{
                      padding: "4px 10px", borderRadius: 99, fontSize: 11,
                      background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                      color: "#f59e0b", fontFamily: "var(--font-mono)",
                    }}>{t}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Additional Info (doctor's custom fields) */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
              Additional Info
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>— any field not in the AI schema</span>
            </div>
            <CustomFieldsEditor
              fields={patient.custom_fields}
              patientId={patient.patient_id}
              onSaved={refreshPatient}
            />
          </div>

          {/* Prescription */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
            <PrescriptionEditor
              prescription={patient.prescription}
              patientId={patient.patient_id}
              prescStatus={patient.prescription_status}
              followUp={patient.follow_up}
              followUpDate={patient.follow_up_date}
              onSaved={refreshPatient}
            />
          </div>

          {/* Department status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { key: "pharmacy",    label: "Pharmacy",    val: patient.status?.pharmacy    || "pending" },
              { key: "lab",         label: "Lab",         val: patient.status?.lab         || "pending" },
              { key: "diagnostics", label: "Diagnostics", val: patient.status?.diagnostics || "not_required" },
            ].map(d => (
              <div key={d.key} style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{d.label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: d.val === "pending" ? "#f59e0b" : "#10b981" }}>
                  {d.val.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!patient && !loading && !error && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 48, opacity: 0.3, marginBottom: 14 }}>🩺</div>
          <p style={{ fontSize: 14, margin: 0 }}>Select a patient from the dropdown to view their clinical record</p>
        </div>
      )}
    </div>
  );
}
