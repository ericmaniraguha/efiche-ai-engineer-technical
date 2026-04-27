import re
from typing import List

# PII patterns optimized for Rwandan Clinical Context
PII_PATTERNS = {
    "phone": r'\b(?:\+250|07)[238]\d{7}\b', # Rwandan format
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "id": r'\b\d{16}\b', # Rwandan 16-digit National ID
}

def redact_pii(text: str, replacement: str = "[REDACTED]") -> str:
    """
    Scans text for phone numbers, emails, and IDs and masks them.
    """
    if not text:
        return ""
        
    redacted_text = text
    for pii_type, pattern in PII_PATTERNS.items():
        redacted_text = re.sub(pattern, replacement, redacted_text)
        
    return redacted_text

def verify_api_key(api_key: str) -> bool:
    """
    Placeholder for verifying internal API keys if needed.
    """
    return len(api_key) > 10
