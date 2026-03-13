import { useState, useEffect, useRef } from "react";
import { getPatientStatus } from "../api";

const DEPARTMENTS = [
  {
    key: "pharmacy",
    label: "Pharmacy",
    icon: "💊",
    description: "Medication dispensing",
    states: {
      pending:   { label: "Awaiting Dispense", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
      dispensed: { label: "Dispensed",         color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)"  },
    },
  },
  {
    key: "lab",
    label: "Laboratory",
    icon: "🔬",
    description: "Diagnostic investigations",
    states: {
      pending:       { label: "Tests Pending",    color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
      results_ready: { label: "Results Ready",    color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)"  },
      not_required:  { label: "Not Required",     color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)"  },
    },
  },
  {
    key: "diagnostics",
    label: "Diagnostics",
    icon: "🩻",
    description: "Imaging & scans",
    states: {
      pending:      { label: "Scan Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
      not_required: { label: "Not Required",   color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)"  },
      completed:    { label: "Completed",      color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)"  },
    },
  },
];

const COMPLETE_STATUSES = new Set(["dispensed", "results_ready", "completed", "not_required"]);

function getStateConfig(dept, value) {
  return dept.states[value] || {
    label: value || "Unknown",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.08)",
    border: "rgba(107,114,128,0.2)",
  };
}

function DepartmentCard({ dept, value, animateIn }) {
  const cfg = getStateConfig(dept, value);
  const isDone = COMPLETE_STATUSES.has(value);

  return (
    <div style={{
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}`,
      borderRadius: 16,
      padding: "24px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      position: "relative",
      overflow: "hidden",
      transition: "all 0.35s ease",
      animation: animateIn ? "slideUp 0.4s ease both" : "none",
    }}>
      {/* Glow orb background */}
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 100, height: 100, borderRadius: "50%",
        background: cfg.color,
        opacity: 0.06,
        pointerEvents: "none",
      }} />

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: `${cfg.color}18`,
          border: `1.5px solid ${cfg.color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>
          {dept.icon}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            {dept.label}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {dept.description}
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Animated dot */}
        <span style={{
          width: 9, height: 9, borderRadius: "50%",
          background: cfg.color,
          display: "inline-block",
          flexShrink: 0,
          boxShadow: isDone ? "none" : `0 0 0 3px ${cfg.color}33`,
          animation: !isDone && value === "pending" ? "pulse 1.8s ease-in-out infinite" : "none",
        }} />
        <span style={{
          fontSize: 14, fontWeight: 700,
          color: cfg.color,
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Done check */}
      {isDone && (
        <div style={{
          position: "absolute", top: 14, right: 16,
          width: 22, height: 22, borderRadius: "50%",
          background: cfg.color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "#fff", fontWeight: 700,
        }}>
          ✓
        </div>
      )}
    </div>
  );
}

function OverallProgress({ status }) {
  const depts = DEPARTMENTS.map(d => status?.[d.key]);
  const done  = depts.filter(v => COMPLETE_STATUSES.has(v)).length;
  const total = DEPARTMENTS.length;
  const pct   = Math.round((done / total) * 100);

  const allDone = done === total;

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      padding: "20px 24px",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Patient Journey
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {allDone ? "All departments complete" : `${done} of ${total} departments cleared`}
          </div>
        </div>
        <div style={{
          fontSize: 28, fontWeight: 800,
          color: allDone ? "#10b981" : "var(--teal)",
          fontFamily: "var(--font-mono)",
        }}>
          {pct}%
        </div>
      </div>

      {/* Progress track */}
      <div style={{ height: 8, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${pct}%`,
          background: allDone
            ? "#10b981"
            : "linear-gradient(90deg, var(--teal), #60efdf)",
          transition: "width 0.5s ease",
        }} />
      </div>

      {/* Step markers */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        {DEPARTMENTS.map((d, i) => {
          const val  = status?.[d.key];
          const done = COMPLETE_STATUSES.has(val);
          return (
            <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%",
                background: done ? "#10b981" : "var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: "#fff", fontWeight: 700,
                transition: "background 0.3s",
              }}>
                {done ? "✓" : i + 1}
              </span>
              <span style={{ fontSize: 11, color: done ? "#10b981" : "var(--text-muted)", fontWeight: done ? 600 : 400 }}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RefreshIndicator({ countdown, isRefreshing }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, color: "var(--text-muted)",
    }}>
      <span style={{
        display: "inline-block",
        animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
        fontSize: 13,
      }}>
        ⟳
      </span>
      {isRefreshing ? "Refreshing…" : `Auto-refresh in ${countdown}s`}
    </div>
  );
}

const REFRESH_INTERVAL = 5;

export default function PatientStatus({ patientId }) {
  const [status,       setStatus]       = useState(null);
  const [searchId,     setSearchId]     = useState(patientId || "");
  const [activeId,     setActiveId]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error,        setError]        = useState("");
  const [countdown,    setCountdown]    = useState(REFRESH_INTERVAL);
  const [animateIn,    setAnimateIn]    = useState(false);
  const [focused,      setFocused]      = useState(false);

  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  const fetchStatus = async (id, silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError("");
    try {
      const data = await getPatientStatus(id);
      setStatus(data);
      setAnimateIn(true);
      setTimeout(() => setAnimateIn(false), 600);
    } catch (e) {
      if (!silent) setError(e.message || "Could not fetch status.");
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  const startPolling = (id) => {
    stopPolling();
    setCountdown(REFRESH_INTERVAL);

    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) return REFRESH_INTERVAL;
        return c - 1;
      });
    }, 1000);

    intervalRef.current = setInterval(() => {
      fetchStatus(id, true);
      setCountdown(REFRESH_INTERVAL);
    }, REFRESH_INTERVAL * 1000);
  };

  const stopPolling = () => {
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
  };

  const handleCheck = async () => {
    const id = searchId.trim();
    if (!id) return;
    setActiveId(id);
    await fetchStatus(id, false);
    startPolling(id);
  };

  useEffect(() => {
    if (patientId) {
      setSearchId(patientId);
      setActiveId(patientId);
      fetchStatus(patientId, false);
      startPolling(patientId);
    }
    return () => stopPolling();
  }, [patientId]);

  return (
    <div style={{ padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal)", fontWeight: 600, marginBottom: 6 }}>
          Live Tracker
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
              Patient Journey
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Real-time status across all hospital departments.
            </p>
          </div>
          {activeId && status && (
            <RefreshIndicator countdown={countdown} isRefreshing={isRefreshing} />
          )}
        </div>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      {/* Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            fontSize: 15, color: "var(--text-muted)", pointerEvents: "none",
          }}>📡</span>
          <input
            placeholder="Enter patient ID to track…"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCheck()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "12px 14px 12px 40px",
              borderRadius: 10,
              border: `1.5px solid ${focused ? "var(--teal)" : "var(--border)"}`,
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              fontSize: 14, fontFamily: "var(--font-mono)",
              outline: "none",
              boxShadow: focused ? "0 0 0 3px rgba(20,184,166,0.15)" : "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />
        </div>
        <button
          onClick={handleCheck}
          disabled={loading}
          style={{
            padding: "12px 22px", borderRadius: 10,
            border: "none", background: "var(--teal)",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, flexShrink: 0,
          }}
        >
          {loading ? "Fetching…" : "Track Patient"}
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

      {/* Status display */}
      {status && (
        <>
          <OverallProgress status={status} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {DEPARTMENTS.map((dept, i) => (
              <DepartmentCard
                key={dept.key}
                dept={dept}
                value={status[dept.key]}
                animateIn={animateIn}
              />
            ))}
          </div>

          {/* Active patient ID badge */}
          <div style={{
            marginTop: 20,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 16px", borderRadius: 10,
            background: "var(--card-elevated)", border: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tracking:</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 13,
              color: "var(--teal)", fontWeight: 600,
            }}>
              {activeId}
            </span>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !status && !error && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "60px 20px", color: "var(--text-muted)", gap: 14,
        }}>
          <span style={{ fontSize: 56, opacity: 0.3 }}>📡</span>
          <p style={{ fontSize: 14, margin: 0, fontWeight: 500 }}>Enter a patient ID to begin tracking</p>
          <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)", opacity: 0.7 }}>
            Status auto-refreshes every {REFRESH_INTERVAL} seconds
          </p>
        </div>
      )}
    </div>
  );
}