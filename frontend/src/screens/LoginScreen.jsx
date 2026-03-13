import { useState } from "react";
import { login } from "../api";

const ROLE_HINTS = [
  { role: "doctor",    username: "doctor",    label: "Doctor",     color: "#14b8a6", icon: "🩺" },
  { role: "pharmacy",  username: "pharmacy",  label: "Pharmacy",   color: "#8b5cf6", icon: "💊" },
  { role: "lab",       username: "lab",       label: "Laboratory", color: "#3b82f6", icon: "🔬" },
  { role: "reception", username: "reception", label: "Reception",  color: "#f59e0b", icon: "🏥" },
];

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(username.trim(), password.trim());
      onLogin(user);
    } catch (e) {
      setError(e.message || "Invalid credentials.");
    }
    setLoading(false);
  };

  const quickFill = (hint) => {
    setUsername(hint.username);
    setPassword(hint.username + "123");
    setError("");
  };

  const inputStyle = (field) => ({
    width: "100%", boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1.5px solid ${focusedField === field ? "var(--teal)" : "var(--border)"}`,
    background: "var(--input-bg)",
    color: "var(--text-primary)",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(20,184,166,0.15)" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "20px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, var(--teal), #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 14px",
            boxShadow: "0 8px 24px rgba(20,184,166,0.35)",
          }}>
            ⚕️
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>ClinixAI</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>
            Clinical Voice System
          </div>
        </div>

        {/* Login card */}
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          <div style={{ fontSize: 11, color: "var(--teal)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Staff Login
          </div>
          <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
            Sign in to your portal
          </h2>

          {/* Quick role buttons */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Quick Login
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {ROLE_HINTS.map(h => (
                <button
                  key={h.role}
                  data-testid={`quick-login-${h.role}`}
                  onClick={() => quickFill(h)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 9,
                    border: `1.5px solid ${username === h.username ? h.color + "55" : "var(--border)"}`,
                    background: username === h.username ? h.color + "18" : "var(--card-elevated)",
                    color: username === h.username ? h.color : "var(--text-secondary)",
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 7,
                    transition: "all 0.15s",
                  }}
                >
                  <span>{h.icon}</span> {h.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Username
              </label>
              <input
                data-testid="login-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocusedField("user")}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="e.g. doctor"
                style={inputStyle("user")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Password
              </label>
              <input
                data-testid="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField("pass")}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="••••••••"
                style={inputStyle("pass")}
              />
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
              data-testid="login-submit-btn"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                borderRadius: 10, border: "none",
                background: "var(--teal)", color: "#fff",
                fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
                transition: "opacity 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading
                ? <><span style={{ animation: "spin 0.8s linear infinite", display: "inline-block" }}>⟳</span> Signing in…</>
                : "Sign In →"}
            </button>
          </div>

          <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--card-elevated)", borderRadius: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text-secondary)" }}>Default credentials:</strong><br />
            doctor / doctor123 &nbsp;·&nbsp; pharmacy / pharmacy123<br />
            lab / lab123 &nbsp;·&nbsp; reception / reception123
          </div>
        </div>
      </div>
    </div>
  );
}
