# eFiche AI: System Architecture

## 1. High-Level Architecture

The system is organized into four core layers designed for clinical safety, cost efficiency, and scalability:

1. **Ingestion Layer**
   - Handles audio uploads from clinician tablets
   - Validates metadata and enqueues processing jobs via FastAPI

2. **Processing Layer (Asynchronous)**
   - Multi-provider ASR (Cloud + Local)
   - Transcript fusion and alignment
   - PII detection and redaction
   - Structured clinical data extraction

3. **Decision Layer (Quality Gate)**
   - Domain-aware quality evaluation
   - Extraction completeness checks
   - Clinical risk detection
   - Dynamic routing (cost + confidence aware)

4. **Serving Layer**
   - FastAPI backend APIs
   - Celery workers for async processing
   - Next.js frontend for clinician review and correction

---

## 2. Key Design Philosophy

This system is designed as a **clinical-grade AI system**, not a prototype.

**Principles:**
- Clinical safety over model convenience
- Explicit uncertainty handling (no silent failures)
- Cost-aware scaling across facilities
- Human-in-the-loop as a first-class component
- Redundancy across ASR and extraction layers

**Anti-patterns avoided:**
- Blind reliance on a single LLM (e.g., GPT-4o everywhere)
- Using WER/CER as the sole quality metric
- Treating valid JSON as correct output
- Ignoring multilingual complexity (Kinyarwanda/French/English mixing)

---

## 3. Data Flow

1. **Audio Ingestion**  
   `POST /consultations/{id}/process` (FastAPI)

2. **ASR Transcription**  
   - Parallel or fallback execution:
     - Cloud: Whisper
     - Local: fine-tuned or offline ASR

3. **Fusion Engine**  
   - Aligns outputs using confidence-weighted merging
   - Detects dropped segments and reconstructs transcript

4. **PII Redaction**  
   - Local NER-based masking before external API calls

5. **LLM Extraction**  
   - GPT-4o extracts structured clinical JSON

6. **Safety & Hallucination Guard**  
   - Lightweight model (e.g., GPT-4o-mini) + embedding checks
   - Validates extracted fields against transcript evidence

7. **Quality Gate Decision**  
   - Assigns status:
     - `complete`
     - `partial`
     - `needs_review`
     - `dangerous`

8. **Frontend Dashboard**  
   - Clinician reviews flagged cases
   - Manual correction and validation

---

## 4. Detailed Architectural Decisions

### A. PII Handling Architecture

**Challenge:**  
Audio contains personally identifiable information (PII), but transcription is required before redaction.

**Solution: Hybrid Local-First Strategy**

1. **Primary Path (Preferred):**
   - Run **local ASR** (on-device or on-premise)
   - Perform **PII detection and masking locally** using NER (e.g., Presidio)
   - Send only **de-identified transcript** to external LLMs

2. **Fallback Path (If Local ASR Quality is Insufficient):**
   - Use cloud ASR (Whisper) **only if**:
     - Data processing agreements exist
     - Explicit patient consent is captured
   - Immediately apply **post-ASR redaction before storage or LLM usage**

3. **Storage Policy:**
   - Raw audio: **not persisted** (processed in memory, optionally short-lived encrypted buffer)
   - Raw transcript: stored **temporarily (≤30 days)** for audit/review
   - De-identified structured data: stored **long-term**

**Tradeoff:**
- Slight loss in transcription accuracy (local ASR)
- Significant gain in regulatory compliance and patient privacy

---

### B. Multi-Provider ASR Strategy

**Execution Strategy:**
- Run both providers when:
  - Language mixing is detected
  - Confidence is low
- Run only local ASR when:
  - Cost constraints apply
  - Network is unavailable

**Fusion Strategy:**
- Score each transcript using:
  - Confidence score (if available)
  - Token/word coverage
- Merge using:
  - Sequence alignment (e.g., `SequenceMatcher`)
  - Segment stitching for dropped phrases

**Circuit Breaker:**
- If cloud ASR fails (timeout or cost threshold exceeded):
  - Immediately fallback to local ASR
  - Mark result with reduced confidence

---

### C. Flagging and Human Review Workflow

A consultation is flagged if **any** of the following conditions are met:

1. **Extraction Completeness Failure**
   - Missing critical fields (e.g., medications, diagnosis)
   - Inconsistency between transcript and extracted data

2. **Semantic Mismatch**
   - Extracted claims not supported by transcript (embedding similarity check)

3. **Clinical Safety Violations**
   - Invalid medication names (not in formulary)
   - Unsafe dosage values (e.g., "500 kg" instead of "500 mg")
   - Contradictory instructions

4. **Low Transcription Quality**
   - High domain-specific error score (not just WER)

---

### Human Review Interface

**Reviewer:** Nurse or trained clinical staff

**Interface Features:**
- Side-by-side:
  - Transcript
  - Extracted structured data
- Highlighted missing or flagged fields
- Editable structured form

**Actions:**
- Accept
- Correct
- Escalate

**Feedback Loop:**
- Corrections stored as labeled data
- Used to:
  - Improve extraction prompts/models
  - Fine-tune local models

---

### D. What NOT to Build in V1

1. **Cross-Consultation Memory**
   - Risk: incorrect patient linkage → catastrophic clinical errors
   - Complexity: identity resolution, data governance

2. **Real-Time Streaming Transcription**
   - High infrastructure complexity (WebSockets, latency handling)
   - Limited clinical benefit vs batch processing

3. **Automated Pharmacy Integration**
   - Unsafe without guaranteed correctness
   - Human validation required before medication dispatch

---

## Summary

This architecture prioritizes:
- **Clinical safety** through multi-layer validation and human oversight
- **Cost control** via dynamic routing and local-first strategies
- **Scalability** across hundreds of facilities
- **Regulatory compliance** through strict PII handling

The system is designed not as a demo, but as a **reliable clinical tool operating under real-world constraints**.