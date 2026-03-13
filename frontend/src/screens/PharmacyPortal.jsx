import { useState, useEffect } from "react";
import { getPatient, updatePharmacy } from "../api";
import PatientDropdown from "../components/PatientDropdown";

function DrugCard({ drug, dose, freq, days, checked, onToggle, dispensed }) {
  return (
    <div
      onClick={() => !dispensed && onToggle()}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 18px",
        borderRadius: 12,
        border: `1.5px solid ${checked ? "rgba(20,184,166,0.4)" : "var(--border)"}`,
        background: checked ? "rgba(20,184,166,0.06)" : "var(--card-elevated)",
        cursor: dispensed ? "default" : "pointer",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: `2px solid ${checked ? "var(--teal)" : "var(--border)"}`,
        background: checked ? "var(--teal)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s ease",
      }}>
        {checked && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>

      {/* Drug info */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: checked ? "var(--teal)" : "var(--text-primary)",
          transition: "color 0.2s",
        }}>
          {drug}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, display: "flex", gap: 12 }}>
          <span>💊 {dose}</span>
          <span>🕐 {freq}</span>
        </div>
      </div>

      {/* Days badge */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "6px 14px", borderRadius: 8,
        background: checked ? "rgba(20,184,166,0.15)" : "var(--card)",
        border: `1px solid ${checked ? "rgba(20,184,166,0.3)" : "var(--border)"}`,
        transition: "all 0.2s",
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: checked ? "var(--teal)" : "var(--text-secondary)" }}>
          {days}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>DAYS</span>
      </div>
    </div>
  );
}

function PatientBanner({ patient }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "16px 20px",
      background: "var(--card-elevated)",
      borderRadius: 12,
      border: "1px solid var(--border)",
      marginBottom: 24,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "rgba(20,184,166,0.15)",
        border: "2px solid rgba(20,184,166,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        👤
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{patient.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          Age {patient.age} &nbsp;·&nbsp;
          <span style={{ fontFamily: "var(--font-mono)" }}>{patient.patient_id}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Diagnosis</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {patient.diagnosis || "—"}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ checked, total }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
          Dispensing progress
        </span>
        <span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 700 }}>
          {checked}/{total} items
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 99,
        background: "var(--border)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${pct}%`,
          background: pct === 100 ? "var(--teal)" : "linear-gradient(90deg, var(--teal), #60efdf)",
          transition: "width 0.35s ease",
        }} />
      </div>
    </div>
  );
}

export default function PharmacyPortal({ patientId, setPatientId }) {
  const [patient,  setPatient]  = useState(null);
  const [searchId, setSearchId] = useState(patientId || "");
  const [checked,  setChecked]  = useState({});
  const [dispensed,setDispensed]= useState(false);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [focused,  setFocused]  = useState(false);

  const fetchPatient = async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setError("");
    setPatient(null);
    setChecked({});
    try {
      const data = await getPatient(id.trim());
      setPatient(data);
      const already = data.status?.pharmacy === "dispensed";
      setDispensed(already);
      // Pre-check all if already dispensed
      const init = {};
      data.prescription?.forEach((_, i) => { init[i] = already; });
      setChecked(init);
    } catch (e) {
      setError(e.message || "Patient not found.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (patientId) { setSearchId(patientId); fetchPatient(patientId); }
  }, [patientId]);

  const toggleItem = (i) =>
    setChecked(prev => ({ ...prev, [i]: !prev[i] }));

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalCount   = patient?.prescription?.length || 0;
  const allChecked   = totalCount > 0 && checkedCount === totalCount;

  const markDispensed = async () => {
    setSaving(true);
    setError("");
    try {
      await updatePharmacy(patient.patient_id, "dispensed");
      setDispensed(true);
      setPatient(prev => ({ ...prev, status: { ...prev.status, pharmacy: "dispensed" } }));
    } catch (e) {
      setError(e.message || "Failed to update pharmacy status.");
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal)", fontWeight: 600, marginBottom: 6 }}>
          Department Portal
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
          Pharmacy Dispensing
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Verify and dispense prescribed medications. Check off each drug before confirming.
        </p>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      <PatientDropdown patientId={patientId} setPatientId={setPatientId} />

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "12px 16px", color: "#f87171",
          fontSize: 13, marginBottom: 20,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Already dispensed banner */}
      {dispensed && patient && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>All medications dispensed</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              This prescription has already been fulfilled.
            </div>
          </div>
        </div>
      )}

      {/* Patient content */}
      {patient && (
        <>
          <PatientBanner patient={patient} />

          {totalCount === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              color: "var(--text-muted)", fontSize: 14,
            }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 12, opacity: 0.4 }}>📋</span>
              No prescription items for this patient.
            </div>
          ) : (
            <>
              <ProgressBar checked={checkedCount} total={totalCount} />

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {patient.prescription.map((p, i) => (
                  <DrugCard
                    key={i}
                    {...p}
                    checked={!!checked[i]}
                    onToggle={() => toggleItem(i)}
                    dispensed={dispensed}
                  />
                ))}
              </div>

              {!dispensed && (
                <button
                  onClick={markDispensed}
                  disabled={!allChecked || saving}
                  style={{
                    width: "100%", padding: "15px",
                    borderRadius: 12, border: "none",
                    background: allChecked ? "var(--teal)" : "var(--card-elevated)",
                    color: allChecked ? "#fff" : "var(--text-muted)",
                    fontSize: 15, fontWeight: 700,
                    cursor: allChecked && !saving ? "pointer" : "not-allowed",
                    transition: "all 0.25s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}
                >
                  {saving ? (
                    <><span style={{ animation: "spin 0.8s linear infinite" }}>⟳</span> Updating…</>
                  ) : allChecked ? (
                    <>✅ Confirm Dispensed</>
                  ) : (
                    <>☐ Check all items to confirm ({checkedCount}/{totalCount})</>
                  )}
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !patient && !error && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "60px 20px", color: "var(--text-muted)", gap: 12,
        }}>
          <span style={{ fontSize: 48, opacity: 0.4 }}>💊</span>
          <p style={{ fontSize: 14, margin: 0 }}>Enter a patient ID to load their prescription</p>
        </div>
      )}
    </div>
  );
}
