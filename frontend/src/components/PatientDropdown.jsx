import { useState, useEffect, useRef } from "react";
import { listPatients } from "../api";
import { UrgencyBadge } from "../App";

const LANGS = { hi: "Hindi", ta: "Tamil", kn: "Kannada", te: "Telugu", ml: "Malayalam", en: "English" };

const PRESC_DOT = {
  pending:  "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

/**
 * Shared patient selector dropdown used across all screens.
 * Props:
 *   patientId      – currently selected patient ID (string|null)
 *   setPatientId   – callback to change selected patient in parent
 *   label          – optional label above the dropdown
 *   refresh        – bump this number to force a re-fetch of the patient list
 */
export default function PatientDropdown({ patientId, setPatientId, label = "Select Patient", refresh = 0 }) {
  const [patients, setPatients] = useState([]);
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState("");
  const dropRef = useRef(null);

  useEffect(() => {
    listPatients().then(setPatients).catch(() => {});
  }, [refresh]);

  // Close on outside click
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = patients.find(p => p.patient_id === patientId);
  const filtered = search.trim()
    ? patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_id.toLowerCase().startsWith(search.toLowerCase())
      )
    : patients;

  const select = (id) => {
    setPatientId(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={dropRef} style={{ position: "relative", marginBottom: 28 }}>
      {label && (
        <div style={{
          fontSize: 11, color: "var(--text-muted)", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8,
        }}>
          {label}
        </div>
      )}

      {/* Trigger button */}
      <button
        data-testid="patient-dropdown-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 10,
          border: `1.5px solid ${open ? "var(--teal)" : "var(--border)"}`,
          background: "var(--input-bg)", color: "var(--text-primary)",
          fontSize: 14, cursor: "pointer", textAlign: "left",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: open ? "0 0 0 3px rgba(20,184,166,0.15)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          fontFamily: "inherit",
        }}
      >
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UrgencyBadge level={selected.urgency_level} />
            <span style={{ fontWeight: 600 }}>{selected.name}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              · Age {selected.age} · {LANGS[selected.language] || selected.language}
            </span>
            {selected.prescription_status && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRESC_DOT[selected.prescription_status] || "#6b7280", flexShrink: 0 }} title={`Prescription: ${selected.prescription_status}`} />
            )}
          </div>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>— Choose a patient —</span>
        )}
        <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          maxHeight: 340, display: "flex", flexDirection: "column",
        }}>
          {/* Search inside dropdown */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "8px 12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--input-bg)",
                color: "var(--text-primary)", fontSize: 13, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                {patients.length === 0 ? "No patients registered yet." : "No match found."}
              </div>
            ) : (
              filtered.map(p => (
                <button
                  key={p.patient_id}
                  data-testid={`patient-opt-${p.patient_id.slice(0, 8)}`}
                  onClick={() => select(p.patient_id)}
                  style={{
                    width: "100%", padding: "11px 14px", border: "none",
                    background: patientId === p.patient_id ? "rgba(20,184,166,0.08)" : "transparent",
                    color: "var(--text-primary)", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    borderBottom: "1px solid var(--border-subtle)",
                    transition: "background 0.1s", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { if (patientId !== p.patient_id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (patientId !== p.patient_id) e.currentTarget.style.background = "transparent"; }}
                >
                  <UrgencyBadge level={p.urgency_level} size="sm" />
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      Age {p.age} · {LANGS[p.language] || p.language}
                      {p.diagnosis && <span> · {p.diagnosis}</span>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 700, flexShrink: 0,
                    color: PRESC_DOT[p.prescription_status] || "#6b7280",
                    background: (PRESC_DOT[p.prescription_status] || "#6b7280") + "18",
                    border: `1px solid ${(PRESC_DOT[p.prescription_status] || "#6b7280")}33`,
                  }}>
                    {(p.prescription_status || "pending").toUpperCase()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
