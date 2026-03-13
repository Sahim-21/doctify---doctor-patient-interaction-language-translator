import { useState } from "react";
import RegisterPatient from "./screens/RegisterPatient";
import VoiceConsultation from "./screens/VoiceConsultation";
import DoctorDashboard from "./screens/DoctorDashboard";
import PharmacyPortal from "./screens/PharmacyPortal";
import LabPortal from "./screens/LabPortal";
import PatientStatus from "./screens/PatientStatus";

/* ── Global styles injected once ─────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:             #0d1117;
    --bg-secondary:   #111820;
    --card:           #161d27;
    --card-elevated:  #1c2433;
    --border:         #253040;
    --border-subtle:  #1e2a38;
    --input-bg:       #111820;
    --teal:           #14b8a6;
    --teal-dim:       #0d9488;
    --text-primary:   #e2e8f0;
    --text-secondary: #94a3b8;
    --text-muted:     #4e6278;
    --font-mono:      'DM Mono', 'Fira Code', monospace;
  }

  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--text-primary);
    font-family: 'DM Sans', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  input, textarea, select, button {
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes pulse-bg {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
`;

function injectGlobalStyles() {
  if (document.getElementById("cvs-global")) return;
  const tag = document.createElement("style");
  tag.id = "cvs-global";
  tag.textContent = GLOBAL_CSS;
  document.head.appendChild(tag);
}
injectGlobalStyles();

/* ── Nav config ───────────────────────────────────────────────────────── */
const TABS = [
  { key: "register", label: "Register",  icon: "＋",  desc: "New patient intake"      },
  { key: "consult",  label: "Consult",   icon: "🎙️", desc: "Voice consultation"      },
  { key: "doctor",   label: "Doctor",    icon: "🩺",  desc: "Clinical record"         },
  { key: "pharmacy", label: "Pharmacy",  icon: "💊",  desc: "Dispense medications"    },
  { key: "lab",      label: "Lab",       icon: "🔬",  desc: "Submit test results"     },
  { key: "status",   label: "Status",    icon: "📡",  desc: "Live journey tracker"    },
];

/* ── Sidebar nav item ─────────────────────────────────────────────────── */
function NavItem({ tab, active, onClick, hasPatient }) {
  const locked = (tab.key === "consult" || tab.key === "doctor") && !hasPatient;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      data-testid={`nav-${tab.key}`}
      onClick={() => !locked && onClick(tab.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={locked ? "Register a patient first" : tab.desc}
      style={{
        width: "100%",
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 16px",
        borderRadius: 10,
        border: "none",
        background: active
          ? "rgba(20,184,166,0.12)"
          : hovered && !locked
          ? "rgba(255,255,255,0.04)"
          : "transparent",
        cursor: locked ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "background 0.15s ease",
        opacity: locked ? 0.4 : 1,
        position: "relative",
      }}
    >
      {/* Active indicator bar */}
      {active && (
        <div style={{
          position: "absolute", left: 0, top: "20%", bottom: "20%",
          width: 3, borderRadius: "0 3px 3px 0",
          background: "var(--teal)",
        }} />
      )}

      {/* Icon */}
      <span style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: active ? "rgba(20,184,166,0.18)" : "var(--card-elevated)",
        border: `1px solid ${active ? "rgba(20,184,166,0.3)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
        transition: "all 0.15s",
      }}>
        {tab.icon}
      </span>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: active ? 700 : 500,
          color: active ? "var(--teal)" : "var(--text-secondary)",
          transition: "color 0.15s",
        }}>
          {tab.label}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
          {tab.desc}
        </div>
      </div>
    </button>
  );
}

/* ── Sidebar ──────────────────────────────────────────────────────────── */
function Sidebar({ screen, setScreen, patientId }) {
  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: "var(--bg-secondary)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--teal), #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
            boxShadow: "0 4px 12px rgba(20,184,166,0.3)",
          }}>
            ⚕️
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>
              ClinixAI
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Clinical Voice System
            </div>
          </div>
        </div>
      </div>

      {/* Patient pill */}
      {patientId && (
        <div style={{
          margin: "12px 14px",
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(20,184,166,0.07)",
          border: "1px solid rgba(20,184,166,0.2)",
        }}>
          <div style={{ fontSize: 10, color: "var(--teal)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Active Patient
          </div>
          <div style={{
            fontSize: 11, fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            wordBreak: "break-all", lineHeight: 1.5,
          }}>
            {patientId}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {TABS.map(tab => (
          <NavItem
            key={tab.key}
            tab={tab}
            active={screen === tab.key}
            onClick={setScreen}
            hasPatient={!!patientId}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid var(--border)",
        fontSize: 11, color: "var(--text-muted)",
        lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>Hackathon Build</div>
        <div>AI Pipeline: Groq + Sarvam</div>
      </div>
    </aside>
  );
}

/* ── Breadcrumb header ────────────────────────────────────────────────── */
function TopBar({ screen }) {
  const tab = TABS.find(t => t.key === screen);
  return (
    <div style={{
      height: 56,
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      padding: "0 32px",
      gap: 12,
      background: "var(--bg-secondary)",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 16 }}>{tab?.icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{tab?.label}</span>
      <span style={{ color: "var(--border)", fontSize: 16 }}>·</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{tab?.desc}</span>

      {/* Right side: live indicator */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#10b981",
          display: "inline-block",
          boxShadow: "0 0 0 3px rgba(16,185,129,0.2)",
          animation: "pulse 2s ease-in-out infinite",
        }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>System online</span>
      </div>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────────────────────── */
export default function App() {
  const [screen,    setScreen]    = useState("register");
  const [patientId, setPatientId] = useState(null);

  const handleRegistered = (id) => {
    setPatientId(id);
    setScreen("consult");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar screen={screen} setScreen={setScreen} patientId={patientId} />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar screen={screen} />

        <main style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 40px",
          background: "var(--bg)",
        }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            {/* Animated screen transitions */}
            <div key={screen} style={{ animation: "fadeIn 0.2s ease" }}>
              {screen === "register" && (
                <RegisterPatient onRegistered={handleRegistered} />
              )}
              {screen === "consult" && (
                <VoiceConsultation
                  patientId={patientId}
                  onDone={() => setScreen("doctor")}
                />
              )}
              {screen === "doctor"   && <DoctorDashboard  patientId={patientId} />}
              {screen === "pharmacy" && <PharmacyPortal   patientId={patientId} />}
              {screen === "lab"      && <LabPortal        patientId={patientId} />}
              {screen === "status"   && <PatientStatus    patientId={patientId} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
