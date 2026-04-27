# eFiche AI: Clinical Transcription Quality Control System

eFiche AI is a production-grade Clinical Transcription system designed to empower healthcare professionals with AI-driven ASR (Automatic Speech Recognition) fusion and domain-aware clinical extraction. 

It features real-time visual transcription via the Web Speech API and backend processing using OpenAI's GPT-4o and Whisper models.

![Version](https://img.shields.io/badge/version-1.0.0-emerald)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Technology Stack

The entire stack is containerized and orchestrated using Docker Compose.

### Backend Pipeline
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Task Queue**: [Celery](https://docs.celeryq.dev/) distributed background workers
- **Database**: [PostgreSQL](https://www.postgresql.org/) (with SQLAlchemy ORM)
- **Caching & Broker**: [Redis](https://redis.io/)
- **AI/ML Integration**: OpenAI GPT-4o (Clinical Extraction), Whisper ASR

### Frontend Interface
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Premium Glassmorphism & Responsive Design)
- **Features**: Real-time Web Speech API transcription, drag-and-drop uploads, and dynamic reporting dashboards.

### Tooling & Management
- **pgAdmin**: Web-based PostgreSQL database administration
- **RedisInsight**: Official Redis GUI for caching and queue visualization

---

## Quick Start (Docker Setup)

The absolute easiest way to run the application is to let Docker handle everything.

### 1. Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### 2. Environment Setup
Create a `.env` file from the provided template to configure the system:
```bash
cp .env.example .env
```
Open your new `.env` file and strictly ensure you provide your `OPENAI_API_KEY`.

### 3. Launch the Stack
Run the following command in the root directory:
```bash
docker compose up -d --build
```
This command will spin up the Database, Redis, pgAdmin, RedisInsight, FastAPI Backend, Celery Worker, and Next.js Frontend.

---

## Accessing the Services

Once Docker is running, you can access the application components via the following URLs:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:3000](http://localhost:3000) | The main User Interface (Upload & Dashboard) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | The FastAPI Base URL |
| **API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI for testing endpoints |
| **pgAdmin** | [http://localhost:5050](http://localhost:5050) | Database Manager (Login using .env credentials) |
| **RedisInsight**| [http://localhost:5540](http://localhost:5540) | Cache & Queue Monitor (Connect to host: `redis`, port: `6379`) |

---

## Local Development Workflow

If you are actively writing code and want hot-reloading (without rebuilding Docker containers), you can run the Frontend and Backend manually on your Windows machine while keeping the Databases in Docker.

### Step 1: Start the Databases
First, ensure only the foundational services are running:
```bash
docker compose up -d db redis pgadmin redisinsight
```

### Step 2: Start the FastAPI Backend
Open a terminal, activate your Python virtual environment, and run:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*(Note: To run locally, ensure `POSTGRES_HOST=127.0.0.1` in your `.env` file so Windows can resolve the database).*

### Step 3: Start the Next.js Frontend
Open a new terminal and run:
```bash
cd frontend
npm install
npm run dev
```

---

## Testing the Application

### Running Without OpenAI Credentials (Stub Mode)
If you do not have an active OpenAI API key, the system is designed to gracefully degrade:
1. Ensure your `.env` file does NOT have a valid `OPENAI_API_KEY`.
2. The `ConsultationProcessor` and `Extractor` will automatically fall back to yielding simulated/stubbed structured JSON responses and localized mock ASR transcripts.
3. The dashboard and pipeline will continue to function exactly as if real models were used, allowing you to test UI states and database logic.

### Testing the Quality Gate with a "Bad Extraction"
To explicitly trigger the human review workflow and test the quality gate:
1. Navigate to `http://localhost:3000` and start a new recording.
2. Say the following (in English): *"The patient has a slight fever. Please prescribe 500 kilograms of paracetamol."*
3. Upload the recording.
4. Navigate to the **Review Dashboard** (`http://localhost:3000/dashboard`).
5. **Expected Result:** The consultation will be explicitly flagged as `NEEDS REVIEW` with a pulsing red badge. The `QualityGate` heuristic will have caught the irregular dosage and display a plain-text alert: **"AI FLAGS DETECTED: Irregular or dangerous dosage detected in medication: 500 kilograms."** The UI will highlight the error and force you to manually correct the structured extraction before marking it complete.

---

## Architecture & Data Flow

Below is a plain-text representation of how data moves through the eFiche AI system asynchronously:

1. **Client Submission:** The Next.js frontend captures audio and sends a `POST /consultations/{id}/process` request to FastAPI.
2. **Ingestion & Queuing:** FastAPI saves the file locally and enqueues a background job via Redis/Celery (`process_consultation_task`), immediately returning a `202 Processing` response to the client.
3. **Multi-ASR Transcription:** The Celery worker picks up the job and runs the audio through both a Local SpeechRecognizer and a Whisper API client. The `ASRFusion` engine compares word counts and confidence intervals to select/merge the best transcript.
4. **Data Redaction:** The winning transcript passes through local `Presidio NER` to mask sensitive names and IDs.
5. **Clinical Extraction:** The safe transcript is sent to `GPT-4o` to extract structured JSON (Diagnosis, Medications, Follow-up).
6. **Safety & Hallucination Guard:** The extracted data is checked against the transcript using `text-embedding-3-small` and the local `QualityGate`. Missing data is triaged via a secondary LLM call to differentiate between "LLM failure" and "Audio drop".
7. **Database Persistence:** The finalized JSON, flags, and `needs_review` statuses are written to PostgreSQL.
8. **Client Polling:** The React dashboard, actively polling `GET /consultations/`, detects the status change and renders the extraction alongside any plain-text AI safety warnings.

---

## Known Limitations

*   **Audio Length limits:** The current Whisper integration synchronous API has strict file size limits (25MB). Extremely long consultations (>30 mins) require chunking/segmentation which is not yet fully robust in this version.
*   **Kinyarwanda Code-Switching:** The local Google Web Speech API struggles significantly when speakers rapidly alternate between French and Kinyarwanda within the same sentence. Whisper handles this better but incurs cloud costs.
*   **WebSockets:** The dashboard currently uses HTTP polling every 5 seconds. True real-time WebSocket updates are slated for V2 to reduce server load.
*   **Ephemeral Storage:** Uploaded audio files are stored in a local `./uploads` directory inside the Docker container. If the container restarts, pending un-processed audio files will be lost.

---

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/         # REST API Endpoints
│   │   ├── core/        # Pydantic Configuration & Security
│   │   ├── db/          # SQLAlchemy session & setup
│   │   ├── services/    # ASR, LLM Extraction, AI Pipelines
│   │   ├── tasks/       # Celery asynchronous workers
│   │   └── models/      # PostgreSQL Database Schemas
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js Pages & Layouts (Dashboard, etc.)
│   │   ├── components/  # React UI Components
│   │   └── globals.css  # Global CSS Variables & Styles
│   └── package.json     # Node.js dependencies
├── docker-compose.yml   # Full-stack Orchestration
├── .env.example         # Environment variables template
└── README.md            # Project Documentation
```


Here is the explicit arithmetic for your cost calculations, the defined routing rule, and the defense for your clinical director.

### 1. Cost Calculations & Arithmetic

**Volume Arithmetic:**
*   Total consultations per day = 50 facilities × 40 consultations/day = 2,000
*   Total consultations per month (assuming 30 days) = 2,000 × 30 = **60,000 consultations/month**

**Cost per Consultation Arithmetic:**
*   Whisper Cost = 10 minutes × $0.006/min = **$0.060**
*   GPT-4o Cost = **$0.009**
*   Total Cloud Cost = $0.060 + $0.009 = **$0.069 per consultation**

**Monthly Cost: 100% Whisper + GPT-4o**
*   60,000 consultations × $0.069 = **$4,140.00 / month**

**Monthly Cost: 30% Routed to Local Model for Extraction**
*(Assuming Whisper still transcribes 100% of audio, but local LLM handles 30% of the JSON extractions at $0)*
*   Whisper Cost (100% volume): 60,000 × $0.060 = $3,600.00
*   GPT-4o Cost (70% volume): 42,000 × $0.009 = $378.00
*   Local LLM Cost (30% volume): 18,000 × $0.000 = $0.00
*   Total Monthly Cost: $3,600.00 + $378.00 + $0.00 = **$3,978.00 / month**
*(Note: If you also routed the transcription/ASR locally for that 30%, the math becomes: 42,000 × $0.069 = **$2,898.00 / month**, saving you over $1,200).*

---

### 2. The Routing Rule

**The Signal:** Consultation Length and Language selection.
*   **The Rule:** If a consultation is less than 4 minutes long (indicating a routine, low-complexity follow-up) AND is conducted entirely in a primary language (English/French), route it to the **Local Model**. If the consultation exceeds 4 minutes (indicating a complex diagnostic session) OR the UI is set to "Kinyarwanda / Mixed" (requiring heavy cross-lingual semantic reasoning), route it to **GPT-4o**.

---

### 3. Defense to the Clinical Director

"To ensure we are maximizing both clinical safety and hospital resources, we aren't giving anyone 'cheaper' or 'worse' AI; rather, we are treating AI like our medical staff by using the right specialist for the right job. A routine, 3-minute follow-up for a common cold does not require a supercomputing engine to extract a simple paracetamol prescription, just like you wouldn't assign your Chief of Surgery to routinely take a patient's temperature. By securely handling straightforward, predictable visits with our localized internal AI, we reserve our most expensive, heavy-duty AI processing specifically for your doctors' most complex, lengthy diagnostic cases where its advanced reasoning is actually necessary, allowing us to save the hospital thousands of dollars a month without ever compromising the quality of patient care."

---

## 2. Design Document

### a) PII Handling Architecture
**The Problem:** Rwanda data protection laws strictly prohibit sending identifiable audio to external cloud providers without explicit consent. De-identification cannot happen on audio without first transcribing it.

**The Solution:**
*   **Local vs External:** The *only* legally defensible architecture is an **On-Premise ASR Pipeline**. Audio must never leave the hospital network. We deploy a local, GPU-accelerated ASR (e.g., Faster-Whisper or a fine-tuned SeamlessM4T) directly on the clinic's local servers. 
*   **Post-ASR Masking:** Once transcribed locally, the raw text is passed through a lightweight, local Named Entity Recognition (NER) model (e.g., Microsoft Presidio). This model aggressively masks names, ID numbers, and phone numbers (e.g., *"Patient [PERSON_1] with ID [ID_NUMBER] presented..."*). **Only the masked, strictly de-identified text is transmitted to external APIs like GPT-4o for structured extraction.**
*   **Fallback Strategy:** If local ASR fails or quality is severely degraded, we **do not** fall back to external Cloud ASRs unless the patient's digital file contains an explicit, cryptographically signed consent token. If no consent exists, the fallback is a "Hard Reject," requiring the clinician to manually dictate a brief summary rather than recording the patient directly.
*   **Storage Policy:** 
    *   **Original Audio:** Purged immediately from RAM post-transcription. Storing raw medical audio is a massive liability and provides little downstream value for extraction tasks.
    *   **Raw Transcript:** Stored securely on-premise for exactly 30 days. This allows doctors to review flagged errors. After 30 days, it is scrubbed.
    *   **De-identified Transcript & Structured JSON:** Stored permanently in the central database for long-term analytics and clinical continuity.
*   **Tradeoffs:** Forcing local ASR increases initial CapEx (requiring local GPUs or heavy edge devices at the clinic). However, the tradeoff is absolute zero legal liability regarding cloud data residency breaches and massive long-term OpEx savings (bypassing cloud ASR minute-costs).

### b) Multi-Provider ASR Strategy
**Execution:**
*   **When to run both vs. one:** The system executes the primary model (a locally fine-tuned Kinyarwanda ASR) by default. The secondary provider (a generalized model) is triggered in parallel *only* if the primary ASR confidence score drops below 0.75, or if a local language-detection module detects a sudden shift to pure English/French where the Kinyarwanda model might underperform.
*   **Selection & Merging:** We utilize an intelligent fusion heuristic (as built in `fusion.py`). Instead of blindly trusting confidence scores (which can be overconfident on hallucinations), we calculate a score based on `Confidence × Word Count`. If one provider drops a massive segment of audio (e.g., dropping 20 words due to code-switching confusion), we concatenate the outputs or use `SequenceMatcher` to merge the disparate segments.
*   **Circuit-Breaker Strategy:** If the primary local provider experiences a GPU timeout or hangs for > 8 seconds, the circuit trips open. The system immediately aborts the primary request, falls back entirely to the secondary model, and logs a critical hardware alert. If both fail, it gracefully alerts the UI to request manual input.

### c) Flagging and Human Review Workflow
**Flagging Criteria:**
A consultation is forced into the human review queue if ANY of the following occur:
1.  **Hallucination Check (1a):** The semantic embedding filter or the LLM Fact Checker flags a claim as "unsupported" by the transcript.
2.  **Completeness Drop (1b):** The `ExtractionRecoveryManager` detects that the audio clearly contained medication information, but the GPT-4o model inexplicably dropped it from the JSON.
3.  **Clinical Safety Heuristics:** 
    *   The extracted medication string does not fuzzy-match any drug in the clinic's authorized database (Formulary check).
    *   The extracted dosage unit is irregular (e.g., the LLM hallucinates "500 kg" instead of "500 mg").
    *   The prompt's "dangerous_flags" array populates (e.g., prescribing a drug the transcript states the patient is allergic to).

**Human Review Interface:**
*   **Who:** An attending clinician or a dedicated medical scribe.
*   **The Interface:** A split-screen dashboard. On the left: the raw (but PII-masked) transcript. On the right: the structured JSON. Fields that triggered the flag (e.g., the irregular dosage or the unsupported claim) are highlighted in stark red.
*   **Actions & Feedback:** The reviewer can click the highlighted text to manually correct it. Once they click "Approve," the corrected JSON is saved. Crucially, the delta (the difference between the AI's mistake and the human's correction) is written to an async queue. This dataset is periodically used for Direct Preference Optimization (DPO) to fine-tune the extraction models, creating a continuous improvement loop.

### d) What NOT to use GPT-4o for
1.  **PII Redaction:** Sending identifiable data to OpenAI just to ask it to remove the PII defeats the entire purpose of data privacy. It is legally indefensible. We strictly use local open-source models (like Presidio) for redaction.
2.  **Completeness Triage / Boolean Checks:** Asking "Is there a diagnosis mentioned in this text?" does not require GPT-4o. We use GPT-4o-mini (or local Llama-3 8B), which is 30x cheaper and infinitely faster, with zero loss in accuracy for simple boolean classification.
3.  **Transcription (ASR):** Passing audio directly to OpenAI's Whisper API endpoint is expensive at scale ($0.006/min) and violates local data processing rules. We run ASR entirely via local self-hosted open-source models.

### e) What NOT to build in V1
1.  **Cross-Consultation Memory (Patient History Retrieval):**
    *   *Why defer:* Automatically feeding the LLM a patient's historical records to contextualize the current extraction seems incredibly useful. However, patient identity resolution in developing regions is notoriously difficult (shared phone numbers, varying name spellings). If the system accidentally retrieves the *wrong* patient's history and the LLM hallucinates a diagnosis based on it, the liability is catastrophic.
2.  **Real-Time Streaming Transcription UI:**
    *   *Why defer:* Having words appear on the screen as the doctor speaks is cool, but maintaining WebSocket connections, handling audio chunking, and managing React state for streaming ASR requires a massive engineering overhead. Batch processing (record -> upload -> process) is infinitely more stable, much cheaper, and perfectly sufficient for V1 asynchronous workflows.
3.  **Automated Pharmacy Routing/Prescription Generation:**
    *   *Why defer:* Automatically sending the extracted medication list directly to a pharmacy API. The hidden cost here is integration complexity (connecting to 50 different unstandardized pharmacy APIs) and the extreme clinical danger of an AI hallucinating a dosage that immediately gets fulfilled without human intervention. V1 must keep the human clinician as the ultimate gatekeeper.