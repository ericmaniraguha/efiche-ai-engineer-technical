"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MOCK_CONSULTATIONS } from "./mockData";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface AIVerification {
  dangerous_flags?: string[];
  unsupported_claims?: string[];
}

interface ClinicalData {
  diagnosis?: string;
  medications?: string[];
  chief_complaint?: string;
  follow_up?: string;
  ai_verification?: AIVerification;
}

interface Consultation {
  id: string;
  status: string;
  diagnosis?: string;
  meds?: string[];
  created_at: string;
  date?: string;
  patient_init?: string;
  raw_transcript?: string;
  clinical_data?: ClinicalData;
  wer_score?: number;
  clinical_score?: number;
}

export default function Home() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<ClinicalData | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("rw");
  const [isUploading, setIsUploading] = useState(false);
  const [realConsultations, setRealConsultations] = useState<Consultation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Fetch real consultations from backend
  const fetchConsultations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/consultations/`);
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      setRealConsultations(data);
    } catch {
      console.error("Failed to fetch consultations");
    }
  }, []);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      setLiveTranscript("");

      // Initialize Web Speech API for live visual transcription
      const win = window as any;
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setLiveTranscript(currentTranscript);
        };
        
        recognitionRef.current.start();
      }

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
        if (activeId) {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            try {
              const response = await fetch(`${API_URL}/api/v1/consultations/${activeId}/upload?language=${selectedLanguage}`, {
                method: "POST",
                body: formData,
              });
              await response.json();
              setActiveStatus('processing');
              fetchConsultations();
            } catch {
              alert("Upload failed.");
            } finally {
              setIsUploading(false);
            }
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch {
      alert("Microphone access denied or error occurred.");
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { /* ignore stop error */ }
      }
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Poll for status updates
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeId && activeStatus === 'processing') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/v1/consultations/`);
          const all: Consultation[] = await res.json();
          const current = all.find((c) => c.id === activeId);
          if (current && current.status !== 'processing') {
            setActiveStatus(current.status);
            setActiveData(current.clinical_data || null);
            fetchConsultations(); // Update list
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeId, activeStatus, fetchConsultations]);

  const handleStartConsultation = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/consultations/`, {
        method: "POST"
      });
      const data = await response.json();
      setActiveId(data.consultation_id);
      setActiveStatus('pending');
      setActiveData(null);
      fetchConsultations();
    } catch {
      alert("Failed to start consultation.");
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/v1/consultations/${activeId}/upload?language=${selectedLanguage}`, {
        method: "POST",
        body: formData,
      });
      await response.json();
      setActiveStatus('processing');
      fetchConsultations();
    } catch {
      alert("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="container animate-fade-in" style={{ padding: "2rem 1.25rem" }}>
      {/* Navigation on White Card */}
      <nav className="white-card nav-container" style={{ 
        padding: "0.75rem 1.5rem", 
        marginBottom: "3rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        position: "sticky",
        top: "1rem",
        zIndex: 100,
        gap: "1rem"
      }}>
        <h1 className="gradient-text" style={{ fontSize: "1.6rem", fontWeight: "900", letterSpacing: "-0.03em", margin: 0 }}>eFiche AI</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="#features" onClick={(e) => scrollToSection(e, "features")} style={{ fontWeight: "600", fontSize: "0.9rem", textDecoration: "none", color: "inherit", padding: "0.5rem" }}>Features</Link>
          <Link href="#about" onClick={(e) => scrollToSection(e, "about")} style={{ fontWeight: "600", fontSize: "0.9rem", textDecoration: "none", color: "inherit", padding: "0.5rem" }}>About</Link>
          <button className="btn-primary btn-mobile-full" style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem" }} onClick={handleStartConsultation}>
            Start New
          </button>
          <Link href="/dashboard" className="btn-primary btn-mobile-full" style={{ 
            padding: "0.5rem 1.25rem", 
            fontSize: "0.85rem", 
            background: "none", 
            color: "var(--primary)", 
            border: "1px solid var(--primary)",
            textDecoration: "none"
          }}>
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ textAlign: "center", maxWidth: "850px", margin: "0 auto 4rem", padding: "0 0.5rem" }}>
        <h2 className="hero-title" style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", color: "#000000", marginBottom: "1.5rem", lineHeight: "1.1", fontWeight: "900", letterSpacing: "-0.05em" }}>
          Clinical <span className="gradient-text">Transcription</span> QC.
        </h2>
        <p style={{ fontSize: "clamp(1.1rem, 3vw, 1.3rem)", color: "#1e293b", marginBottom: "2.5rem", fontWeight: "500", lineHeight: "1.6" }}>
          High-fidelity medical data extraction with domain-aware scoring and automated PII redaction.
        </p>

        {activeStatus === 'completed' || activeStatus === 'needs_review' ? (
          <div className="white-card animate-fade-in" style={{ padding: "clamp(1.5rem, 5vw, 3rem)", margin: "0 auto", width: "100%", maxWidth: "700px", textAlign: "left", border: "2px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 5vw, 2rem)", fontWeight: "900" }}>Analysis Result</h2>
              <span style={{ 
                padding: "0.5rem 1rem", 
                borderRadius: "2rem", 
                fontSize: "0.8rem", 
                fontWeight: "700",
                background: activeStatus === 'completed' ? '#dcfce7' : '#fef9c3',
                color: activeStatus === 'completed' ? '#166534' : '#854d0e',
              }}>
                {activeStatus.toUpperCase()}
              </span>
            </div>

            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", marginBottom: "0.5rem" }}>DIAGNOSIS</p>
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>{activeData?.diagnosis || "No diagnosis detected"}</div>
              </div>

              <div style={{ background: "#f8fafc", padding: "1.5rem", borderRadius: "1rem", border: "1px solid #e2e8f0" }}>
                <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", marginBottom: "0.5rem" }}>MEDICATIONS</p>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {activeData?.medications?.map((m: string, i: number) => (
                    <li key={i} style={{ fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#10b981" }}>•</span> {m}
                    </li>
                  )) || <li>None recorded</li>}
                </ul>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: "100%", marginTop: "2rem", padding: "1rem" }}
              onClick={() => setActiveId(null)}
            >
              Finish and Close
            </button>
          </div>
        ) : (
          <div className="white-card animate-fade-in" style={{ padding: "clamp(1.5rem, 5vw, 3rem)", margin: "0 auto", width: "100%", maxWidth: "650px", textAlign: "center", border: "2px dashed var(--primary)" }}>
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "2rem", fontWeight: "900", marginBottom: "0.5rem" }}>
                {activeStatus === 'processing' ? "AI Analysis in Progress..." : 
                 activeStatus === 'failed' ? "Pipeline Failed" : "Ready for Upload or Recording"}
              </h2>
              {activeId && <p style={{ color: "var(--primary)", fontWeight: "800", fontSize: "1.2rem" }}>ID: {activeId}</p>}
            </div>
            
            {activeStatus === 'failed' && (
              <div style={{ padding: "2rem", background: "#fef2f2", color: "#b91c1c", borderRadius: "1rem", marginBottom: "2rem" }}>
                <p style={{ fontWeight: "700" }}>The processing pipeline failed.</p>
                <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>Please check backend logs. The OpenAI API Key might be missing or out of quota.</p>
              </div>
            )}
            
            {activeStatus === 'processing' ? (
              <div style={{ padding: "2rem" }}>
                <p style={{ color: "var(--text-muted)", fontWeight: "500" }}>Transcribing Kinyarwanda/French and extracting clinical data...</p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "2rem", textAlign: "left" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "0.5rem" }}>SELECT CONSULTATION LANGUAGE</label>
                  <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="white-card"
                    style={{ width: "100%", padding: "1rem", fontWeight: "700", color: "#0f172a", border: "2px solid #e2e8f0" }}
                  >
                    <option value="rw">🇷🇼 Kinyarwanda / Mixed</option>
                    <option value="fr">🇫🇷 French</option>
                    <option value="en">🇺🇸 English</option>
                  </select>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                  role="button"
                  tabIndex={0}
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "1rem",
                    padding: "3rem 1rem",
                    cursor: "pointer",
                    background: "#f8fafc",
                    transition: "all 0.2s ease",
                    opacity: isUploading ? 0.6 : 1,
                    pointerEvents: isUploading ? "none" : "auto",
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    onChange={handleUpload}
                    accept="audio/*,video/*,.pdf,image/*"
                  />
                  
                  <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{isUploading ? "⏳" : "📥"}</div>
                  
                  <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#0f172a", marginBottom: "0.5rem" }}>
                    {isUploading ? "Uploading..." : "Upload File for Whisper Transcription"}
                  </h3>
                  
                  {!isUploading && (
                    <>
                      <p style={{ color: "#64748b", fontWeight: "500", marginBottom: "1.5rem" }}>
                        Click or drag &amp; drop to upload your audio
                      </p>
                      
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "0.3rem 1rem", borderRadius: "2rem", fontSize: "0.85rem", fontWeight: "800", border: "1px solid #bae6fd" }}>
                          🎵 Audio
                        </span>
                        <span style={{ background: "#f1f5f9", color: "#475569", padding: "0.3rem 1rem", borderRadius: "2rem", fontSize: "0.85rem", fontWeight: "800", border: "1px solid #e2e8f0" }}>
                          🎬 Video
                        </span>
                      
                      </div>
                      <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: "1rem", fontWeight: "600" }}>
                        Max file size: 5GB. Supports MP3, WAV, and MP4.
                      </p>
                    </>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginTop: "2rem" }}>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
                  <span style={{ color: "#64748b", fontWeight: "800", fontSize: "0.85rem", textTransform: "uppercase" }}>Or</span>
                  <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
                </div>

                <div style={{ marginTop: "2rem", textAlign: "center" }}>
                  {!isRecording ? (
                    <button 
                      onClick={startRecording}
                      disabled={isUploading}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "1rem 2.5rem",
                        borderRadius: "2rem",
                        fontSize: "1.1rem",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        boxShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.39)",
                        opacity: isUploading ? 0.6 : 1,
                      }}
                    >
                      🎙️ Record Audio Directly
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ef4444", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "50%", animation: "pulse 1.5s infinite" }}></span>
                        Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </div>
                      
                      {liveTranscript && (
                        <div style={{ marginTop: "1.5rem", marginBottom: "1.5rem", padding: "1.5rem", background: "#f8fafc", borderRadius: "1rem", border: "1px solid #e2e8f0", maxWidth: "100%", width: "100%", textAlign: "left", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)" }}>
                          <p style={{ fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.5rem", textTransform: "uppercase" }}>Live Transcription Preview</p>
                          <div style={{ fontSize: "1.1rem", color: "#0f172a", fontStyle: "italic", lineHeight: "1.6" }}>&quot;{liveTranscript}&quot;</div>
                        </div>
                      )}

                      <button 
                        onClick={stopRecording}
                        style={{
                          background: "#0f172a",
                          color: "white",
                          border: "none",
                          padding: "1rem 2.5rem",
                          borderRadius: "2rem",
                          fontSize: "1.1rem",
                          fontWeight: "800",
                          cursor: "pointer",
                        }}
                      >
                        ⏹ Stop &amp; Upload
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {activeId && (
              <button 
                onClick={() => setActiveId(null)} 
                style={{ marginTop: "1.5rem", color: "var(--text-muted)", fontSize: "0.9rem", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
              >
                Cancel and start over
              </button>
            )}

            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: "600", maxWidth: "400px" }}>
                <strong>Note:</strong> We accept audio and video records. Supported formats include MP3, MP4, WAV, PDF, and JPG.
              </div>
              <div style={{ color: "#0f172a", fontWeight: "800", fontSize: "0.95rem", marginTop: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Or start recording instantly
              </div>
              <button 
                onClick={startRecording}
                disabled={isUploading || isRecording}
                style={{ background: "none", border: "none", color: "#0284c7", fontWeight: "800", textDecoration: "underline", cursor: "pointer", fontSize: "1rem" }}
              >
                Open App to Record
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Recent Activity Preview */}
      <section style={{ maxWidth: "1000px", margin: "0 auto 4rem", padding: "0 1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f172a" }}>Recent Activity</h3>
          <Link href="/dashboard" style={{ color: "#0284c7", fontWeight: "700", textDecoration: "none", fontSize: "0.9rem", background: "#f0f9ff", padding: "0.5rem 1rem", borderRadius: "2rem" }}>
            View Full Dashboard →
          </Link>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[...realConsultations, ...MOCK_CONSULTATIONS].slice(0, 5).map((item) => (
            <div key={item.id} className="white-card animate-fade-in" style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: item.patient_init ? "4px solid #cbd5e1" : "4px solid #0284c7", borderRadius: "0.75rem", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "700", display: "block", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {item.patient_init ? "Mock Data" : "Real-time Entry"} • {item.created_at ? new Date(item.created_at).toLocaleDateString() : item.date}
                </span>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#0f172a" }}>
                  {item.clinical_data?.diagnosis || item.diagnosis || "Pending processing..."}
                </h4>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <span style={{ 
                  padding: "0.25rem 0.75rem", 
                  borderRadius: "2rem", 
                  fontSize: "0.7rem", 
                  fontWeight: "700",
                  background: item.status === 'completed' || item.status === 'complete' ? '#dcfce7' : item.status === 'processing' ? '#e0f2fe' : '#f1f5f9',
                  color: item.status === 'completed' || item.status === 'complete' ? '#166534' : item.status === 'processing' ? '#0369a1' : '#475569',
                  textTransform: 'uppercase'
                }}>
                  {item.status.replace('_', ' ')}
                </span>
                <Link href="/dashboard" style={{ color: "#94a3b8", fontWeight: "800", fontSize: "1.2rem", textDecoration: "none", padding: "0.5rem" }}>›</Link>
              </div>
            </div>
          ))}
          {realConsultations.length === 0 && MOCK_CONSULTATIONS.length === 0 && (
            <p style={{ textAlign: "center", color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: "1rem", fontWeight: "600" }}>No recent activity.</p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: "4rem 0", borderTop: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "2.2rem", fontWeight: "900", marginBottom: "2.5rem", textAlign: "center" }} className="gradient-text">Platform Features</h3>
        <div className="grid-responsive">
          <div className="white-card" style={{ padding: "2.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚡</div>
            <h4 style={{ fontWeight: "800", marginBottom: "1rem", fontSize: "1.25rem" }}>AI Fusion ASR</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Combining Whisper and local models for medical-grade accuracy and offline backup.</p>
          </div>
          <div className="white-card" style={{ padding: "2.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📊</div>
            <h4 style={{ fontWeight: "800", marginBottom: "1rem", fontSize: "1.25rem" }}>Domain-Aware Scoring</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Clinical extraction validation that goes beyond word error rates to ensure medical safety.</p>
          </div>
          <div className="white-card" style={{ padding: "2.5rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔒</div>
            <h4 style={{ fontWeight: "800", marginBottom: "1rem", fontSize: "1.25rem" }}>PII Redaction</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Automatic de-identification of sensitive patient information before LLM processing.</p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ padding: "4rem 0", marginBottom: "4rem" }}>
        <div className="white-card" style={{ padding: "3rem", textAlign: "center" }}>
          <h3 style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "1rem" }}>About eFiche AI</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "700px", margin: "0 auto" }}>
            eFiche AI is a specialized tool for clinical transcription quality control. 
            Built for modern healthcare, it ensures that every consultation is captured accurately 
            and processed securely.
          </p>
        </div>
      </section>
    </main>
  );
}
