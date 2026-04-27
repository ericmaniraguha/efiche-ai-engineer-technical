import re
from typing import Dict, Any

def validate_clinical_data(data: Dict[str, Any]) -> bool:
    """
    Checks if the extracted clinical data contains required fields.
    """
    required_keys = ["diagnosis", "medications", "chief_complaint"]
    return all(key in data for key in required_keys)

def sanitize_phone_number(phone: str) -> str:
    """
    Redacts or sanitizes phone numbers for PII compliance.
    """
    return re.sub(r'\d', '*', phone[:-4]) + phone[-4:]

def is_valid_uuid(uuid_to_test: str, version: int = 4) -> bool:
    """
    Verifies if a string is a valid UUID.
    """
    pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 
        re.I
    )
    return bool(pattern.match(uuid_to_test))
