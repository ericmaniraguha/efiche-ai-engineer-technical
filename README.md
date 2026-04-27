# eFiche AI: Clinical Transcription Quality Control System

eFiche AI is a production-grade clinical transcription system designed for real-world healthcare environments. It enables nurses to capture consultations, transcribe multilingual speech (Kinyarwanda, French, English), and extract structured clinical data safely and efficiently.

The system is built to prioritize **clinical safety, reliability, and cost-efficiency**, ensuring it can scale across hundreds of facilities without compromising patient care.

---

## Technology Stack

The system is fully containerized using Docker Compose.

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Task Queue**: Celery (asynchronous processing)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Cache/Broker**: Redis
- **AI Models**:
  - Whisper (ASR)
  - GPT-4o (clinical extraction)
  - GPT-4o-mini (lightweight validation)

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI**: Responsive dashboard with real-time feedback
- **Features**:
  - Audio recording & upload
  - Live (non-clinical) transcription preview
  - Review and correction interface

### Tooling
- pgAdmin (database management)
- RedisInsight (queue monitoring)

---

## CI/CD & Engineering Excellence

The system implements a production-grade **CI/CD Pipeline** via GitHub Actions to ensure stability, safety, and performance.

### 🛡️ Automated Quality Assurance
- **Backend Pipeline**: 
  - Automated unit and integration testing via **Pytest**.
  - Verification of the **Clinical Quality Gate** logic and database models.
  - Asynchronous task processing validation.
- **Frontend Pipeline**:
  - Strict **ESLint** enforcement for React best practices.
  - **TypeScript** type-safety verification across all data structures.
  - **Next.js Production Build** validation on every push to prevent runtime regressions.
- **Environmental Consistency**: Docker-based build verification ensures that the system runs identically across local development and the CI runner.

---

## Key Design Principles

This system is designed as a **clinical tool, not a demo**.

**Core principles:**
- Clinical safety over convenience
- Human-in-the-loop validation
- Explicit uncertainty handling
- Cost-aware scaling
- Multi-model redundancy

**Avoided patterns:**
- Blind reliance on a single LLM
- Treating valid JSON as correct output
- Using WER/CER as sole quality metrics

---

## System Architecture (Overview)

The system is organized into four layers:

1. **Ingestion Layer**
   - Accepts audio uploads via API
   - Enqueues processing jobs

2. **Processing Layer (Async)**
   - Multi-provider ASR (local + cloud)
   - Transcript fusion
   - PII redaction
   - Clinical data extraction

3. **Decision Layer (Quality Gate)**
   - Validates completeness and correctness
   - Detects clinical risks
   - Assigns processing status

4. **Serving Layer**
   - API responses
   - Dashboard for review and correction

---

## Data Flow (Simplified)

1. Audio is uploaded via FastAPI (`POST /consultations/{id}/process`)
2. Celery processes the job asynchronously
3. Audio is transcribed using local ASR and/or Whisper
4. Transcripts are merged using a fusion strategy
5. PII is removed using local NER (e.g., Presidio)
6. De-identified text is sent to GPT-4o for structured extraction
7. Results pass through a Quality Gate
8. Output is stored and displayed in the dashboard

---

## Real-Time vs Clinical Processing

- **Real-time transcription (Web Speech API)** is used only for UI feedback.
- **Clinical-grade transcription** is performed asynchronously via backend ASR for reliability and accuracy.

---

## Quality Gate

All outputs are validated before reaching clinicians.

The Quality Gate checks:
- Completeness of required fields
- Consistency between transcript and extracted data
- Clinical safety (e.g., invalid dosages, unknown medications)

### Output Status:
- `complete` — safe and usable
- `partial` — incomplete but usable with caution
- `needs_review` — requires human validation
- `dangerous` — unsafe, must be corrected

---

## Cost-Aware Routing

To ensure scalability, the system dynamically routes consultations:

- **Local models (low cost)** are used when:
  - Short, simple consultations
  - High transcription confidence
  - Single-language input

- **GPT-4o (higher accuracy)** is used when:
  - Complex or long consultations
  - Mixed-language input
  - Low transcription confidence

This keeps the average cost low while maintaining clinical reliability.

---

## Quick Start (Docker)

### 1. Prerequisites
- Docker Desktop installed

### 2. Setup Environment
```bash
cp .env.example .env
```

Add your OpenAI API key if available.

### 3. Run the System

```bash
docker compose up -d --build
```

---

## Services

| Service      | URL                                                      |
| ------------ | -------------------------------------------------------- |
| Frontend     | [http://localhost:3000](http://localhost:3000)           |
| Backend API  | [http://localhost:8000](http://localhost:8000)           |
| API Docs     | [http://localhost:8000/docs](http://localhost:8000/docs) |
| pgAdmin      | [http://localhost:5050](http://localhost:5050)           |
| RedisInsight | [http://localhost:5540](http://localhost:5540)           |

---

## Local Development

Run databases only:

```bash
docker compose up -d db redis
```

### Backend

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Testing

### Stub Mode (No OpenAI Key)

* System automatically uses mock ASR and extraction
* Enables full UI and pipeline testing

### Testing the Quality Gate

Example input:

> "The patient has a fever. Prescribe 500 kilograms of paracetamol."

**Expected Result:**

* Status: `needs_review`
* Flag: dangerous dosage detected
* UI highlights issue and requires correction

### CI/CD Verification (Local)

To run the same checks performed by the GitHub Actions pipeline locally:

#### Backend Tests
```bash
cd backend
PYTHONPATH=. python -m pytest tests/ -v
```

#### Frontend Validation
```bash
cd frontend
npm run lint
npm run build
```

---

## Architecture Summary

**Pipeline:**

* FastAPI → Celery → ASR → Fusion → PII Redaction → LLM → Quality Gate → DB → Dashboard

---

## Known Limitations

* Large audio files require chunking (not fully implemented)
* Code-switching (Kinyarwanda/French) impacts local ASR accuracy
* Polling used instead of WebSockets (planned for V2)
* Audio stored temporarily in container (not persistent)

---

## Project Structure

```text
backend/
  app/
    api/
    core/
    db/
    services/
    tasks/
    models/

frontend/
  src/
    app/
    components/

docker-compose.yml
.env.example
README.md
```

---

## Summary

eFiche AI is designed as a **safe, scalable, and cost-aware clinical AI system**. It combines multi-ASR transcription, structured extraction, and strict validation to ensure that AI outputs support clinicians without introducing risk.

The system emphasizes:

* Safety through validation and human review
* Efficiency through asynchronous processing
* Scalability through cost-aware routing
