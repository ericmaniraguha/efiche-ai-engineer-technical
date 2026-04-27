from sqlalchemy import Column, String, JSON, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, index=True)
    consultation_id = Column(String, ForeignKey("consultations.id"), index=True)
    
    # Provider Info
    asr_provider = Column(String)  # e.g., "whisper-v3", "local-asr"
    llm_model = Column(String)     # e.g., "gpt-4o"
    
    # Detailed Data
    segments = Column(JSON, nullable=True) # Granular ASR timestamps
    raw_llm_response = Column(String, nullable=True)
    
    # Quality Data
    processing_time_ms = Column(Float, nullable=True)
    input_tokens = Column(Float, default=0)
    output_tokens = Column(Float, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
