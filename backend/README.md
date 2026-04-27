# eFiche AI: Backend Pipeline

This is the FastAPI backend for the eFiche AI system. It handles asynchronous audio transcription, clinical data extraction via Large Language Models (LLMs), database persistence, and cross-origin resource sharing (CORS).

## Technology Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Task Queue**: [Celery](https://docs.celeryq.dev/) backed by Redis
- **Database**: PostgreSQL (managed via SQLAlchemy ORM)
- **Configuration**: Pydantic BaseSettings
- **AI Models**: 
  - OpenAI `whisper-1` (High-accuracy transcription)
  - OpenAI `gpt-4o` (Clinical parsing & data extraction)

## Environment Configuration
The backend strictly relies on environment variables for security. Pydantic validation ensures the app will not start unless the following keys are provided in your root `.env` file:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_PORT`
- `REDIS_URL`
- `SECRET_KEY`
- `OPENAI_API_KEY`
- `ALLOWED_ORIGINS`

*(When running via `docker-compose`, these variables are injected automatically via the `env_file: .env` directive).*

## Running Locally (Development)

If you wish to run the backend natively on Windows (instead of inside the Docker container), follow these steps:

### 1. Setup Virtual Environment
```bash
cd backend
python -m venv venv_efiche
venv_efiche\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Database Connectivity
Ensure your root `.env` file points to your local machine to reach the Dockerized Postgres:
```env
POSTGRES_HOST=127.0.0.1
REDIS_URL=redis://127.0.0.1:6379/0
```

### 3. Start the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Your interactive Swagger API documentation will be available immediately at [http://localhost:8000/docs](http://localhost:8000/docs).

### 4. Start the Celery Worker (Required for Transcription)
In a separate terminal (with the virtual environment activated), start the worker:
```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

## Testing the Backend

You can test the core logic of the backend independently using FastAPI's interactive Swagger UI:
1. **Testing API Endpoints:** Start the server and navigate to `http://localhost:8000/docs`. You can use the `POST /api/v1/consultations/` endpoint to simulate creating a consultation, and the `POST /{consultation_id}/process` to manually submit an audio file for testing.
2. **Testing the ASR Pipeline without OpenAI:** Ensure your `.env` does *not* contain an `OPENAI_API_KEY`. Submit an audio file. Watch the Celery logs (`docker compose logs -f worker` or your local terminal). You should see the fallback "mock" transcription engaged, proving the circuit-breaker logic works.
3. **Testing Cost Triage:** To test if the routing is functioning, submit a very long audio file (e.g., >5 minutes). Watch the FastAPI logs. You should see it route to the cloud endpoints. Submit a very short file (<2 minutes) and watch it route to the local extraction fallbacks, proving the `CostTracker` module is successfully making decisions.

## Key Directories
- `app/api/`: Contains FastAPI route definitions.
- `app/db/`: Database session management and models.
- `app/services/`: The core intelligence layer (ASR Whisper integration, LLM extractors, Fusion pipeline, and PII redaction).
- `app/tasks/`: Celery asynchronous task definitions to offload heavy AI processing.
