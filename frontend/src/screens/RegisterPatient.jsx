import { useState } from "react";
import { registerPatient } from "../api";

const LANGUAGES = [
  { code: "hi", label: "Hindi", flag: "🇮🇳", region: "North India" },
  { code: "ta", label: "Tamil", flag: "🏛️", region: "Tamil Nadu" },
  { code: "kn", label: "Kannada", flag: "🌿", region: "Karnataka" },
  { code: "te", label: "Telugu", flag: "⭐", region: "Andhra Pradesh" },
  { code: "ml", label: "Malayalam", flag: "🌴", region: "Kerala" },
];

const styles = {
  wrapper: {
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  card: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 460,
    boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
  },
  header: {
    marginBottom: 32,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--teal)",
    fontWeight: 600,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 6,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  input: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  langGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  langOption: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    background: "var(--input-bg)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  langOptionActive: {
    borderColor: "var(--teal)",
    background: "rgba(20, 184, 166, 0.08)",
  },
  langFlag: {
    fontSize: 18,
  },
  langText: {
    display: "flex",
    flexDirection: "column",
  },
  langLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  langRegion: {
    fontSize: 11,
    color: "var(--text-muted)",
  },
  divider: {
    height: 1,
    background: "var(--border)",
    margin: "28px 0",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "var(--teal)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s, transform 0.1s",
    letterSpacing: "0.02em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#f87171",
  },
};

export default function RegisterPatient({ onRegistered }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [language, setLanguage] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const handleRegister = async () => {
    if (!name.trim()) { setError("Patient name is required"); return; }
    if (!age || parseInt(age) < 1 || parseInt(age) > 120) { setError("Please enter a valid age (1–120)"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await registerPatient(name.trim(), parseInt(age), language);
      onRegistered(data.patient_id);
    } catch (e) {
      setError(e.message || "Could not connect to server. Is the backend running?");
    }
    setLoading(false);
  };

  const inputStyle = (field) => ({
    ...styles.input,
    borderColor: focusedField === field ? "var(--teal)" : "var(--border)",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(20,184,166,0.15)" : "none",
  });

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.eyebrow}>New Intake</div>
          <h2 style={styles.title}>Register Patient</h2>
          <p style={styles.subtitle}>Enter basic patient details to begin the consultation</p>
        </div>

        <div style={styles.fieldGroup}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              style={inputStyle("name")}
              placeholder="e.g. Meena Krishnamurthy"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />
          </div>

          {/* Age */}
          <div style={styles.field}>
            <label style={styles.label}>Age (years)</label>
            <input
              style={inputStyle("age")}
              placeholder="e.g. 42"
              type="number"
              min="1"
              max="120"
              value={age}
              onChange={e => setAge(e.target.value)}
              onFocus={() => setFocusedField("age")}
              onBlur={() => setFocusedField(null)}
              onKeyDown={e => e.key === "Enter" && handleRegister()}
            />
          </div>

          {/* Language */}
          <div style={styles.field}>
            <label style={styles.label}>Preferred Language</label>
            <div style={styles.langGrid}>
              {LANGUAGES.map(lang => (
                <div
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  style={{
                    ...styles.langOption,
                    ...(language === lang.code ? styles.langOptionActive : {}),
                  }}
                >
                  <span style={styles.langFlag}>{lang.flag}</span>
                  <div style={styles.langText}>
                    <span style={{
                      ...styles.langLabel,
                      color: language === lang.code ? "var(--teal)" : "var(--text-primary)"
                    }}>
                      {lang.label}
                    </span>
                    <span style={styles.langRegion}>{lang.region}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ ...styles.errorBox, marginTop: 20 }}>
            <span>⚠</span> {error}
          </div>
        )}

        <div style={styles.divider} />

        <button
          data-testid="register-submit-btn"
          onClick={handleRegister}
          disabled={loading}
          style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={e => (e.currentTarget.style.opacity = loading ? "0.7" : "1")}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span>
              Registering…
            </>
          ) : (
            <>
              <span>＋</span> Register &amp; Begin Consultation
            </>
          )}
        </button>
      </div>
    </div>
  );
}
