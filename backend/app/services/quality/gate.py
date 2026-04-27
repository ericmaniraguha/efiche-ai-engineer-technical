from typing import Dict, Any

class QualityGate:
    def __init__(self, wer_threshold: float = 0.15, clinical_threshold: float = 0.8):
        self.wer_threshold = wer_threshold
        self.clinical_threshold = clinical_threshold

    def evaluate(self, wer: float, clinical_data: Dict[str, Any]) -> str:
        """
        Decides the status of a consultation based on objective metrics.
        """
        # If Word Error Rate is too high, it definitely needs review
        if wer > self.wer_threshold:
            return "needs_review"

        # If critical fields are missing, it needs review
        required_fields = ["diagnosis", "chief_complaint"]
        if not all(field in clinical_data and clinical_data[field] for field in required_fields):
            return "needs_review"

        return "completed"

    def calculate_wer(self, reference: str, hypothesis: str) -> float:
        """
        Calculates simple Word Error Rate (Placeholder for more complex logic).
        """
        if not reference: return 0.0
        # Mock calculation for now
        return 0.05 

def assess_extraction_quality(
    transcript: str,
    extracted: dict,
    expected_fields: list[str]
) -> tuple[str, list[str]]:
    """
    Returns (status, reasons) where status is one of:
    'complete', 'partial', 'insufficient', 'dangerous'
    and reasons is a list of human-readable explanations.
    """
    reasons = []
    status = "complete"
    
    # Check for empty transcript
    if not transcript or len(transcript.strip()) < 10:
        return "insufficient", ["Transcript is empty or extremely short."]
        
    # Check for dangerous flags (e.g. from ai_verification)
    if "ai_verification" in extracted:
        dangerous = extracted["ai_verification"].get("dangerous_flags", [])
        if dangerous:
            return "dangerous", [f"Potentially dangerous AI extraction detected: {d}" for d in dangerous]
            
    # Check for completeness of expected fields
    missing_fields = []
    for field in expected_fields:
        val = extracted.get(field)
        if val is None or val == "" or val == [] or str(val).strip().lower() in ["null", "none", "unknown", "not mentioned in recording"]:
            missing_fields.append(field)
            
    if missing_fields:
        if len(missing_fields) == len(expected_fields):
            reasons.append(f"All expected clinical fields are missing: {', '.join(missing_fields)}.")
            status = "insufficient"
        else:
            reasons.append(f"Missing expected fields: {', '.join(missing_fields)}.")
            status = "partial"
            
    # Domain-aware heuristic: Check for irregular dosage format
    medications = extracted.get("medications", [])
    if isinstance(medications, list):
        for med in medications:
            med_str = str(med).lower()
            if " kg" in med_str or " kilograms" in med_str or "tons" in med_str:
                reasons.append(f"Irregular or dangerous dosage detected in medication: {med}")
                status = "dangerous"
                break
                
    return status, reasons
