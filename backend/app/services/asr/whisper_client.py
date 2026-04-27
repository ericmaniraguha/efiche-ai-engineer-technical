import openai
from app.core.config import settings

class WhisperClient:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def transcribe(self, file_path: str, language: str = None) -> dict:
        """
        Transcribes audio using OpenAI Whisper API.
        Optimized for multi-language support (Kinyarwanda/French/English).
        """
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is missing")
            
        # OpenAI Whisper does not support 'rw' explicitly. Passing it causes a 400 error.
        api_language = language if language and language != "rw" else None

        with open(file_path, "rb") as audio_file:
            try:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    language=api_language,
                    response_format="verbose_json"
                )
                return {
                    "text": transcript.text,
                    "segments": transcript.segments
                }
            except Exception as e:
                print(f"Whisper API Error: {e}")
                raise e
