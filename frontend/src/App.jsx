import { useState } from "react";
import RegisterPatient from "./screens/RegisterPatient";
import VoiceConsultation from "./screens/VoiceConsultation";
import DoctorDashboard from "./screens/DoctorDashboard";
import PharmacyPortal from "./screens/PharmacyPortal";
import LabPortal from "./screens/LabPortal";
import PatientStatus from "./screens/PatientStatus";
import LoginScreen from "./screens/LoginScreen";
import PatientSelfRegister from "./screens/PatientSelfRegister";

/* ── Global styles ───────────────────────────────────────────────────── */
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
  html, body, #root { height: 100%; background: var(--bg); color: var(--text-primary); font-family: 'DM Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  input, textarea, select, button { font-family: 'DM Sans', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
  @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
  @keyframes pulse-bg { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
`;
function injectGlobalStyles() {
  if (document.getElementById("cvs-global")) return;
  const tag = document.createElement("style");
  tag.id = "cvs-global";
  tag.textContent = GLOBAL_CSS;
  document.head.appendChild(tag);
}
injectGlobalStyles();

/* ── Role → allowed tabs + default screen ───────────────────────────── */
const ALL_TABS = [
  { key: "register", label: "Register",  icon: "＋",  desc: "New patient intake"    },
  { key: "consult",  label: "Consult",   icon: "🎙️", desc: "Voice consultation"    },
  { key: "doctor",   label: "Dashboard", icon: "🩺",  desc: "Clinical records"      },
  { key: "pharmacy", label: "Pharmacy",  icon: "💊",  desc: "Dispense medications"  },
  { key: "lab",      label: "Lab",       icon: "🔬",  desc: "Submit test results"   },
  { key: "status",   label: "Status",    icon: "📡",  desc: "Live journey tracker"  },
];
const ROLE_TABS = {
  doctor:    ["register", "consult", "doctor", "status"],
  pharmacy:  ["pharmacy", "status"],
  lab:       ["lab", "status"],
  reception: ["register", "status"],
};
const ROLE_DEFAULT = {
  doctor:    "doctor",
  pharmacy:  "pharmacy",
  lab:       "lab",
  reception: "register",
};
const ROLE_COLORS = {
  doctor:    "#14b8a6",
  pharmacy:  "#8b5cf6",
  lab:       "#3b82f6",
  reception: "#f59e0b",
};

/* ── Urgency badge ───────────────────────────────────────────────────── */
export function UrgencyBadge({ level, size = "sm" }) {
  const MAP = {
    critical: { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  color: "#ef4444", label: "CRITICAL" },
    urgent:   { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", color: "#f59e0b", label: "URGENT"   },
    normal:   { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)", color: "#10b981", label: "NORMAL"   },
  };
  const cfg = MAP[level] || MAP.normal;
  const fs = size === "sm" ? 10 : 12;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "sm" ? "2px 7px" : "4px 10px",
      borderRadius: 99,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: fs, fontWeight: 700, letterSpacing: "0.05em",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block", flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

/* ── Nav item ────────────────────────────────────────────────────────── */
function NavItem({ tab, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      data-testid={`nav-${tab.key}`}
      onClick={() => onClick(tab.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tab.desc}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "11px 16px", borderRadius: 10, border: "none",
        background: active ? "rgba(20,184,166,0.12)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        cursor: "pointer", textAlign: "left",
        transition: "background 0.15s ease", position: "relative",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", left: 0, top: "20%", bottom: "20%",
          width: 3, borderRadius: "0 3px 3px 0", background: "var(--teal)",
        }} />
      )}
      <span style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: active ? "rgba(20,184,166,0.18)" : "var(--card-elevated)",
        border: `1px solid ${active ? "rgba(20,184,166,0.3)" : "var(--border)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
        transition: "all 0.15s",
      }}>
        {tab.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--teal)" : "var(--text-secondary)", transition: "color 0.15s" }}>
          {tab.label}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{tab.desc}</div>
      </div>
    </button>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────── */
function Sidebar({ screen, setScreen, patientId, currentUser, onLogout, visibleTabs }) {
  const roleColor = ROLE_COLORS[currentUser?.role] || "var(--teal)";
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: "var(--bg-secondary)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", height: "100vh",
      position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, fontSize: 18, flexShrink: 0,
            background: "linear-gradient(135deg, var(--teal), #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(20,184,166,0.3)",
          }}>⚕️</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>ClinixAI</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Clinical Voice
            </div>
          </div>
        </div>
      </div>

      {/* Logged-in user badge */}
      {currentUser && (
        <div style={{ margin: "12px 14px", padding: "10px 12px", borderRadius: 10, background: `${roleColor}10`, border: `1px solid ${roleColor}30` }}>
          <div style={{ fontSize: 10, color: roleColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
            {currentUser.role}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{currentUser.display_name}</div>
        </div>
      )}

      {/* Active patient pill */}
      {patientId && (
        <div style={{ margin: "0 14px 8px", padding: "8px 12px", borderRadius: 10, background: "rgba(20,184,166,0.07)", border: "1px solid rgba(20,184,166,0.2)" }}>
          <div style={{ fontSize: 10, color: "var(--teal)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Active Patient</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", wordBreak: "break-all", lineHeight: 1.5 }}>
            {patientId.slice(0, 8)}…
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {visibleTabs.map(tab => (
          <NavItem key={tab.key} tab={tab} active={screen === tab.key} onClick={setScreen} />
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: "14px", borderTop: "1px solid var(--border)" }}>
        <button
          data-testid="logout-btn"
          onClick={onLogout}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 9,
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          ↪ Sign Out
        </button>
        <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>
          Groq + Sarvam AI
        </div>
      </div>
    </aside>
  );
}

/* ── Top bar ─────────────────────────────────────────────────────────── */
function TopBar({ screen, visibleTabs }) {
  const tab = visibleTabs.find(t => t.key === screen) || ALL_TABS.find(t => t.key === screen);
  return (
    <div style={{
      height: 56, borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", padding: "0 32px", gap: 12,
      background: "var(--bg-secondary)", flexShrink: 0,
    }}>
      <span style={{ fontSize: 16 }}>{tab?.icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{tab?.label}</span>
      <span style={{ color: "var(--border)", fontSize: 16 }}>·</span>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{tab?.desc}</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 0 3px rgba(16,185,129,0.2)", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>System online</span>
      </div>
    </div>
  );
}

/* ── Main App ─────────────────────────────────────────────────────────── */
export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("doctify_user")); }
    catch { return null; }
  });
  const [screen, setScreen]       = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [showPatientPortal, setShowPatientPortal] = useState(false);

  const handleLogin = (user) => {
    localStorage.setItem("doctify_user", JSON.stringify(user));
    setCurrentUser(user);
    setScreen(ROLE_DEFAULT[user.role] || "register");
  };

  const handleLogout = () => {
    localStorage.removeItem("doctify_user");
    setCurrentUser(null);
    setScreen(null);
    setPatientId(null);
  };

  if (showPatientPortal) return <PatientSelfRegister onBack={() => setShowPatientPortal(false)} />;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onPatientRegister={() => setShowPatientPortal(true)} />;

  const allowedKeys = ROLE_TABS[currentUser.role] || Object.keys(ROLE_TABS.doctor);
  const visibleTabs = ALL_TABS.filter(t => allowedKeys.includes(t.key));
  const activeScreen = screen || ROLE_DEFAULT[currentUser.role];

  const handleRegistered = (id) => {
    setPatientId(id);
    if (currentUser.role === "doctor") setScreen("consult");
    else setScreen("status");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        screen={activeScreen}
        setScreen={setScreen}
        patientId={patientId}
        currentUser={currentUser}
        onLogout={handleLogout}
        visibleTabs={visibleTabs}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar screen={activeScreen} visibleTabs={visibleTabs} />
        <main style={{ flex: 1, overflowY: "auto", padding: "0 40px", background: "var(--bg)" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div key={activeScreen} style={{ animation: "fadeIn 0.2s ease" }}>
              {activeScreen === "register" && (
                <RegisterPatient onRegistered={handleRegistered} />
              )}
              {activeScreen === "consult" && (
                <VoiceConsultation
                  patientId={patientId}
                  onDone={() => setScreen("doctor")}
                />
              )}
              {activeScreen === "doctor" && (
                <DoctorDashboard patientId={patientId} setPatientId={setPatientId} />
              )}
              {activeScreen === "pharmacy" && <PharmacyPortal patientId={patientId} />}
              {activeScreen === "lab"      && <LabPortal      patientId={patientId} />}
              {activeScreen === "status"   && <PatientStatus  patientId={patientId} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
