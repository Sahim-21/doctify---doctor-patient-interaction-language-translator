import { useState, useRef, useEffect } from "react";
import { transcribeAudio, analyzeConsultation, saveRecord, getPatient } from "../api";

/**
 * Convert any browser-recorded audio blob (webm/ogg) to a proper 16kHz mono WAV.
 * Sarvam STT requires real PCM WAV — not a webm blob labelled as wav.
 */
async function blobToWav(inputBlob) {
  const arrayBuffer = await inputBlob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (e) {
    await audioCtx.close();
    throw new Error("Could not decode audio. Please try again.");
  }
  await audioCtx.close();

  // Downsample to 16 kHz mono (optimal for STT APIs)
  const TARGET_RATE = 16000;
  const srcRate = audioBuffer.sampleRate;
  const srcData = audioBuffer.getChannelData(0); // mono: use first channel
  const ratio   = srcRate / TARGET_RATE;
  const numOut  = Math.round(srcData.length / ratio);
  const samples = new Float32Array(numOut);
  for (let i = 0; i < numOut; i++) {
    const srcIdx = Math.min(Math.round(i * ratio), srcData.length - 1);
    samples[i] = srcData[srcIdx];
  }

  const bytesPerSample = 2;
  const dataLength = numOut * bytesPerSample;
  const wav = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wav);
  const w4 = (o, s) => { for (let i = 0; i < 4; i++) view.setUint8(o + i, s.charCodeAt(i)); };

  w4(0, "RIFF"); view.setUint32(4, 36 + dataLength, true);
  w4(8, "WAVE"); w4(12, "fmt ");
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);          // 16-bit
  w4(36, "data"); view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < numOut; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([wav], { type: "audio/wav" });
}

const STEPS = [
  { key: "idle",         label: "Ready",       icon: "🎙️" },
  { key: "recording",   label: "Recording",   icon: "⏺" },
  { key: "transcribing",label: "Transcribing", icon: "⌛" },
  { key: "reviewing",   label: "Review",       icon: "📝" },
  { key: "analyzing",   label: "Analyzing",    icon: "🧠" },
  { key: "done",        label: "Saved",        icon: "✅" },
];

const STEP_ORDER = STEPS.map(s => s.key);

function StepIndicator({ current }) {
  const activeIdx = STEP_ORDER.indexOf(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {STEPS.map((s, i) => {
        const done    = i < activeIdx;
        const active  = i === activeIdx;
        const pending = i > activeIdx;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            {/* Circle */}
            <div style={{
              width: 32, height: 32,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: done ? 14 : 13,
              fontWeight: 700,
              flexShrink: 0,
              transition: "all 0.3s ease",
              background: done    ? "var(--teal)"
                        : active  ? "var(--teal)"
                        :           "var(--card-elevated)",
              border: active  ? "2px solid var(--teal)"
                    : done    ? "2px solid var(--teal)"
                    :           "2px solid var(--border)",
              color:  (done || active) ? "#fff" : "var(--text-muted)",
              boxShadow: active ? "0 0 0 4px rgba(20,184,166,0.2)" : "none",
            }}>
              {done ? "✓" : i + 1}
            </div>
            {/* Label below — only show for active */}
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: done ? "var(--teal)" : "var(--border)",
                transition: "background 0.4s ease",
                margin: "0 4px",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PulsingDot() {
  return (
    <span style={{
      display: "inline-block",
      width: 10, height: 10,
      borderRadius: "50%",
      background: "#ef4444",
      marginRight: 8,
      animation: "pulse 1.2s ease-in-out infinite",
    }} />
  );
}

function RecordButton({ recording, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 96, height: 96,
        borderRadius: "50%",
        border: recording ? "3px solid #ef4444" : "3px solid var(--teal)",
        background: recording
          ? "rgba(239,68,68,0.12)"
          : "rgba(20,184,166,0.1)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36,
        transition: "all 0.2s ease",
        boxShadow: recording
          ? "0 0 0 8px rgba(239,68,68,0.1), 0 0 0 16px rgba(239,68,68,0.05)"
          : "0 0 0 8px rgba(20,184,166,0.07)",
        opacity: disabled ? 0.4 : 1,
        outline: "none",
      }}
    >
      {recording ? "⏹" : "🎙️"}
    </button>
  );
}

export default function VoiceConsultation({ patientId, onDone }) {
  const [step, setStep]             = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [record, setRecord]         = useState(null);
  const [error, setError]           = useState("");
  const [elapsed, setElapsed]       = useState(0);
  const [patientLang, setPatientLang] = useState("hi");   // fetched from DB

  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);

  // Fetch patient language on mount so transcription uses the right locale
  useEffect(() => {
    if (!patientId) return;
    getPatient(patientId)
      .then(p => p?.language && setPatientLang(p.language))
      .catch(() => {});
  }, [patientId]);

  /* ── Recording ── */
  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use webm if available (Chrome default) — blobToWav handles conversion
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";
      mediaRef.current  = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRef.current.ondataavailable = e => chunksRef.current.push(e.data);
      mediaRef.current.onstop = handleAudioReady;
      mediaRef.current.start();
      setStep("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      setError("Microphone permission denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    mediaRef.current?.stream?.getTracks().forEach(t => t.stop());
    setStep("transcribing");
  };

  const handleAudioReady = async () => {
    const rawBlob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    setStep("transcribing");
    try {
      // Convert to real 16kHz WAV — fixes Sarvam STT rejecting webm/ogg blobs
      let wavBlob;
      try {
        wavBlob = await blobToWav(rawBlob);
      } catch (convErr) {
        console.warn("WAV conversion failed, sending raw audio:", convErr);
        wavBlob = rawBlob;
      }
      const result = await transcribeAudio(wavBlob, patientId, patientLang);
      setTranscript(result.transcript || "");
      setStep("reviewing");
    } catch (e) {
      setError(e.message || "Transcription failed. Check if backend is running.");
      setStep("idle");
    }
  };

  /* ── Analysis ── */
  const analyzeAndSave = async () => {
    setStep("analyzing");
    setError("");
    try {
      const medicalRecord = await analyzeConsultation(transcript, patientId, patientLang);
      await saveRecord(patientId, { ...medicalRecord, transcript });
      setRecord(medicalRecord);
      setStep("done");
    } catch (e) {
      setError(e.message || "Analysis failed. Check if backend and AI pipeline are running.");
      setStep("reviewing");
    }
  };

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={{ padding: "32px 0" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal)", fontWeight: 600, marginBottom: 6 }}>
          Voice Consultation
        </div>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
          AI Clinical Intake
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Record the doctor–patient conversation. AI will transcribe and extract the clinical record.
        </p>
      </div>

      <div style={{ height: 1, background: "var(--border)", margin: "24px 0" }} />

      {!patientId ? (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 10, padding: "16px 20px", color: "#f87171", fontSize: 14,
        }}>
          ⚠ No active patient. Please go to the <strong>Register</strong> tab first.
        </div>
      ) : (
        <>
          <StepIndicator current={step} />

          {/* ── IDLE / RECORDING ── */}
          {(step === "idle" || step === "recording") && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "24px 0" }}>
              <RecordButton
                recording={step === "recording"}
                disabled={false}
                onClick={step === "recording" ? stopRecording : startRecording}
              />
              {step === "recording" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, display: "flex", alignItems: "center" }}>
                    <PulsingDot /> Recording in progress
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, color: "var(--text-primary)", letterSpacing: 2 }}>
                    {formatTime(elapsed)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Tap the button to stop</div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Ready to record</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Tap the microphone to start</div>
                </div>
              )}
            </div>
          )}

          {/* ── TRANSCRIBING ── */}
          {step === "transcribing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
              <div style={{ fontSize: 40, animation: "spin 1.2s linear infinite" }}>⟳</div>
              <div style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>Transcribing audio…</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sending to speech-to-text engine</div>
            </div>
          )}

          {/* ── REVIEWING ── */}
          {step === "reviewing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 12, padding: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Transcript
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Editable — correct any errors before analyzing</span>
                </div>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  rows={7}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1.5px solid var(--border)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    fontSize: 14, lineHeight: 1.7,
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--teal)")}
                  onBlur={e  => (e.target.style.borderColor = "var(--border)")}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setStep("idle"); setTranscript(""); }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 10,
                    border: "1.5px solid var(--border)",
                    background: "transparent", color: "var(--text-secondary)",
                    cursor: "pointer", fontSize: 14, fontWeight: 500,
                  }}
                >
                  ↺ Re-record
                </button>
                <button
                  onClick={analyzeAndSave}
                  disabled={!transcript.trim()}
                  style={{
                    flex: 2, padding: "12px", borderRadius: 10,
                    border: "none",
                    background: "var(--teal)",
                    color: "#fff", cursor: "pointer",
                    fontSize: 14, fontWeight: 600,
                    opacity: !transcript.trim() ? 0.5 : 1,
                  }}
                >
                  🧠 Analyze &amp; Generate Record
                </button>
              </div>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {step === "analyzing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
              <div style={{ fontSize: 40, animation: "spin 1.2s linear infinite" }}>⟳</div>
              <div style={{ fontSize: 15, color: "var(--text-secondary)", fontWeight: 500 }}>AI is analyzing the consultation…</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Extracting diagnosis, prescription &amp; lab orders</div>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && record && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                background: "rgba(20,184,166,0.07)",
                border: "1px solid rgba(20,184,166,0.3)",
                borderRadius: 12, padding: "20px 24px",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--teal)", marginBottom: 14 }}>
                  ✅ Record saved successfully
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <InfoRow label="Diagnosis"  value={record.diagnosis    || "—"} />
                  <InfoRow label="ICD-10"     value={record.icd10_code   || "—"} mono />
                  <InfoRow label="Symptoms"   value={record.symptoms?.join(", ") || "—"} />
                  <InfoRow label="Follow-up"  value={record.follow_up    || "—"} />
                </div>
              </div>

              {record.prescription?.length > 0 && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 12 }}>
                    Prescription
                  </div>
                  {record.prescription.map((p, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 0",
                      borderBottom: i < record.prescription.length - 1 ? "1px solid var(--border)" : "none",
                    }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.drug}</span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.dose} · {p.freq} · {p.days}d</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onDone}
                style={{
                  width: "100%", padding: "14px", borderRadius: 10,
                  border: "none", background: "var(--teal)", color: "#fff",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                View Full Record in Dashboard →
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 16,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#f87171",
            }}>
              ⚠ {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ minWidth: 90, fontSize: 12, color: "var(--text-muted)", paddingTop: 2 }}>{label}</span>
      <span style={{
        fontSize: 14, color: "var(--text-primary)", fontWeight: 500,
        fontFamily: mono ? "var(--font-mono)" : "inherit",
      }}>
        {value}
      </span>
    </div>
  );
}