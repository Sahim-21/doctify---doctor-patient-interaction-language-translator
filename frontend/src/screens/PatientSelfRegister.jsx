import { useState } from "react";
import { registerPatient } from "../api";

const LANGUAGES = [
  { code: "hi", label: "Hindi",     flag: "🇮🇳", region: "North India"     },
  { code: "ta", label: "Tamil",     flag: "🏛️", region: "Tamil Nadu"       },
  { code: "kn", label: "Kannada",   flag: "🌿", region: "Karnataka"        },
  { code: "te", label: "Telugu",    flag: "⭐", region: "Andhra Pradesh"   },
  { code: "ml", label: "Malayalam", flag: "🌴", region: "Kerala"           },
  { code: "en", label: "English",   flag: "🔤", region: "General"          },
];

// ── Patient ID Card (shown after registration) ────────────────────────

function PatientIDCard({ patient }) {
  const [copied, setCopied] = useState(false);
  const lang = LANGUAGES.find(l => l.code === patient.language);
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const copyId = () => {
    navigator.clipboard.writeText(patient.patient_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const printCard = () => window.print();

  return (
    <div style={{ animation: "slideUp 0.4s ease" }}>
      {/* Success banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px", borderRadius: 12, marginBottom: 24,
        background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(16,185,129,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>✓</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>
            Registration Successful!
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Your patient profile has been created. Save your Patient ID below.
          </div>
        </div>
      </div>

      {/* ID Card */}
      <div id="patient-id-card" style={{
        background: "linear-gradient(135deg, #161d27 0%, #1c2433 100%)",
        border: "1px solid rgba(20,184,166,0.35)",
        borderRadius: 16,
        padding: "28px 28px",
        position: "relative",
        overflow: "hidden",
        marginBottom: 20,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {/* Decorative glow */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200, borderRadius: "50%",
          background: "rgba(20,184,166,0.07)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -40, left: -40,
          width: 150, height: 150, borderRadius: "50%",
          background: "rgba(14,165,233,0.05)", pointerEvents: "none",
        }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "linear-gradient(135deg, var(--teal), #0ea5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>⚕️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>ClinixAI</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Patient ID Card</div>
            </div>
          </div>
          <div style={{
            padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700,
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981", letterSpacing: "0.06em",
          }}>REGISTERED</div>
        </div>

        {/* Name row */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            PATIENT NAME
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{patient.name}</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
            Age: {patient.age} &nbsp;·&nbsp; Language: {lang?.label || patient.language}
            {patient.phone && <span> &nbsp;·&nbsp; {patient.phone}</span>}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 18 }} />

        {/* Patient ID — big and prominent */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
            PATIENT ID
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--teal)",
            background: "rgba(20,184,166,0.07)",
            border: "1px solid rgba(20,184,166,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            letterSpacing: "0.05em",
            wordBreak: "break-all",
            lineHeight: 1.6,
          }}>
            {patient.patient_id}
          </div>
        </div>

        {/* Registration date */}
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Registered: {date}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <button
          data-testid="copy-patient-id-btn"
          onClick={copyId}
          style={{
            padding: "12px", borderRadius: 10,
            border: `1.5px solid ${copied ? "rgba(16,185,129,0.4)" : "var(--border)"}`,
            background: copied ? "rgba(16,185,129,0.1)" : "var(--card-elevated)",
            color: copied ? "#10b981" : "var(--text-secondary)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "all 0.2s",
          }}
        >
          {copied ? "✓ Copied!" : "⧉ Copy Patient ID"}
        </button>
        <button
          data-testid="print-card-btn"
          onClick={printCard}
          style={{
            padding: "12px", borderRadius: 10,
            border: "1.5px solid var(--border)",
            background: "var(--card-elevated)",
            color: "var(--text-secondary)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "all 0.2s",
          }}
        >
          🖨️ Print Card
        </button>
      </div>

      {/* Instruction */}
      <div style={{
        padding: "14px 16px", borderRadius: 10,
        background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
        fontSize: 12, color: "#f59e0b", lineHeight: 1.7,
      }}>
        <strong>Next steps:</strong><br />
        1. Save or screenshot your Patient ID above<br />
        2. Present this ID at the reception desk or share it with your doctor<br />
        3. The doctor will use this ID to access your consultation record
      </div>
    </div>
  );
}

// ── Registration Form ─────────────────────────────────────────────────

export default function PatientSelfRegister({ onBack }) {
  const [name, setName]         = useState("");
  const [age, setAge]           = useState("");
  const [phone, setPhone]       = useState("");
  const [language, setLanguage] = useState("hi");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [registered, setRegistered] = useState(null);   // patient object after success
  const [focused, setFocused]   = useState(null);

  const inputStyle = (field) => ({
    width: "100%", boxSizing: "border-box",
    padding: "12px 14px", borderRadius: 10,
    border: `1.5px solid ${focused === field ? "var(--teal)" : "var(--border)"}`,
    background: "var(--input-bg)", color: "var(--text-primary)",
    fontSize: 15, outline: "none", fontFamily: "inherit",
    boxShadow: focused === field ? "0 0 0 3px rgba(20,184,166,0.15)" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  const handleRegister = async () => {
    if (!name.trim())         { setError("Please enter your full name."); return; }
    if (!age || parseInt(age) < 1 || parseInt(age) > 120) { setError("Please enter a valid age (1-120)."); return; }
    setLoading(true); setError("");
    try {
      const res = await registerPatient(name.trim(), parseInt(age), language, phone.trim() || undefined);
      setRegistered({
        patient_id: res.patient_id,
        name: name.trim(),
        age: parseInt(age),
        language,
        phone: phone.trim() || null,
      });
    } catch (e) {
      setError(e.message || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, var(--teal), #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, margin: "0 auto 12px",
            boxShadow: "0 8px 24px rgba(20,184,166,0.35)",
          }}>⚕️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>ClinixAI</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>
            Patient Self-Registration
          </div>
        </div>

        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "32px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>

          {registered ? (
            <PatientIDCard patient={registered} />
          ) : (
            <>
              <div style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                New Patient
              </div>
              <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                Register yourself
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-muted)" }}>
                Fill in your details. You'll receive a unique Patient ID to share with the doctor.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                    Full Name *
                  </label>
                  <input
                    data-testid="self-reg-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    placeholder="e.g. Meena Krishnamurthy"
                    style={inputStyle("name")}
                  />
                </div>

                {/* Age + Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                      Age *
                    </label>
                    <input
                      data-testid="self-reg-age"
                      type="number"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      onFocus={() => setFocused("age")}
                      onBlur={() => setFocused(null)}
                      placeholder="35"
                      min={1} max={120}
                      style={inputStyle("age")}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>
                      Phone (optional)
                    </label>
                    <input
                      data-testid="self-reg-phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onFocus={() => setFocused("phone")}
                      onBlur={() => setFocused(null)}
                      placeholder="+91 98765 43210"
                      style={inputStyle("phone")}
                    />
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                    Preferred Language *
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        data-testid={`lang-${l.code}`}
                        onClick={() => setLanguage(l.code)}
                        style={{
                          padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                          border: `1.5px solid ${language === l.code ? "var(--teal)" : "var(--border)"}`,
                          background: language === l.code ? "rgba(20,184,166,0.1)" : "var(--card-elevated)",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                          transition: "all 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{l.flag}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: language === l.code ? "var(--teal)" : "var(--text-secondary)" }}>
                          {l.label}
                        </span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{l.region}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div style={{
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171",
                  }}>
                    ⚠ {error}
                  </div>
                )}

                <button
                  data-testid="self-reg-submit-btn"
                  onClick={handleRegister}
                  disabled={loading}
                  style={{
                    width: "100%", padding: "14px",
                    borderRadius: 10, border: "none",
                    background: "var(--teal)", color: "#fff",
                    fontSize: 15, fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.75 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "opacity 0.2s",
                  }}
                >
                  {loading
                    ? <><span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span> Registering…</>
                    : "Register & Get My Patient ID →"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Back to staff login */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 13,
              textDecoration: "underline", padding: 0,
            }}
          >
            ← Staff Login
          </button>
        </div>
      </div>
    </div>
  );
}
