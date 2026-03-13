import { useState, useEffect } from "react";
import { getPatient, updateLab } from "../api";

const RESULT_HINTS = {
  "CBC":              "e.g. WBC 7.2, RBC 4.8, Hgb 14.1",
  "Blood Glucose":    "e.g. 98 mg/dL (Fasting)",
  "HbA1c":           "e.g. 5.9%",
  "Lipid Profile":   "e.g. LDL 110, HDL 52, TG 148",
  "Urine Analysis":  "e.g. Clear, pH 6.0, No protein",
  "Liver Function":  "e.g. ALT 32, AST 28, ALP 74",
  "Kidney Function": "e.g. Creatinine 0.9, BUN 15",
  "TSH":             "e.g. 2.4 mIU/L",
  "ECG":             "e.g. Normal sinus rhythm",
  "X-Ray":           "e.g. No acute cardiopulmonary findings",
};

function getHint(test) {
  for (const key of Object.keys(RESULT_HINTS)) {
    if (test.toLowerCase().includes(key.toLowerCase())) return RESULT_HINTS[key];
  }
  return "Enter result value…";
}

function TestCard({ test, value, onChange, submitted, focused, onFocus, onBlur }) {
  const hasValue = value?.trim().length > 0;
  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${focused ? "rgba(99,102,241,0.5)" : hasValue ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
      background: hasValue ? "rgba(99,102,241,0.04)" : "var(--card)",
      overflow: "hidden",
      transition: "border-color 0.2s, background 0.2s",
      boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
    }}>
      {/* Test header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: `1px solid ${hasValue ? "rgba(99,102,241,0.15)" : "var(--border)"}`,
        background: "var(--card-elevated)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: hasValue ? "rgba(99,102,241,0.15)" : "var(--card)",
            border: `1px solid ${hasValue ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>
            🔬
          </span>
          <span style={{
            fontSize: 14, fontWeight: 700,
            color: hasValue ? "#818cf8" : "var(--text-primary)",
            transition: "color 0.2s",
          }}>
            {test}
          </span>
        </div>
        {/* Status dot */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11, fontWeight: 600,
          color: submitted ? "#10b981" : hasValue ? "#818cf8" : "var(--text-muted)",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: submitted ? "#10b981" : hasValue ? "#818cf8" : "var(--border)",
            display: "inline-block",
          }} />
          {submitted ? "Submitted" : hasValue ? "Entered" : "Pending"}
        </div>
      </div>

      {/* Result input */}
      <div style={{ padding: "12px 16px" }}>
        <input
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={submitted}
          placeholder={getHint(test)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1.5px solid transparent",
            background: submitted ? "var(--card-elevated)" : "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: 13,
            fontFamily: submitted ? "var(--font-mono)" : "inherit",
            outline: "none",
            transition: "background 0.2s",
            cursor: submitted ? "default" : "text",
          }}
        />
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
        background: "rgba(99,102,241,0.15)",
        border: "2px solid rgba(99,102,241,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        🧪
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{patient.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          Age {patient.age} &nbsp;·&nbsp;
          <span style={{ fontFamily: "var(--font-mono)" }}>{patient.patient_id}</span>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Tests ordered</div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#818cf8",
          fontFamily: "var(--font-mono)",
        }}>
          {patient.lab_tests?.length || 0}
        </div>
      </div>
    </div>
  );
}

function CompletionRing({ done, total }) {
  const pct = total === 0 ? 0 : done / total;
  const r = 24, stroke = 4;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <svg width={60} height={60} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
        <circle cx={30} cy={30} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={30} cy={30} r={r} fill="none"
          stroke="#818cf8"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          {done} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>of {total} results entered</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
          {pct === 1 ? "All tests complete — ready to submit" : `${total - done} remaining`}
        </div>
      </div>
    </div>
  );
}

export default function LabPortal({ patientId }) {
  const [patient,   setPatient]  = useState(null);
  const [searchId,  setSearchId] = useState(patientId || "");
  const [results,   setResults]  = useState({});
  const [submitted, setSubmitted]= useState(false);
  const [loading,   setLoading]  = useState(false);
  const [saving,    setSaving]   = useState(false);
  const [error,     setError]    = useState("");
  const [focused,   setFocused]  = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchPatient = async (id) => {
    if (!id?.trim()) return;
    setLoading(true);
    setError("");
    setPatient(null);
    setResults({});
    try {
      const data = await getPatient(id.trim());
      setPatient(data);
      const already = data.status?.lab === "results_ready";
      setSubmitted(already);
      const init = {};
      data.lab_tests?.forEach(t => { init[t] = ""; });
      setResults(init);
    } catch (e) {
      setError(e.message || "Patient not found.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (patientId) { setSearchId(patientId); fetchPatient(patientId); }
  }, [patientId]);

  const handleChange = (test, val) =>
    setResults(prev => ({ ...prev, [test]: val }));

  const filledCount = Object.values(results).filter(v => v?.trim()).length;
  const totalCount  = patient?.lab_tests?.length || 0;
  const allFilled   = totalCount > 0 && filledCount === totalCount;

  const submitResults = async () => {
    setSaving(true);
    setError("");
    try {
      await updateLab(patient.patient_id, "results_ready", results);
      setSubmitted(true);
      setPatient(prev => ({ ...prev, status: { ...prev.status, lab: "results_ready" } }));
    } catch (e) {
      setError(e.message || "Failed to submit lab results.");
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#818cf8", fontWeight: 600, marginBottom: 6 }}>
          Department Portal
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
          Laboratory Results
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Enter test results for each ordered investigation. All fields must be filled before submitting.
        </p>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      {/* Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 15, color: "var(--text-muted)", pointerEvents: "none",
          }}>🔬</span>
          <input
            placeholder="Enter patient ID…"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchPatient(searchId)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "12px 14px 12px 40px",
              borderRadius: 10,
              border: `1.5px solid ${searchFocused ? "#818cf8" : "var(--border)"}`,
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              fontSize: 14, fontFamily: "var(--font-mono)",
              outline: "none",
              boxShadow: searchFocused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />
        </div>
        <button
          onClick={() => fetchPatient(searchId)}
          disabled={loading}
          style={{
            padding: "12px 22px", borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {loading ? "Loading…" : "Load Patient"}
        </button>
      </div>

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

      {/* Already submitted banner */}
      {submitted && patient && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 10, padding: "14px 18px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 22 }}>✅</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>Results already submitted</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Lab results for this patient have been recorded.
            </div>
          </div>
        </div>
      )}

      {/* Patient + Tests */}
      {patient && (
        <>
          <PatientBanner patient={patient} />

          {totalCount === 0 ? (
            <div style={{
              textAlign: "center", padding: "40px 20px",
              color: "var(--text-muted)", fontSize: 14,
            }}>
              <span style={{ fontSize: 36, display: "block", marginBottom: 12, opacity: 0.4 }}>🔬</span>
              No lab tests were ordered for this patient.
            </div>
          ) : (
            <>
              {!submitted && <CompletionRing done={filledCount} total={totalCount} />}

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {patient.lab_tests.map((test, i) => (
                  <TestCard
                    key={i}
                    test={test}
                    value={results[test]}
                    onChange={val => handleChange(test, val)}
                    submitted={submitted}
                    focused={focused === test}
                    onFocus={() => setFocused(test)}
                    onBlur={() => setFocused(null)}
                  />
                ))}
              </div>

              {!submitted && (
                <button
                  onClick={submitResults}
                  disabled={!allFilled || saving}
                  style={{
                    width: "100%", padding: "15px",
                    borderRadius: 12, border: "none",
                    background: allFilled
                      ? "linear-gradient(135deg, #6366f1, #818cf8)"
                      : "var(--card-elevated)",
                    color: allFilled ? "#fff" : "var(--text-muted)",
                    fontSize: 15, fontWeight: 700,
                    cursor: allFilled && !saving ? "pointer" : "not-allowed",
                    transition: "all 0.25s ease",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  }}
                >
                  {saving ? (
                    <><span style={{ animation: "spin 0.8s linear infinite" }}>⟳</span> Submitting…</>
                  ) : allFilled ? (
                    <>📤 Submit All Results</>
                  ) : (
                    <>Fill all {totalCount} fields to submit ({filledCount}/{totalCount})</>
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
          <span style={{ fontSize: 48, opacity: 0.4 }}>🧪</span>
          <p style={{ fontSize: 14, margin: 0 }}>Enter a patient ID to load their lab orders</p>
        </div>
      )}
    </div>
  );
}