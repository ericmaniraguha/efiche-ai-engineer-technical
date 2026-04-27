from sqlalchemy.orm import Session
from app.models.consultation import Consultation, ConsultationStatus
from app.models.result import AnalysisResult
from app.services.asr.whisper_client import WhisperClient
from app.services.asr.local_asr import LocalASR
from app.services.asr.fusion import ASRFusion
from app.services.llm.extractor import MedicalExtractor
from app.services.quality.gate import QualityGate
from app.services.quality.checker import HallucinationChecker
from app.services.quality.recovery import ExtractionRecoveryManager
from app.services.cost_tracker import CostTracker
from app.core.security import redact_pii
from app.core.logging import logger
import uuid
import time

from app.core.config import settings

class ConsultationProcessor:
    def __init__(self, db: Session):
        self.db = db
        self.whisper = WhisperClient()
        self.local_asr = LocalASR()
        self.extractor = MedicalExtractor()
        self.gate = QualityGate()
        self.hallucination_checker = HallucinationChecker()
        self.recovery_manager = ExtractionRecoveryManager()
        self.cost_tracker = CostTracker()

    async def run_pipeline(self, consultation_id: str, file_path: str, language: str = "rw"):
        logger.info(f"Starting production pipeline for {consultation_id}")
        
        # 0. Budget Check (Operate within defined cost envelope)
        current_cost = self.cost_tracker.get_current_cost()
        if current_cost >= settings.MONTHLY_COST_LIMIT:
            logger.warning(f"Budget exceeded (${current_cost:.2f}). Falling back to LOCAL ASR only.")
            use_expensive_api = False
        else:
            use_expensive_api = True
        
        try:
            start_time = time.time()
            # 1. Transcription (Conditional based on budget)
            if use_expensive_api:
                # Optimized for Kinyarwanda/French/English mix
                whisper_res = await self.whisper.transcribe(file_path, language=language) 
                self.cost_tracker.add_cost(0.01) # Estimate: flat 1 cent for test/demo audio length
            else:
                whisper_res = {"text": "", "segments": []}

            local_res = await self.local_asr.transcribe(file_path, language=language)
            
            # 2. Fusion
            best_transcript = ASRFusion.select_best_transcript([
                {"provider": "whisper-1", **whisper_res},
                {"provider": "local-asr", **local_res}
            ])
            
            # 3. PII Redaction
            safe_transcript = redact_pii(best_transcript["text"])
            
            # 4. Clinical Extraction
            clinical_data = await self.extractor.extract_clinical_data(safe_transcript, language=language)
            self.cost_tracker.add_cost(0.02) # Estimate: 2 cents for GPT-4o extraction
            
            # 4b. Recovery & Completeness Triage
            recovery_result = await self.recovery_manager.triage_missing_fields(safe_transcript, clinical_data)
            self.cost_tracker.add_cost(0.001) # Estimate: 0.1 cents for GPT-4o-mini triage
            clinical_data = recovery_result["details"]
            
            # 5. Hallucination Guard (Cross-check extraction against transcript via embeddings + LLM)
            clinical_score, verdict_details = await self.hallucination_checker.evaluate(safe_transcript, clinical_data)
            self.cost_tracker.add_cost(0.005) # Estimate: half cent for embeddings + mini LLM check
            
            # Calculate WER (Mock comparison for demo)
            wer_score = 0.05 # 5% Error rate
            
            # Attach verification flags directly to clinical data for the doctor to review
            clinical_data["ai_verification"] = verdict_details
            
            # 6. Flag uncertain, incomplete, or dangerous outputs
            dangerous_flags = verdict_details.get("dangerous_flags", [])
            unsupported = verdict_details.get("unsupported_claims", [])
            ai_dropped_fields = recovery_result.get("missing_flags", [])
            
            if dangerous_flags:
                logger.error(f"DANGEROUS OUTPUT DETECTED in {consultation_id}: {dangerous_flags}")
                status = ConsultationStatus.NEEDS_REVIEW
            elif ai_dropped_fields:
                logger.warning(f"AI dropped critical fields {ai_dropped_fields} in {consultation_id}")
                status = ConsultationStatus.NEEDS_REVIEW
            elif clinical_score < 0.8 or unsupported:
                logger.warning(f"Hallucinations or unsupported claims detected in {consultation_id}! Score: {clinical_score}")
                status = ConsultationStatus.NEEDS_REVIEW
            else:
                # 6. Quality Gate
                status = self.gate.evaluate(wer_score, clinical_data)
            
            # 6. Store Detailed Results
            analysis = AnalysisResult(
                id=str(uuid.uuid4()),
                consultation_id=consultation_id,
                asr_provider="fusion-v1",
                llm_model="gpt-4o",
                raw_llm_response=str(clinical_data),
                processing_time_ms=(time.time() - start_time) * 1000
            )
            self.db.add(analysis)
            
            # 7. Update Consultation
            consultation = self.db.query(Consultation).filter(Consultation.id == consultation_id).first()
            consultation.raw_transcript = safe_transcript
            consultation.clinical_data = clinical_data
            consultation.status = status
            consultation.wer_score = wer_score
            consultation.clinical_score = clinical_score
            
            self.db.commit()
            logger.info(f"Pipeline complete for {consultation_id} with status {status}")
            
        except Exception as e:
            logger.error(f"Pipeline failed for {consultation_id}: {str(e)}")
            consultation = self.db.query(Consultation).filter(Consultation.id == consultation_id).first()
            if consultation:
                consultation.status = ConsultationStatus.FAILED
                self.db.commit()

