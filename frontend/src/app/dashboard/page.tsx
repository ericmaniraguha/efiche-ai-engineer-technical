"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MOCK_CONSULTATIONS as MOCK_RAW } from "../mockData";
import { Consultation, EditData } from "../types";

const MOCK_CONSULTATIONS = MOCK_RAW as Consultation[];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function ReportsDashboard() {
  const [realConsultations, setRealConsultations] = useState<Consultation[]>([]);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
  // editOverrides holds fields the user has manually edited in the modal
  const [editOverrides, setEditOverrides] = useState<Partial<EditData>>({});

  const selectedConsultation = realConsultations.find(c => c.id === showDetailsId)
    || MOCK_CONSULTATIONS.find(c => c.id === showDetailsId);

  // ✅ Derive editData from selectedConsultation using useMemo — no useEffect needed
  const editData: EditData | null = useMemo(() => {
    if (!selectedConsultation) return null;
    const clinical = selectedConsultation.clinical_data;
    return {
      diagnosis: editOverrides.diagnosis ?? clinical?.diagnosis ?? selectedConsultation.diagnosis ?? "",
      medications: editOverrides.medications ?? (
        Array.isArray(clinical?.medications)
          ? clinical.medications.join(", ")
          : (clinical?.medications ?? selectedConsultation.meds ?? []).toString()
      ),
      chief_complaint: editOverrides.chief_complaint ?? clinical?.chief_complaint ?? "",
      follow_up: editOverrides.follow_up ?? clinical?.follow_up ?? "",
    };
  }, [selectedConsultation, editOverrides]);

  // Clear overrides when the selected consultation changes
  useEffect(() => {
    setEditOverrides({});
  }, [showDetailsId]);

  // ✅ Data fetching with inline async IIFE — no setState called at effect level
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/consultations/`);
        if (!res.ok) throw new Error("Fetch failed");
        const data: Consultation[] = await res.json();
        if (active) setRealConsultations(data);
      } catch (err) {
        console.error("Failed to fetch consultations:", err);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleUpdateConsultation = async (id: string) => {
    if (!editData) return;
    try {
      setRealConsultations(prev => prev.map(c => c.id === id ? {
        ...c,
        status: "completed",
        clinical_data: {
          ...c.clinical_data,
          diagnosis: editData.diagnosis,
          medications: editData.medications.split(",").map((m: string) => m.trim()),
          chief_complaint: editData.chief_complaint,
          follow_up: editData.follow_up,
        },
      } : c));
      alert("Consultation verified and approved!");
    } catch {
      alert("Failed to update consultation.");
    }
  };

  const renderBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "completed" || s === "complete") return <span style={{ padding: "0.25rem 0.75rem", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: "800", background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" }}>COMPLETED</span>;
    if (s === "needs_review" || s === "flagged") return <span style={{ padding: "0.25rem 0.75rem", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: "800", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>NEEDS REVIEW</span>;
    return <span style={{ padding: "0.25rem 0.75rem", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: "800", background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }}>{status?.toUpperCase()}</span>;
  };

  return (
    <main className="container animate-fade-in" style={{ padding: "2rem 1.25rem" }}>
      <nav className="white-card nav-container" style={{
        padding: "0.75rem 1.5rem",
        marginBottom: "3rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: "1rem",
        zIndex: 100,
        gap: "1rem",
      }}>
        <h1 className="gradient-text" style={{ fontSize: "1.6rem", fontWeight: "900", letterSpacing: "-0.03em", margin: 0 }}>eFiche AI</h1>
        <Link href="/" style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--primary)", textDecoration: "none" }}>← Upload Center</Link>
      </nav>

      <header style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "2.5rem", fontWeight: "900", color: "#000", letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Review Dashboard</h2>
        <p style={{ color: "var(--text-muted)", fontWeight: "500", fontSize: "1.1rem" }}>Monitoring real-time clinical extractions</p>
      </header>

      <div className="grid-responsive" style={{ marginBottom: "6rem" }}>
        {realConsultations.map((item) => {
          const aiFlags = item.clinical_data?.ai_verification || {};
          const hasDangerous = (aiFlags.dangerous_flags?.length ?? 0) > 0;

          return (
            <div key={item.id} className="white-card animate-fade-in" style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              borderLeft: hasDangerous || item.status === "needs_review" ? "4px solid #ef4444" : "4px solid #0284c7",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ overflow: "hidden" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>{item.id.substring(0, 8)}...</span>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a" }}>Consultation Report</h4>
                </div>
                {renderBadge(item.status)}
              </div>

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b", marginBottom: "0.25rem", textTransform: "uppercase" }}>Diagnosis</p>
                <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "1rem" }}>
                  {item.clinical_data?.diagnosis || <span style={{ color: "#ef4444" }}>[Missing]</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.5rem" }}>
                <div>
                  <p style={{ fontSize: "0.7rem", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>WER</p>
                  <p style={{ fontWeight: "900", color: "#334155" }}>{item.wer_score ? `${(item.wer_score * 100).toFixed(1)}%` : "0.0%"}</p>
                </div>
                <div>
                  <p style={{ fontSize: "0.7rem", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>Quality</p>
                  <p style={{ fontWeight: "900", color: "#334155" }}>{item.clinical_score ? `${(item.clinical_score * 100).toFixed(0)}%` : "N/A"}</p>
                </div>
              </div>

              <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  onClick={() => { setShowDetailsId(item.id); setEditOverrides({}); }}
                  className="btn-primary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "none", color: "var(--primary)", border: "1px solid var(--primary)" }}
                >
                  Review →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showDetailsId && selectedConsultation && editData && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "clamp(0rem, 2vw, 2rem)",
        }}>
          <div className="white-card animate-fade-in" style={{
            width: "100%", maxWidth: "1100px", height: "100%", maxHeight: "90vh",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>

            <header style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#0f172a" }}>Verification Interface</h3>
                <p style={{ color: "var(--primary)", fontWeight: "700", fontSize: "0.8rem" }}>{showDetailsId}</p>
              </div>
              <button onClick={() => setShowDetailsId(null)} style={{ fontSize: "1.5rem", color: "#64748b", padding: "0.5rem" }}>✕</button>
            </header>

            <div className="modal-body" style={{ display: "flex", flex: 1, overflowY: "auto", background: "#fff" }}>
              <style>{`
                @media (max-width: 850px) {
                  .modal-body { flex-direction: column !important; }
                  .pane { border-right: none !important; border-bottom: 1px solid #e2e8f0; width: 100% !important; }
                }
              `}</style>

              {/* Transcript Pane */}
              <div className="pane" style={{ flex: 1, borderRight: "1px solid #e2e8f0", padding: "1.5rem", background: "#fcfcfc" }}>
                <h5 style={{ fontSize: "0.8rem", fontWeight: "800", color: "#64748b", marginBottom: "1rem", textTransform: "uppercase" }}>🎙️ Clinical Audio Transcript</h5>
                <div style={{ background: "#fff", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #e2e8f0", lineHeight: "1.6", color: "#334155", fontStyle: "italic" }}>
                  &quot;{("raw_transcript" in selectedConsultation && selectedConsultation.raw_transcript) || "Transcript not available."}&quot;
                </div>

                {("clinical_data" in selectedConsultation && (selectedConsultation.clinical_data?.ai_verification?.dangerous_flags?.length ?? 0) > 0) && (
                  <div style={{ marginTop: "1.5rem", background: "#fef2f2", padding: "1.25rem", borderRadius: "0.75rem", border: "1px solid #fecaca" }}>
                    <h5 style={{ fontSize: "0.8rem", fontWeight: "900", color: "#b91c1c", marginBottom: "0.5rem" }}>⚠️ AI SAFETY ALERTS</h5>
                    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#991b1b" }}>
                      {selectedConsultation.clinical_data?.ai_verification?.dangerous_flags?.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Extraction Pane */}
              <div className="pane" style={{ flex: 1, padding: "1.5rem" }}>
                <h5 style={{ fontSize: "0.8rem", fontWeight: "800", color: "#0284c7", marginBottom: "1.5rem", textTransform: "uppercase" }}>📋 Extracted Clinical Data</h5>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>CHIEF COMPLAINT</label>
                    <input
                      className="white-card"
                      style={{ width: "100%", padding: "0.75rem", fontWeight: "600", fontSize: "1rem", border: "1px solid #e2e8f0" }}
                      value={editData.chief_complaint}
                      onChange={(e) => setEditOverrides(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>DIAGNOSIS</label>
                    <input
                      className="white-card"
                      style={{ width: "100%", padding: "0.75rem", fontWeight: "600", fontSize: "1rem", border: "1px solid #e2e8f0" }}
                      value={editData.diagnosis}
                      onChange={(e) => setEditOverrides(prev => ({ ...prev, diagnosis: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: "800", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>MEDICATIONS</label>
                    <textarea
                      className="white-card"
                      style={{ width: "100%", padding: "0.75rem", fontWeight: "600", fontSize: "1rem", border: "1px solid #e2e8f0", minHeight: "80px", fontFamily: "inherit" }}
                      value={editData.medications}
                      onChange={(e) => setEditOverrides(prev => ({ ...prev, medications: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <footer style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button onClick={() => setShowDetailsId(null)} style={{ fontWeight: "700", color: "#64748b", padding: "0.75rem 1.5rem" }}>Cancel</button>
              <button
                onClick={() => handleUpdateConsultation(selectedConsultation.id)}
                className="btn-primary"
                style={{ background: "#10b981", padding: "0.75rem 2rem" }}
              >
                Approve &amp; Save
              </button>
            </footer>

          </div>
        </div>
      )}
    </main>
  );
}
