from app.tasks.celery_app import celery_app
import asyncio
from app.db.session import SessionLocal
from app.services.processor import ConsultationProcessor

@celery_app.task(name="process_consultation")
def process_consultation_task(consultation_id: str, file_path: str, language: str = "rw"):
    print(f"Celery executing process_consultation for {consultation_id}")
    
    async def run():
        with SessionLocal() as db:
            processor = ConsultationProcessor(db)
            await processor.run_pipeline(consultation_id, file_path, language)
            
    asyncio.run(run())
    return {"status": "dispatched", "consultation_id": consultation_id}
