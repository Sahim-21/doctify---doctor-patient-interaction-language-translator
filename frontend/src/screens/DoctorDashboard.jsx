import { useState, useEffect } from "react";
import { getPatient } from "../api";

const STATUS_CONFIG = {
  pending:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)",  label: "Pending" },
  dispensed:     { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  label: "Dispensed" },
  results_ready: { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)",  label: "Results Ready" },
  not_required:  { color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.3)", label: "Not Required" },
};

const LANG_LABELS = { hi: "Hindi", ta: "Tamil", kn: "Kannada", te: "Telugu", ml: "Malayalam" };

function StatusPill({ value }) {
  const cfg = STATUS_CONFIG[value] || { color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.3)", label: value || "Unknown" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

function SectionCard({ icon, title, children, accent }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 20px", borderBottom: "1px solid var(--border)",
        background: "var(--card-elevated)",
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: accent ? "var(--teal)" : "var(--text-secondary)",
        }}>{title}</span>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight }) {
  return (
    <div style={{ display: "flex", gap: 0, padding: "9px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
      <span style={{ minWidth: 140, fontSize: 12, color: "var(--text-muted)", paddingTop: 1, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 14, color: highlight ? "var(--teal)" : "var(--text-primary)",
        fontWeight: highlight ? 600 : 400,
        fontFamily: mono ? "var(--font-mono)" : "inherit", lineHeight: 1.5,
      }}>{value || "—"}</span>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "48px 0", color: "var(--text-muted)" }}>
      <span style={{ fontSize: 48, opacity: 0.4 }}>{icon}</span>
      <span style={{ fontSize: 14 }}>{message}</span>
    </div>
  );
}

export default function DoctorDashboard({ patientId }) {
  const [patient, setPatient]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [searchId, setSearchId] = useState(patientId || "");
  const [focused, setFocused]   = useState(false);

  const fetchPatient = async (id) => {
    if (!id?.trim()) return;
    setLoading(true); setError(""); setPatient(null);
    try {
      const data = await getPatient(id.trim());
      setPatient(data);
    } catch (e) {
      setError(e.message || "Patient not found.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (patientId) { setSearchId(patientId); fetchPatient(patientId); }
  }, [patientId]);

  return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal)", fontWeight: 600, marginBottom: 6 }}>Clinical Record</div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>Doctor Dashboard</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>View the full structured record extracted from the voice consultation.</p>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      {/* Search */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 32,
        background: "var(--card)",
        border: `1.5px solid ${focused ? "var(--teal)" : "var(--border)"}`,
        borderRadius: 12, padding: "6px 6px 6px 16px",
        boxShadow: focused ? "0 0 0 3px rgba(20,184,166,0.12)" : "none",
        transition: "all 0.2s",
      }}>
        <span style={{ fontSize: 18, color: "var(--text-muted)", display: "flex", alignItems: "center" }}>🔍</span>
        <input
          placeholder="Enter patient ID to look up…"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === "Enter" && fetchPatient(searchId)}
          style={{
            flex: 1, background: "transparent", border: "none",
            outline: "none", fontSize: 14, color: "var(--text-primary)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          onClick={() => fetchPatient(searchId)}
          disabled={loading}
          style={{
            padding: "9px 20px", background: "var(--teal)", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading…" : "Fetch"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#f87171", marginBottom: 24,
        }}>⚠ {error}</div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[120, 200, 160].map((h, i) => (
            <div key={i} style={{
              height: h, borderRadius: 14,
              background: "var(--card)", border: "1px solid var(--border)",
              animation: "pulse-opacity 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      )}

      {!loading && patient && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideUp 0.35s ease" }}>

          {/* Patient banner */}
          <div style={{
            background: "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0.04) 100%)",
            border: "1px solid rgba(20,184,166,0.25)",
            borderRadius: 14, padding: "20px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{patient.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                {patient.age} years · {LANG_LABELS[patient.language] || patient.language}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Patient ID</div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--teal)", fontWeight: 600,
                background: "rgba(20,184,166,0.1)", padding: "4px 10px", borderRadius: 6,
              }}>{patient.patient_id}</div>
              {patient.created_at && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {new Date(patient.created_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Two-col grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <SectionCard icon="🩺" title="Clinical Record" accent>
              <InfoRow label="Diagnosis"   value={patient.diagnosis}  highlight />
              <InfoRow label="ICD-10 Code" value={patient.icd10_code} mono highlight />
              <InfoRow label="Symptoms"    value={patient.symptoms?.join(", ")} />
              <InfoRow label="Follow-up"   value={patient.follow_up} />
              <div style={{ paddingTop: 9 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Notes</span>
                <span style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{patient.notes || "—"}</span>
              </div>
            </SectionCard>

            <SectionCard icon="🏥" title="Department Status">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["pharmacy", "lab", "diagnostics"].map(dept => (
                  <div key={dept} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: "var(--card-elevated)", borderRadius: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>{dept}</span>
                    <StatusPill value={patient.status?.[dept]} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Prescription table */}
          <SectionCard icon="💊" title="Prescription">
            {patient.prescription?.length > 0 ? (
              <div>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px",
                  gap: 8, padding: "6px 0 10px", borderBottom: "1px solid var(--border)", marginBottom: 4,
                }}>
                  {["Drug", "Dose", "Frequency", "Days"].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>{h}</span>
                  ))}
                </div>
                {patient.prescription.map((p, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "2fr 1fr 1fr 60px",
                    gap: 8, padding: "10px 0", alignItems: "center",
                    borderBottom: i < patient.prescription.length - 1 ? "1px solid var(--border)" : "none",
                  }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>{p.drug}</span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.dose}</span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{p.freq}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: "var(--teal)",
                      background: "rgba(20,184,166,0.1)", padding: "3px 8px",
                      borderRadius: 6, textAlign: "center",
                    }}>{p.days}d</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon="💊" message="No prescription issued" />}
          </SectionCard>

          {/* Lab tests */}
          <SectionCard icon="🔬" title="Lab Tests Ordered">
            {patient.lab_tests?.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {patient.lab_tests.map((test, i) => (
                  <span key={i} style={{
                    padding: "6px 14px", borderRadius: 20,
                    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                    color: "#818cf8", fontSize: 13, fontWeight: 500,
                  }}>{test}</span>
                ))}
              </div>
            ) : <EmptyState icon="🔬" message="No lab tests ordered" />}
          </SectionCard>

        </div>
      )}

      {!loading && !patient && !error && (
        <EmptyState icon="🩺" message="Search for a patient ID above to view their record" />
      )}
    </div>
  );
}
