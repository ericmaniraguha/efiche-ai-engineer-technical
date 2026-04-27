from sqlalchemy import Column, String, JSON, Float, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class ConsultationStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"

class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String, primary_key=True, index=True)
    facility_id = Column(String, index=True)
    status = Column(Enum(ConsultationStatus), default=ConsultationStatus.PENDING)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Results
    raw_transcript = Column(String, nullable=True)
    clinical_data = Column(JSON, nullable=True)
    
    # Metrics
    wer_score = Column(Float, nullable=True)
    clinical_score = Column(Float, nullable=True)
    cost_estimate = Column(Float, nullable=True)

    # Relationships
    results = relationship("AnalysisResult", backref="consultation")
