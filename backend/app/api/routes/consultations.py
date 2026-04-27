from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.consultation import Consultation, ConsultationStatus
import uuid
import shutil
import os
from app.services.processor import ConsultationProcessor
from app.tasks.consultation_tasks import process_consultation_task

router = APIRouter()

@router.post("/")
async def create_consultation(db: Session = Depends(get_db)):
    """
    Creates a new clinical consultation record.
    """
    new_id = f"CONS-{uuid.uuid4().hex[:8].upper()}"
    db_consultation = Consultation(
        id=new_id,
        facility_id="FAC-MAIN-01",
        status=ConsultationStatus.PENDING
    )
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    
    return {
        "message": "Consultation created successfully",
        "consultation_id": db_consultation.id,
        "status": db_consultation.status
    }

@router.post("/{consultation_id}/process")
async def process_consultation(
    consultation_id: str,
    language: str = "rw",
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Save file
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{consultation_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update status
    consultation.status = ConsultationStatus.PROCESSING
    db.commit()

    # Trigger Pipeline via Celery
    process_consultation_task.delay(consultation_id, file_path, language)

    return {"message": "Audio uploaded and Celery processing started", "consultation_id": consultation_id}

@router.get("/{consultation_id}/result")
async def get_consultation_result(consultation_id: str, db: Session = Depends(get_db)):
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
        
    return {
        "id": consultation.id,
        "status": consultation.status,
        "raw_transcript": consultation.raw_transcript,
        "clinical_data": consultation.clinical_data,
        "wer_score": consultation.wer_score,
        "clinical_score": consultation.clinical_score
    }

@router.get("/")
async def list_consultations(db: Session = Depends(get_db)):
    """
    Returns a list of all clinical consultations in the database.
    """
    return db.query(Consultation).order_by(Consultation.created_at.desc()).all()
