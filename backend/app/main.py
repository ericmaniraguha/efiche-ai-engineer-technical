import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import consultations, health
from app.core.logging import setup_logging
from app.db.session import engine
from app.db.base import Base
# Import models to ensure they are registered with Base metadata
from app.models.consultation import Consultation
from app.models.result import AnalysisResult

setup_logging()

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title="eFiche AI API", version="1.0.0")

# Get allowed origins from environment variable
# Supports comma-separated list in ALLOWED_ORIGINS, or falls back to FRONTEND_URL
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    origins = [
        frontend_url,
        frontend_url.replace("localhost", "127.0.0.1"),
        frontend_url.replace("localhost", "0.0.0.0"),
    ]

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(consultations.router, prefix="/api/v1/consultations", tags=["consultations"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to eFiche AI API",
        "docs": "/docs",
        "status": "online"
    }
