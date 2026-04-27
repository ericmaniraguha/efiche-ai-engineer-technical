import redis
from app.core.config import settings

class CostTracker:
    def __init__(self):
        # Fallback to local memory if Redis is unavailable
        self.use_redis = False
        try:
            if hasattr(settings, 'REDIS_URL') and settings.REDIS_URL:
                self.r = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
                self.r.ping()
                self.use_redis = True
            else:
                self.r = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)
                self.r.ping()
                self.use_redis = True
        except Exception:
            self._local_cost = 0.0

    def add_cost(self, amount_usd: float):
        if self.use_redis:
            try:
                self.r.incrbyfloat("monthly_api_cost", amount_usd)
            except Exception:
                pass
        else:
            self._local_cost += amount_usd

    def get_current_cost(self) -> float:
        if self.use_redis:
            try:
                val = self.r.get("monthly_api_cost")
                return float(val) if val else 0.0
            except Exception:
                return 0.0
        return self._local_cost

    def estimate_whisper_cost(self, audio_duration_seconds: float) -> float:
        # Whisper is $0.006 per minute
        return (audio_duration_seconds / 60.0) * 0.006

    def estimate_llm_cost(self, prompt_tokens: int, completion_tokens: int, model: str = "gpt-4o") -> float:
        if model == "gpt-4o":
            return (prompt_tokens / 1000) * 0.005 + (completion_tokens / 1000) * 0.015
        elif model == "gpt-4o-mini":
            return (prompt_tokens / 1000) * 0.00015 + (completion_tokens / 1000) * 0.0006
        return 0.0
