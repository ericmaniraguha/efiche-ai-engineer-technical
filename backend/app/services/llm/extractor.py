import openai
import json
from app.core.config import settings

class MedicalExtractor:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def extract_clinical_data(self, transcript: str, language: str = "rw") -> dict:
        """
        Uses GPT-4o to extract structured medical data from a transcript.
        """
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is missing")

        language_map = {"fr": "French", "en": "English", "rw": "Kinyarwanda"}
        output_language = language_map.get(language, "English")

        prompt = f"""
        Extract structured clinical information from the following doctor-patient transcript.
        Return the result as a JSON object with keys: 
        'diagnosis', 'medications' (list), 'chief_complaint', 'follow_up'.
        
        IMPORTANT: The values inside the JSON MUST be translated into {output_language}.
        
        Transcript:
        {transcript}
        """

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "system", "content": f"You are a clinical data extraction assistant. You output clinical terms exclusively in {output_language}."},
                          {"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"GPT API Error: {e}")
            raise e
