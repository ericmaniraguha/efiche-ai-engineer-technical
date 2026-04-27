import logging
import sys
from typing import Any

# Configure logging format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format=LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

logger = logging.getLogger("efiche_ai")

def log_ai_event(event_type: str, details: Any):
    """
    Special helper to log AI-specific events like model calls or fusion steps.
    """
    logger.info(f"[AI_EVENT] {event_type}: {details}")
