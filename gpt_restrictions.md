

# What I Would NOT Use GPT-4o For (And Why)

In the context of the **eFiche Clinical AI Pipeline**, GPT-4o is a powerful reasoning engine for interpreting and structuring unstructured clinical text. However, its use must be constrained within well-defined architectural boundaries to avoid clinical risk, compliance violations, latency issues, and unnecessary cost.

Below are the explicit cases where GPT-4o should **not** be used in production:

---

## 1. Deterministic Clinical Calculations (e.g., Dosages & Medical Formulas)

**The Risk:**
LLMs are probabilistic systems that generate outputs based on likelihood rather than deterministic computation. This makes them unsuitable for safety-critical numerical operations. They may produce incorrect values, unit conversions (e.g., mg vs µg), or unsafe pediatric dosage recommendations.

**The Alternative:**
All clinical calculations must be handled by deterministic systems, including:

* Verified clinical calculators
* Established medical APIs (e.g., Lexicomp)
* Rule-based validation engines
* Hardcoded clinical safety constraints

---

## 2. Direct Database Operations or SQL Generation

**The Risk:**
Allowing LLM-generated SQL to execute directly against a production clinical database introduces serious risks, including:

* SQL injection via prompt injection attacks
* Schema corruption or unintended data modification
* Loss of relational integrity

**The Alternative:**
GPT-4o should only output **strictly validated structured data (e.g., JSON)**.
All database interactions must be handled by the application layer using:

* Pydantic or equivalent schema validation
* ORM frameworks (e.g., SQLAlchemy)
* Explicit query builders with constrained permissions

---

## 3. Routine Word-for-Word Transcription (ASR Tasks)

**The Risk:**
Although GPT-4o supports audio understanding, using it for high-volume speech-to-text processing is inefficient due to:

* Higher cost per token
* Increased latency
* Lack of specialization for transcription workloads

**The Alternative:**
Use dedicated ASR systems such as:

* Whisper-based models
* Lightweight or on-prem speech recognition engines

GPT-4o should only be used downstream for **semantic understanding, summarization, or clinical reasoning**, not raw transcription.

---

## 4. Simple Binary Triage and Heuristic Checks

**The Risk:**
Using a large model for trivial decisions (e.g., checking whether a transcript is empty or contains only filler words) leads to unnecessary cost and system inefficiency.

**The Alternative:**
Apply lightweight deterministic checks at the system edge, such as:

* Basic string validation (e.g., `len(text.strip()) < threshold`)
* Rule-based filters
* Low-cost models (e.g., GPT-4o-mini) for simple routing or classification

---

## 5. Processing Unredacted Protected Health Information (PHI)

**The Risk:**
Sending raw personal identifiers (e.g., names, national ID numbers, phone numbers) to external LLM APIs can violate:

* GDPR
* HIPAA
* Local data protection regulations

This is especially critical without strict enterprise-grade data handling guarantees.

**The Alternative:**
Implement a **local PII/PHI redaction layer** before any model interaction:

* Replace identifiers with placeholders (e.g., `[PATIENT_NAME]`, `[PHONE_NUMBER]`)
* Ensure no direct personal identifiers are exposed to the model
* Maintain a secure mapping layer only within the trusted system boundary

---

# Summary

GPT-4o should be treated as a **reasoning and transformation layer**, not a system of record or deterministic execution engine. Its safe use depends on strict separation between:

* Probabilistic reasoning (LLM layer)
* Deterministic computation (application layer)
* Security and compliance enforcement (pre-processing layer)

