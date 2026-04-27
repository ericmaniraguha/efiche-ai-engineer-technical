# Pricing per 1k tokens (GPT-4o examples)
PRICING = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "whisper": {"per_minute": 0.006}
}

def estimate_llm_cost(input_tokens: int, output_tokens: int, model: str = "gpt-4o") -> float:
    """
    Calculates the USD cost for LLM processing.
    """
    rates = PRICING.get(model, PRICING["gpt-4o"])
    return (input_tokens / 1000 * rates["input"]) + (output_tokens / 1000 * rates["output"])

def estimate_asr_cost(duration_seconds: float) -> float:
    """
    Calculates the USD cost for Whisper ASR processing.
    """
    minutes = duration_seconds / 60
    return minutes * PRICING["whisper"]["per_minute"]
