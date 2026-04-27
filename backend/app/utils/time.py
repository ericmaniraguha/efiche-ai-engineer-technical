from datetime import datetime, timezone

def get_now_utc() -> datetime:
    """
    Returns the current time in UTC.
    """
    return datetime.now(timezone.utc)

def format_duration(seconds: float) -> str:
    """
    Converts seconds into a human-readable MM:SS format.
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"

def timestamp_to_iso(ts: float) -> str:
    """
    Converts a float timestamp to ISO format string.
    """
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
