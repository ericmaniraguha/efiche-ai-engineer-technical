import pytest
from app.services.quality.gate import assess_extraction_quality

def test_assess_extraction_quality_empty_transcript():
    status, reasons = assess_extraction_quality(
        transcript="", 
        extracted={"diagnosis": "Fever"}, 
        expected_fields=["diagnosis", "chief_complaint"]
    )
    assert status == "insufficient"
    assert "Transcript is empty" in reasons[0]

def test_assess_extraction_quality_missing_fields():
    status, reasons = assess_extraction_quality(
        transcript="The patient has a fever.", 
        extracted={"diagnosis": "Fever"}, 
        expected_fields=["diagnosis", "chief_complaint", "medications"]
    )
    assert status == "partial"
    assert "Missing expected fields: chief_complaint, medications." in reasons[0]

def test_assess_extraction_quality_dangerous_dosage():
    status, reasons = assess_extraction_quality(
        transcript="The patient has a fever. Give 500 mg paracetamol.", 
        extracted={
            "diagnosis": "Fever", 
            "chief_complaint": "Fever", 
            "medications": ["500 kilograms paracetamol"]
        }, 
        expected_fields=["diagnosis", "chief_complaint", "medications"]
    )
    assert status == "dangerous"
    assert "Irregular or dangerous dosage detected" in reasons[0]

def test_assess_extraction_quality_complete():
    status, reasons = assess_extraction_quality(
        transcript="The patient has a fever. Give 500 mg paracetamol.", 
        extracted={
            "diagnosis": "Fever", 
            "chief_complaint": "Fever", 
            "medications": ["500 mg paracetamol"]
        }, 
        expected_fields=["diagnosis", "chief_complaint", "medications"]
    )
    assert status == "complete"
    assert len(reasons) == 0
