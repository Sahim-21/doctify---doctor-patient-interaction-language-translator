import { useState, useEffect } from "react";
import { listPatients, getPatient, deletePatient, deleteAllPatients, updateBilling } from "../api";
import { UrgencyBadge } from "../App";
import PatientDropdown from "../components/PatientDropdown";

const LANGS = { hi: "Hindi", ta: "Tamil", kn: "Kannada", te: "Telugu", ml: "Malayalam", en: "English" };

function BillingPanel({ patient, onUpdated }) {
  const [consult, setConsult]   = useState(0);
  const [tests, setTests]       = useState(0);
  const [medicine, setMedicine] = useState(0);
  const [other, setOther]       = useState(0);
  const [notes, setNotes]       = useState(patient.billing_notes || "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const total = Number(consult) + Number(tests) + Number(medicine) + Number(other);
  const isPaid = patient.billing_status === "paid";

  useEffect(() => {
    // Pre-fill from billing_notes if present
    const fee = patient.total_fee || 0;
    setConsult(0); setTests(0); setMedicine(0); setOther(fee);
    setNotes(patient.billing_notes || "");
  }, [patient.patient_id]);

  const save = async (markPaid = false) => {
    setSaving(true); setError("");
    const breakdown = `Consultation: ₹${consult} | Tests: ₹${tests} | Medicine: ₹${medicine} | Other: ₹${other}`;
    try {
      await updateBilling(patient.patient_id, {
        total_fee: total,
        billing_status: markPaid ? "paid" : "unpaid",
        billing_notes: notes || breakdown,
      });
      onUpdated();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const inputSt = {
    padding: "9px 12px", borderRadius: 8,
    border: "1.5px solid var(--border)", background: "var(--input-bg)",
    color: "var(--text-primary)", fontSize: 14, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ marginTop: 14, padding: "16px", borderRadius: 10, background: "var(--card-elevated)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
        Fee Breakdown (₹)
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {[
          { label: "Consultation", value: consult, set: setConsult },
          { label: "Lab Tests",    value: tests,   set: setTests   },
          { label: "Medicine",     value: medicine, set: setMedicine },
          { label: "Other",        value: other,   set: setOther   },
        ].map(f => (
          <div key={f.label}>
            <label style={{ display: "block", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.06em" }}>
              {f.label}
            </label>
            <input
              type="number"
              min={0}
              value={f.value}
              onChange={e => f.set(e.target.value)}
              disabled={isPaid}
              style={inputSt}
            />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: "block", fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.06em" }}>
          Notes
        </label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Billing notes…"
          disabled={isPaid}
          style={inputSt}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
          Total: <span style={{ color: "var(--teal)" }}>₹{total}</span>
        </div>
        {isPaid ? (
          <span style={{ padding: "6px 14px", borderRadius: 99, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: 13, fontWeight: 700 }}>
            ✓ PAID
          </span>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => save(false)} disabled={saving} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Save
            </button>
            <button
              data-testid={`mark-paid-${patient.patient_id.slice(0, 8)}`}
              onClick={() => save(true)}
              disabled={saving || total === 0}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontSize: 12, fontWeight: 700, cursor: (saving || total === 0) ? "not-allowed" : "pointer", opacity: total === 0 ? 0.5 : 1 }}
            >
              {saving ? "…" : "Mark as Paid ₹" + total}
            </button>
          </div>
        )}
      </div>
      {error && <div style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>⚠ {error}</div>}
    </div>
  );
}

export default function ReceptionDashboard({ patientId, setPatientId }) {
  const [patients, setPatients]   = useState([]);
  const [expanded, setExpanded]   = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [refresh, setRefresh]     = useState(0);
  const [error, setError]         = useState("");

  const load = () => { listPatients().then(setPatients).catch(() => {}); setRefresh(r => r + 1); };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete patient "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deletePatient(id);
      if (patientId === id) setPatientId(null);
      load();
    } catch (e) { setError(e.message); }
    setDeleting(null);
  };

  const handleClearAll = async () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    try {
      await deleteAllPatients();
      setPatientId(null);
      setClearConfirm(false);
      load();
    } catch (e) { setError(e.message); }
  };

  const statusColor = (s) => s === "paid" ? "#10b981" : "#f59e0b";

  return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f59e0b", fontWeight: 600, marginBottom: 6 }}>
          Reception
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
          Patient Management
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Charge fees, mark payments, and manage the patient list.
        </p>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      <PatientDropdown patientId={patientId} setPatientId={setPatientId} label="Quick Navigate" refresh={refresh} />

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "12px 16px", color: "#f87171", fontSize: 13, marginBottom: 20 }}>
          ⚠ {error}
        </div>
      )}

      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total Patients",  value: patients.length,                                         color: "var(--teal)"  },
          { label: "Awaiting Payment",value: patients.filter(p => p.billing_status !== "paid").length, color: "#f59e0b" },
          { label: "Paid",            value: patients.filter(p => p.billing_status === "paid").length,  color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--card-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Patient list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {patients.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: 14 }}>
            No patients registered yet.
          </div>
        ) : (
          patients.map(p => (
            <div key={p.patient_id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {/* Patient row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <UrgencyBadge level={p.urgency_level} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Age {p.age} · {LANGS[p.language] || p.language} · ID: {p.patient_id.slice(0, 8)}…
                  </div>
                </div>
                {/* Billing status */}
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 700,
                  background: statusColor(p.billing_status) + "18",
                  color: statusColor(p.billing_status),
                  border: `1px solid ${statusColor(p.billing_status)}33`,
                }}>
                  {(p.billing_status || "unpaid").toUpperCase()}
                  {p.total_fee > 0 && ` · ₹${p.total_fee}`}
                </span>
                {/* Expand billing */}
                <button
                  data-testid={`billing-toggle-${p.patient_id.slice(0, 8)}`}
                  onClick={() => setExpanded(expanded === p.patient_id ? null : p.patient_id)}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {expanded === p.patient_id ? "▲ Close" : "💰 Bill"}
                </button>
                {/* Delete */}
                <button
                  data-testid={`delete-patient-${p.patient_id.slice(0, 8)}`}
                  onClick={() => handleDelete(p.patient_id, p.name)}
                  disabled={deleting === p.patient_id}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {deleting === p.patient_id ? "…" : "Delete"}
                </button>
              </div>

              {/* Billing panel */}
              {expanded === p.patient_id && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "0 16px 16px" }}>
                  <BillingPanel
                    patient={{ ...p, billing_status: p.billing_status || "unpaid", total_fee: p.total_fee || 0, billing_notes: p.billing_notes }}
                    onUpdated={load}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Danger zone */}
      {patients.length > 0 && (
        <div style={{ marginTop: 32, padding: "20px", borderRadius: 12, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>
            Danger Zone
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Permanently remove all patients from the database. This action cannot be undone.
          </div>
          {clearConfirm ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>Are you sure? All {patients.length} patients will be deleted.</span>
              <button onClick={handleClearAll} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Yes, Delete All</button>
              <button onClick={() => setClearConfirm(false)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <button
              data-testid="clear-all-patients-btn"
              onClick={handleClearAll}
              style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Clear All Patients
            </button>
          )}
        </div>
      )}
    </div>
  );
}
